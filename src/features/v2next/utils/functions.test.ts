import { describe, expect, it } from 'vitest';

import { PageType } from '../types';
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
