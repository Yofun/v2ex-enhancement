import { DefaultVal } from '@/core/constants';
import type { HostMessage } from '@/core/host-bus';
import { sendHostMessage } from '@/core/host-bus';
import { session } from '@/core/session';
import type { Member, Post, Reply } from '@/core/types';
import { PageType } from '@/core/types';

import { genDomFromHtmlString, getInnerText } from './dom';
import { gmOpenInTab, gmRegisterMenuCommand } from './gm';
import { createNestedList, createNestedRedundantList, findChildren } from './reply-tree';

export interface PageTypeResult {
  pageType: PageType | null;
  pageData: { id: string; pageNo: number | null };
  username: string;
}

/** V2EX /api/topics/show.json 返回的主题（仅列出用到的字段） */
export interface ApiTopic {
  id: number;
  title: string;
  url: string;
  content: string;
  content_rendered: string;
  replies: number;
  created: number;
  member: Member;
  node: { title: string; url: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface ReplyPage {
  i: number;
  replyList: Reply[];
}

type LocationLike = Pick<Location, 'pathname' | 'href' | 'search'>;

const IMG_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.PNG', '.JPG', '.JPEG', '.GIF'];
const hasImgExt = (href: string): boolean => IMG_EXTS.some((ext) => href.includes(ext));

const clone = <T>(val: T): T => JSON.parse(JSON.stringify(val)) as T;

const appendNoReferrerMeta = (): void => {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'referrer');
  meta.setAttribute('content', 'no-referrer');
  document.getElementsByTagName('head')[0].appendChild(meta);
};

export const functions = {
  /** once 可以是数字、含 `var once = "123";` 的字符串；都不可用时向页面请求新的 once */
  async refreshOnce(once?: string | number): Promise<number> {
    if (typeof once === 'string') {
      const res = once.match(/var once = "([\d]+)";/);
      if (res && res[1]) return Number(res[1]);
    }
    if (typeof once === 'number' && once) return once;
    const fetchOnce = (window as unknown as { fetchOnce?: () => Promise<number> }).fetchOnce;
    if (typeof fetchOnce !== 'function') throw new Error('[v2ex-enhancement] 页面未提供 fetchOnce');
    return fetchOnce();
  },

  clone,

  createList(post: Post, replyList: Reply[], withRedundList = true): Post {
    post.replyList = replyList;
    post.topReplyList = clone(replyList)
      .filter((v) => v.thankCount >= session.config.topReplyLoveMinCount)
      .sort((a, b) => b.thankCount - a.thankCount)
      .slice(0, session.config.topReplyCount);
    post.replyCount = replyList.length;
    post.allReplyUsers = Array.from(new Set(replyList.map((v) => v.username)));
    post.nestedReplies = functions.createNestedList(clone(replyList), post.topReplyList);
    if (withRedundList) {
      post.nestedRedundReplies = functions.createNestedRedundantList(
        clone(replyList),
        post.topReplyList,
      );
    }
    return post;
  },

  /** 按页码排序后合并所有页的回复 */
  getAllReply(repliesMap: ReplyPage[] = []): Reply[] {
    return repliesMap
      .sort((a, b) => a.i - b.i)
      .reduce<Reply[]>((pre, i) => pre.concat(i.replyList), []);
  },

  findChildren,
  createNestedList,
  createNestedRedundantList,

  parseA(a: HTMLAnchorElement): { href: string; id: string | undefined; title: string } {
    const href = a.href;
    let id: string | undefined;
    if (href.includes('/t/')) {
      id = a.pathname.substring('/t/'.length);
    }
    return { href, id, title: getInnerText(a) };
  },

  /** 图片链接转 img 标签；imgur 图片按配置走代理 */
  checkPhotoLink2Img(dom: ParentNode): void {
    const replaceImgur = session.config.replaceImgur;
    let isAdd = false;
    const prefixImg = replaceImgur ? DefaultVal.imgurProxy : '';
    dom.querySelectorAll('img').forEach((img) => {
      let href = img.src;
      if (href.includes('imgur.com')) {
        img.setAttribute('originUrl', img.src);
        img.setAttribute('notice', '此img标签由V2Next脚本解析');
        img.setAttribute('referrerpolicy', 'no-referrer');
        if (!hasImgExt(href)) {
          href = href + '.png';
        }
        if (!isAdd && replaceImgur) {
          appendNoReferrerMeta();
          isAdd = true;
        }
        img.src = prefixImg + href;
      }
    });
    dom.querySelectorAll('a').forEach((a) => {
      const href = a.href;
      if (a.children.length == 0 && getInnerText(a) == href && hasImgExt(href)) {
        const img = document.createElement('img');
        img.setAttribute('originUrl', a.href);
        img.setAttribute('notice', '此img标签由V2Next脚本解析');
        img.setAttribute('referrerpolicy', 'no-referrer');
        if (href.includes('imgur.com')) {
          if (!isAdd && replaceImgur) {
            appendNoReferrerMeta();
            isAdd = true;
          }
          img.src = prefixImg + href;
        } else {
          img.src = href;
        }
        a.textContent = '';
        a.append(img);
      }
    });
  },

  /** 回复数超过上限返回 true；needOpen 时在新标签页打开脚本无法解析的主题 */
  async checkPostReplies(id: string, needOpen = true): Promise<boolean> {
    const res = await functions.getPostDetailByApi(id);
    if (res && res.replies > session.config.maxReplyCountLimit) {
      if (needOpen) {
        functions.openNewTab(`${location.origin}/t/${id}?p=1&script=1`);
      }
      return true;
    }
    return false;
  },

  async sleep(time: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  },

  openNewTab(href: string, active = false): void {
    const isSafariBrowser =
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isSafariBrowser) {
      const tempId = 'a_blank_' + Date.now();
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.setAttribute('target', '_blank');
      a.setAttribute('id', tempId);
      a.setAttribute('script', '1');
      if (!document.getElementById(tempId)) {
        document.body.appendChild(a);
      }
      a.click();
    } else if (!gmOpenInTab(href, { active })) {
      window.open(href, '_blank');
    }
  },

