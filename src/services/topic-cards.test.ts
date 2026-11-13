import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/core/constants';
import { session } from '@/core/session';
import { initSession } from '@/services/session-init';
import type { ApiTopic } from '@/utils/functions';
import { functions } from '@/utils/functions';

import { parseTopicId, processTopicLinks, toSnippet } from './topic-cards';

vi.mock('@/utils/functions', () => ({ functions: { getPostDetailByApi: vi.fn() } }));

const topic = (over: Partial<ApiTopic> = {}) =>
  ({
    id: 1,
    title: '第一次相亲结束了',
    content_rendered: '<p>上次发了帖子后，</p><p>我尝试了<b>聊天</b></p>',
    replies: 12,
    node: { title: '生活', url: '' },
    member: { username: 'Orris', avatar_normal: 'https://cdn.v2ex.com/a.png' },
    ...over,
  }) as unknown as ApiTopic;

const url = (href: string) => new URL(href, 'https://www.v2ex.com/');

describe('parseTopicId', () => {
  it.each([
    ['https://www.v2ex.com/t/1253104', '1253104'],
    ['https://v2ex.com/t/1253104/', '1253104'],
    ['/t/1253104', '1253104'],
  ])('%s -> %s', (href, id) => {
    expect(parseTopicId(url(href))).toBe(id);
  });

  it.each([
    'https://www.v2ex.com/t/1253104#reply5',
    'https://www.v2ex.com/t/1253104/edit',
    'https://www.v2ex.com/go/life',
    'https://notv2ex.com/t/1253104',
    'https://example.com/t/1253104',
  ])('不是主题链接：%s', (href) => {
    expect(parseTopicId(url(href))).toBeNull();
  });
});

describe('toSnippet', () => {
  it('去掉标签、压缩空白、截断', () => {
    expect(toSnippet('<p>a</p>\n<p> b <b>c</b></p>')).toBe('a b c');
    expect(toSnippet('x'.repeat(500))).toHaveLength(200);
  });

  it('不执行内容里的脚本，也不留下标签', () => {
    expect(toSnippet('<img src=x onerror="window.pwned=1">hi<script>window.pwned=1</script>')).toBe(
      'hi',
    );
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
  });
});

describe('processTopicLinks', () => {
  const mount = (html: string) => {
    document.body.innerHTML = `<div id="app">${html}</div>`;
  };
  const link = (id: string, text = `/t/${id}`) =>
    `<a href="https://www.v2ex.com/t/${id}">${text}</a>`;

  beforeEach(() => {
    initSession();
    session.config = getDefaultConfig({ topicCard: true });
    session.pageData = { id: '999' } as typeof session.pageData;
    vi.mocked(functions.getPostDetailByApi).mockReset();
  });

  it('开关打开：主题链接展开成卡片，在新标签页打开且不被脚本自己的点击拦截', async () => {
    vi.mocked(functions.getPostDetailByApi).mockResolvedValue(topic());
    mount(link('1001'));
    await processTopicLinks();
    const a = document.querySelector<HTMLAnchorElement>('#app a')!;
    expect(a.classList.contains('v2n-topic-card')).toBe(true);
    expect(a.target).toBe('_blank');
    expect(a.getAttribute('script')).toBe('1');
    expect(a.querySelector('.v2n-topic-card-node')?.textContent).toBe('生活');
    expect(a.querySelector('.v2n-topic-card-foot')?.textContent).toBe('生活Orris · 12 回复');
    expect(a.querySelector('.v2n-topic-card-title')?.textContent).toBe('第一次相亲结束了');
    expect(a.querySelector('.v2n-topic-card-body')?.textContent).toBe(
      '上次发了帖子后，我尝试了聊天',
    );
  });

  it('标题里的 HTML 不会被当成标签', async () => {
    vi.mocked(functions.getPostDetailByApi).mockResolvedValue(topic({ title: '<img src=x>' }));
    mount(link('1002'));
    await processTopicLinks();
    expect(document.querySelector('.v2n-topic-card-title img')).toBeNull();
    expect(document.querySelector('.v2n-topic-card-title')?.textContent).toBe('<img src=x>');
  });

  it('开关关闭：不请求，链接保持原样', async () => {
    session.config = getDefaultConfig({ topicCard: false });
    mount(link('1003'));
    await processTopicLinks();
    expect(functions.getPostDetailByApi).not.toHaveBeenCalled();
    expect(document.querySelector('.v2n-topic-card')).toBeNull();
  });

  it('链接有自定义文字、或指向本帖时不动它', async () => {
    mount(link('1004', '看这个帖子') + link('999'));
    await processTopicLinks();
    expect(functions.getPostDetailByApi).not.toHaveBeenCalled();
  });

  it('请求失败：保持原样的链接', async () => {
    vi.mocked(functions.getPostDetailByApi).mockResolvedValue(undefined);
    mount(link('1005'));
    await processTopicLinks();
    expect(document.querySelector('#app a')?.textContent).toBe('/t/1005');
  });

  it('弹框加载中的空链接（href 和文字都为空）不当成主题链接', async () => {
    // 空 href 会被解析成当前页面地址；当前正好在某个主题页时，它会被误认成该主题的链接
    history.replaceState(null, '', '/t/555');
    mount('<a href=""></a>');
    await processTopicLinks();
    history.replaceState(null, '', '/');
    expect(functions.getPostDetailByApi).not.toHaveBeenCalled();
    expect(document.querySelector('.v2n-topic-card')).toBeNull();
  });

  it('同一个主题出现多次只请求一次', async () => {
    vi.mocked(functions.getPostDetailByApi).mockResolvedValue(topic());
    mount(link('1006').repeat(3));
    await processTopicLinks();
    expect(functions.getPostDetailByApi).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('.v2n-topic-card')).toHaveLength(3);
  });
});
