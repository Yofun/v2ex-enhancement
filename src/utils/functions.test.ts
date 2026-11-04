import { describe, expect, it } from 'vitest';

import { getDefaultConfig } from '@/core/constants';
import { session } from '@/core/session';
import { PageType } from '@/core/types';
import { initSession } from '@/services/session-init';

import { functions } from './functions';

const url = (href: string) => {
  const u = new URL(href);
  return { href: u.href, pathname: u.pathname, search: u.search };
};

describe('checkPageType', () => {
  it.each([
    ['https://www.v2ex.com/', PageType.Home],
    ['https://v2ex.com/?tab=hot', PageType.Home],
    ['https://www.v2ex.com/recent', PageType.Changes],
    ['https://www.v2ex.com/recent?p=2', PageType.Changes],
    ['https://www.v2ex.com/changes', PageType.Changes],
    ['https://www.v2ex.com/v2hot', PageType.Hot],
    ['https://www.v2ex.com/go/programmer', PageType.Node],
    ['https://www.v2ex.com/go/programmer?p=2', PageType.Node],
  ])('%s -> %s', (href, expected) => {
    expect(functions.checkPageType(url(href)).pageType).toBe(expected);
  });

  it('/go/xxx/links 不是节点页', () => {
    expect(
      functions.checkPageType(url('https://www.v2ex.com/go/programmer/links')).pageType,
    ).toBeNull();
  });

  it('member 页解析用户名', () => {
    for (const path of ['', '/replies', '/topics']) {
      const res = functions.checkPageType(url(`https://www.v2ex.com/member/someone${path}`));
      expect(res.pageType).toBe(PageType.Member);
      expect(res.username).toBe('someone');
    }
  });

  it('主题页解析 id 与页码', () => {
    expect(functions.checkPageType(url('https://www.v2ex.com/t/1252074'))).toEqual({
      pageType: PageType.Post,
      pageData: { id: '1252074', pageNo: null },
      username: '',
    });
    const withPage = functions.checkPageType(url('https://www.v2ex.com/t/1252074?p=3#reply12'));
    expect(withPage.pageData).toEqual({ id: '1252074', pageNo: 3 });
  });

  it('主题的 review/info 子页面、未知页面不识别', () => {
    expect(functions.checkPageType(url('https://www.v2ex.com/t/1252074/info')).pageType).toBeNull();
    expect(
      functions.checkPageType(url('https://www.v2ex.com/t/1252074/review')).pageType,
    ).toBeNull();
    expect(functions.checkPageType(url('https://www.v2ex.com/settings')).pageType).toBeNull();
  });
});

describe('deepAssign / refreshOnce / getAllReply', () => {
  it('deepAssign 深合并且不被 undefined 覆盖', () => {
    const res = functions.deepAssign(
      { a: 1, n: { x: 1, y: 2 } },
      { n: { y: 3 }, a: undefined, b: 2 },
    );
    expect(res).toEqual({ a: 1, b: 2, n: { x: 1, y: 3 } });
  });

  it('refreshOnce 可从字符串或数字直接得到 once', async () => {
    expect(await functions.refreshOnce('var once = "12345";')).toBe(12345);
    expect(await functions.refreshOnce(678)).toBe(678);
  });

  it('getAllReply 按页码排序合并', () => {
    const r = (id: string) => ({ id }) as never;
    const list = functions.getAllReply([
      { i: 2, replyList: [r('c')] },
      { i: 1, replyList: [r('a'), r('b')] },
    ]);
    expect(list.map((v) => v.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('checkPhotoLink2Img', () => {
  const html = `
    <a href="https://i.imgur.com/abc.png">https://i.imgur.com/abc.png</a>
    <a href="https://example.com/pic.jpg">https://example.com/pic.jpg</a>
    <a href="https://i.imgur.com/def.png">看这张图</a>`;

  const run = (parseImgur: boolean) => {
    initSession();
    session.config = getDefaultConfig({ parseImgur });
    const root = document.createElement('div');
    root.innerHTML = html;
    functions.checkPhotoLink2Img(root);
    return [...root.querySelectorAll('a')].map((a) => a.querySelector('img')?.src ?? null);
  };

  it('开关打开：纯文本的 Imgur 链接被解析成图片', () => {
    expect(run(true)[0]).toBe('https://i.imgur.com/abc.png');
  });

  it('开关关闭：Imgur 链接保持原样，不解析', () => {
    expect(run(false)[0]).toBeNull();
  });

  it('开关只管 Imgur：其他站点的图片链接两种状态下都解析', () => {
    expect(run(true)[1]).toBe('https://example.com/pic.jpg');
    expect(run(false)[1]).toBe('https://example.com/pic.jpg');
  });

  it('链接文字不是地址时从不解析', () => {
    expect(run(true)[2]).toBeNull();
  });
});