  /** 解析层 -> App 的消息，App 未挂载时会等待（见 host-bus） */
  async cbChecker(val: HostMessage): Promise<void> {
    await sendHostMessage(val);
  },

  initMonkeyMenu(): void {
    try {
      gmRegisterMenuCommand('脚本设置', () => {
        void functions.cbChecker({ type: 'openSetting' });
      });
      gmRegisterMenuCommand('仓库地址', () => {
        functions.openNewTab(DefaultVal.git, true);
      });
      gmRegisterMenuCommand('反馈 & 建议', functions.feedback);
    } catch {
      console.error('无法使用Tampermonkey');
    }
  },

  feedback(): void {
    functions.openNewTab(DefaultVal.issue);
  },

  checkPageType(a?: LocationLike): PageTypeResult {
    const l = a || window.location;
    const data: PageTypeResult = {
      pageType: null,
      pageData: { id: '', pageNo: null },
      username: '',
    };
    if (l.pathname === '/') {
      data.pageType = PageType.Home;
    } else if (l.pathname === '/changes') {
      data.pageType = PageType.Changes;
    } else if (l.pathname === '/v2hot') {
      data.pageType = PageType.Hot;
    } else if (l.pathname === '/recent') {
      data.pageType = PageType.Changes;
    } else if (l.href.match(/.com\/?tab=/)) {
      data.pageType = PageType.Home;
    } else if (l.href.match(/.com\/go\//)) {
      if (!l.href.includes('/links')) {
        data.pageType = PageType.Node;
      }
    } else if (l.href.match(/.com\/member/)) {
      data.pageType = PageType.Member;
      data.username = l.pathname
        .replace('/member/', '')
        .replace('/replies', '')
        .replace('/topics', '');
    } else {
      const r = l.href.match(/.com\/t\/([\d]+)/);
      if (r && !l.pathname.includes('review') && !l.pathname.includes('info')) {
        data.pageType = PageType.Post;
        data.pageData.id = r[1];
        if (l.search) {
          const pr = l.href.match(/\?p=([\d]+)/);
          if (pr) data.pageData.pageNo = Number(pr[1]);
        }
      }
    }
    return data;
  },

  /** 通过 api 获取主题详情；请求失败时返回 undefined（原实现会一直挂起） */
  async getPostDetailByApi(id: string): Promise<ApiTopic | undefined> {
    try {
      const res = await fetch(`${location.origin}/api/topics/show.json?id=${id}`);
      if (res.status !== 200) return undefined;
      const data = (await res.json()) as ApiTopic[] | null;
      return data?.[0];
    } catch {
      return undefined;
    }
  },

  appendPostContent(res: Pick<Post, 'href' | 'content_rendered'>, el: Element): void {
    const a = document.createElement('a');
    a.href = res.href;
    a.classList.add('post-content');
    const div = document.createElement('div');
    div.innerHTML = res.content_rendered;
    a.append(div);
    el.append(a);
    if (div.clientHeight < 300) {
      a.classList.add('show-all');
    } else {
      const showMore = document.createElement('div');
      showMore.classList.add('show-more');
      showMore.innerHTML = '显示更多/收起';
      showMore.onclick = function (e) {
        e.stopPropagation();
        a.classList.toggle('show-all');
      };
      a.parentNode?.append(showMore);
    }
  },

  /** 从 localStorage 读取当前用户的配置并合并到 session.config，同时回写 */
  initConfig(): void {
    const configStr = localStorage.getItem('v2ex-config');
    let configMap: Record<string, unknown> = {};
    const userName = session.user.username || 'default';
    if (configStr) {
      try {
        configMap = JSON.parse(configStr) as Record<string, unknown>;
      } catch {
        configMap = {};
      }
      const configObj = configMap[userName];
      if (configObj) {
        session.config = functions.deepAssign(session.config, configObj);
      }
    }
    configMap[userName] = session.config;
    localStorage.setItem('v2ex-config', JSON.stringify(configMap));
  },

  /** 深合并（undefined 不覆盖）；数组也按对象合并，与原实现一致 */
  deepAssign<T>(first: T, ...sources: unknown[]): T {
    let target = (first || {}) as Record<string, unknown>;
    if (typeof target !== 'object') {
      target = {};
    }
    for (const options of sources) {
      if (options == null) continue;
      for (const name in options as Record<string, unknown>) {
        const src = target[name];
        const copy = (options as Record<string, unknown>)[name];
        if (copy && typeof copy == 'object') {
          target[name] = functions.deepAssign(src, copy);
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
    return target as T;
  },

  genDomFromHtmlString,

  stopEvent(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  },
};
