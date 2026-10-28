import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Browser, BrowserContext, Page, Route } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const fixturesDir = resolve(root, 'e2e/fixtures');
const ORIGIN = 'https://www.v2ex.com';

/** restored：仅 v2next 的 e2e 构建（用于差异对比）；full：完整 dist（含其它 feature） */
export type ScriptKind = 'original' | 'restored' | 'full';

const read = (path: string): string => readFileSync(path, 'utf8');
export const fixture = (name: string): string => read(resolve(fixturesDir, name));

const ORIGINAL_PATH = '/tmp/v2next/V2Next.orig.js';
const BUILD_PATH = resolve(root, 'dist/v2ex-enhancement.user.js');

export function hasOriginal(): boolean {
  return existsSync(ORIGINAL_PATH);
}

/**
 * 返回需要在 init script 阶段执行的代码（已含 CDN 依赖与用户脚本本体，均在全局作用域间接 eval）。
 * 间接 eval：UMD 库顶层的 `var Vue = ...` 才会成为全局变量。
 */
function injectedSource(kind: ScriptKind): string {
  const evalAll = (srcs: string[]) =>
    srcs.map((src) => `(0, eval)(${JSON.stringify(src)});`).join('\n');
  if (kind === 'original') {
    // 原脚本没有 @run-at（等价 document-idle）：@require 的库（jQuery 需要 documentElement）与本体
    // 都在 DOMContentLoaded 之后执行
    const body = evalAll([
      fixture('cdn/jquery.min.js'),
      fixture('cdn/vue.global.prod.min.js'),
      fixture('cdn/dayjs.min.js'),
      read(ORIGINAL_PATH),
    ]);
    return `(function(){var run=function(){\n${body}\n};if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run,{once:true});}else{run();}})();`;
  }
  const react = resolve(root, 'node_modules/react/umd/react.production.min.js');
  const reactDom = resolve(root, 'node_modules/react-dom/umd/react-dom.production.min.js');
  // @run-at document-start：本体自行等待 DOMContentLoaded
  return evalAll([read(react), read(reactDom), read(BUILD_PATH)]);
}

const GM_SHIM = `
// v2ex 页面内联脚本依赖的外部（广告/统计）脚本被断网，补一个空实现避免无关的 window error
window.protectTraffic = function () {};
// v2ex 站点脚本提供的全局函数，V2Next 通过它刷新 once
window.fetchOnce = function () { return Promise.resolve(54321); };
// 记录所有弹出过的 toast 文案（toast 会定时消失，直接比较 DOM 会与真实时间赛跑）
window.__toasts = [];
document.addEventListener('DOMContentLoaded', function () {
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        var nodes = [n].concat(Array.prototype.slice.call(n.querySelectorAll('*')));
        nodes.forEach(function (el) {
          var cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(/\\s+/);
          if (cls.some(function (c) { return c === 'msg' || /^_msg_[a-z0-9]{5,}/.test(c); })) {
            window.__toasts.push((el.textContent || '').trim());
          }
        });
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
});
window.__gm = { calls: [], css: [], menu: [] };
window.GM_addStyle = function (css) {
  window.__gm.css.push(css);
  var s = document.createElement('style');
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);
  return s;
};
window.GM_openInTab = function (url, opt) { window.__gm.calls.push({ fn: 'GM_openInTab', url: url, opt: opt }); };
window.GM_registerMenuCommand = function (name, cb) { window.__gm.menu.push({ name: name, cb: cb }); };
window.GM_xmlhttpRequest = function (d) { window.__gm.calls.push({ fn: 'GM_xmlhttpRequest', url: d && d.url, data: d && d.data }); };
`;

const stripScripts = (html: string): string => html.replace(/<script\b[\s\S]*?<\/script>/gi, '');

export interface RecordedRequest {
  method: string;
  url: string;
  body: string | null;
}

export interface MockOptions {
  /** 记事本列表页 /notes 的 .note_item_title 条目 */
  notes?: { id: string; title: string }[];
  /** /notes/edit/:id 返回的编辑器内容 */
  noteContent?: Record<string, string>;
  /** 覆盖某些路径（pathname+search）的响应 */
  overrides?: Record<string, () => { status?: number; body: string; contentType?: string }>;
}

export interface Session {
  context: BrowserContext;
  page: Page;
  errors: string[];
  requests: RecordedRequest[];
  blocked: string[];
  /** 当前未完成的请求数（用于等待异步操作落地） */
  inflight: () => number;
  gmCalls: () => Promise<{ fn: string; url: string }[]>;
  goto: (path: string, html?: string) => Promise<void>;
  close: () => Promise<void>;
}

function topicFixtureName(id: string, p: string | null): string {
  return p && p !== '1' ? `topic_${id}.p2.html` : `topic_${id}.html`;
}

function notesHtml(notes: { id: string; title: string }[]): string {
  const items = notes
    .map(
      (n) =>
        `<div class="cell note_item"><span class="note_item_title"><a href="/notes/${n.id}">${n.title}</a></span></div>`,
    )
    .join('');
  return `<!DOCTYPE html><html><body><div id="Wrapper"><div id="Main"><div class="box">${items}</div></div></div></body></html>`;
}

function route(
  url: URL,
  method: string,
  body: string | null,
  html: Map<string, string>,
  opt: MockOptions,
): { status: number; body: string; contentType: string; headers?: Record<string, string> } {
  const path = url.pathname;
  const key = path + url.search;
  const override = opt.overrides?.[key] ?? opt.overrides?.[path];
  if (override) {
    const r = override();
    return {
      status: r.status ?? 200,
      body: r.body,
      contentType: r.contentType ?? 'text/html; charset=utf-8',
    };
  }
  const htmlOf = (name: string) => html.get(name) ?? fixture(name);
  const ok = (b: string, contentType = 'text/html; charset=utf-8') => ({
    status: 200,
    body: b,
    contentType,
  });
  if (path === '/') return ok(htmlOf('home.html'));
  if (path === '/recent') return ok(htmlOf('recent.html'));
  if (path === '/go/programmer') return ok(htmlOf('node.html'));
  if (path === '/member/Livid') return ok(htmlOf('member.html'));
  const topic = /^\/t\/(\d+)$/.exec(path);
  if (topic) return ok(htmlOf(topicFixtureName(topic[1], url.searchParams.get('p'))));
  if (path === '/api/topics/show.json') {
    const id = url.searchParams.get('id');
    const name = `api_topic_${id}.json`;
    if (existsSync(resolve(fixturesDir, name))) return ok(fixture(name), 'application/json');
    // 其它主题：以 1252074 的响应为模板合成，正文唯一，便于比对预览内容
    const [tpl] = JSON.parse(fixture('api_topic_1252074.json')) as Record<string, unknown>[];
    return ok(
      JSON.stringify([
        {
          ...tpl,
          id: Number(id),
          title: `synthetic ${id}`,
          content: `synthetic body ${id}`,
          content_rendered: `<p>synthetic body ${id}</p>`,
        },
      ]),
      'application/json',
    );
  }
  if (path === '/api/members/show.json') {
    const username = url.searchParams.get('username') ?? '';
    return ok(
      JSON.stringify({
        status: 'found',
        id: 1,
        username,
        avatar_mini: '',
        avatar_normal: '',
        avatar_large: '',
        created: 1500000000,
      }),
      'application/json',
    );
  }
  if (path === '/notes') return ok(notesHtml(opt.notes ?? []));
  const noteEdit = /^\/notes\/edit\/(\w+)$/.exec(path);
  if (noteEdit) {
    if (method === 'POST') {
      // 真实站点保存后 302 回编辑页，脚本以 fetch 的 redirected 判定成功
      return {
        status: 302,
        body: '',
        contentType: 'text/html',
        headers: { location: `${ORIGIN}/notes/edit/${noteEdit[1]}` },
      };
    }
    const content = opt.noteContent?.[noteEdit[1]] ?? '';
    return ok(
      `<!DOCTYPE html><html><body><div id="Wrapper"><div id="Main"><textarea class="note_editor">${content}</textarea></div></div></body></html>`,
    );
  }
  if (path === '/notes/new' && method === 'POST') {
    return {
      status: 302,
      body: '',
      contentType: 'text/html',
      headers: { location: `${ORIGIN}/notes/edit/99999` },
    };
  }
  if (path === '/mission/daily') {
    return ok(
      '<!DOCTYPE html><html><body><div id="Wrapper"><div id="Main">已领取</div></div></body></html>',
    );
  }
  if (path === '/mission/daily/redeem') {
    return ok(
      '<!DOCTYPE html><html><body><div id="Wrapper"><div id="Main"><li class="fa fa-ok-sign"></li>已连续登录 7 天</div></div></body></html>',
    );
  }
  // 提交回复：真实站点返回回复后的主题页 HTML
  if (method === 'POST' && /^\/t\/\d+$/.test(path)) {
    return ok(
      '<!DOCTYPE html><html><body><div id="Wrapper"><div id="Main">ok</div></div></body></html>',
    );
  }
  // 写操作（感谢/忽略/收藏/报告...）：统一返回成功，请求本身由 requests 记录
  if (method === 'POST') {
    return ok(JSON.stringify({ success: true, once: '67890', message: '' }), 'application/json');
  }
  // 收藏/忽略/报告：真实站点操作后 302 回主题页，脚本以 fetch 的 redirected 判断成功
  const action = /^\/(?:favorite|unfavorite|ignore|unignore|report)\/topic\/(\d+)$/.exec(path);
  if (action) {
    return {
      status: 302,
      body: '',
      contentType: 'text/html',
      headers: { location: `${ORIGIN}/t/${action[1]}` },
    };
  }
  if (/\.(js|css|png|jpg|gif|ico|svg|woff2?)$/.test(path)) {
    return { status: 200, body: '', contentType: 'application/javascript' };
  }
  return { status: 404, body: 'not mocked', contentType: 'text/plain' };
}

export interface SessionOptions extends MockOptions {
  kind: ScriptKind;
  /** localStorage 里预置的 v2ex-config（部分字段） */
  config?: Record<string, unknown>;
  /** v2ex-config 以用户名分组存放，默认 default（未登录） */
  configUser?: string;
  /** 预置的其它 localStorage */
  storage?: Record<string, string>;
}

/** 创建一个注入了指定脚本、完全离线的页面会话 */
export async function openSession(browser: Browser, opt: SessionOptions): Promise<Session> {
  const context = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1280, height: 900 },
  });
  const errors: string[] = [];
  const requests: RecordedRequest[] = [];
  const blocked: string[] = [];
  const htmlOverrides = new Map<string, string>();

  // 先注册兜底（后注册的优先）：非 v2ex 一律断网
  await context.route('**/*', (r) => {
    blocked.push(r.request().url());
    return r.abort();
  });
  await context.route('https://cdn.jsdelivr.net/**', (r) => {
    blocked.push(r.request().url());
    return r.abort();
  });
  await context.route(/^https:\/\/([\w-]+\.)?v2ex\.com\/.*/, async (r: Route) => {
    const req = r.request();
    const url = new URL(req.url());
    if (url.hostname !== 'www.v2ex.com') {
      blocked.push(req.url());
      return r.abort();
    }
    const body = req.postData();
    requests.push({ method: req.method(), url: req.url(), body });
    const res = route(url, req.method(), body, htmlOverrides, opt);
    // 主文档里 v2ex 自己的内联/外部脚本依赖被断网的站点库，只会制造无关报错，整体剔除
    const isDoc = req.resourceType() === 'document' && res.contentType.startsWith('text/html');
    return r.fulfill({
      status: res.status,
      body: isDoc ? stripScripts(res.body) : res.body,
      contentType: res.contentType,
      headers: res.headers,
    });
  });
  (context as BrowserContext & { __html?: Map<string, string> }).__html = htmlOverrides;

  const page = await context.newPage();
  let inflight = 0;
  page.on('request', () => inflight++);
  page.on('requestfinished', () => inflight--);
  page.on('requestfailed', () => inflight--);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack ?? ''}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (text.startsWith('Failed to load resource')) return;
    errors.push(`console.error: ${text}`);
  });

  const seed = `
    try {
      ${opt.config ? `localStorage.setItem('v2ex-config', ${JSON.stringify(JSON.stringify({ [opt.configUser ?? 'default']: opt.config }))});` : ''}
      ${Object.entries(opt.storage ?? {})
        .map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`)
        .join('\n')}
    } catch (e) {}
  `;
  await page.addInitScript(GM_SHIM + seed);
  await page.addInitScript(injectedSource(opt.kind));

  return {
    context,
    page,
    errors,
    requests,
    blocked,
    inflight: () => inflight,
    gmCalls: () =>
      page.evaluate(
        () => (window as unknown as { __gm: { calls: { fn: string; url: string }[] } }).__gm.calls,
      ),
    goto: async (path, html) => {
      const url = new URL(path, ORIGIN);
      if (html !== undefined) {
        // 主文档按给定 HTML 返回（仅限本次导航）
        await context.route(url.toString(), async (r) => {
          if (r.request().resourceType() !== 'document') return r.fallback();
          return r.fulfill({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            body: stripScripts(html),
          });
        });
      }
      await page.goto(url.toString(), { waitUntil: 'load' });
    },
    close: () => context.close(),
  };
}

/** 构造登录态：顶部栏出现用户名/记事本，右栏出现头像，并带 once */
export function asLoggedIn(html: string, username = 'tester'): string {
  return html
    .replace(
      /<a href="https:\/\/edge\.v2ex\.com\/signup" class="top">[^<]*<\/a>\s*<a href="https:\/\/edge\.v2ex\.com\/signin" class="top">[^<]*<\/a>/,
      `<a href="/member/${username}" class="top">${username}</a>
       <a href="/notes" class="top">记事本</a>
       <a href="/settings" class="top">设置</a>
       <a href="/signout?once=12345" class="top">登出</a>`,
    )
    .replace(
      '<div id="Rightbar">',
      `<div id="Rightbar"><div class="box"><div class="cell"><table><tr><td><a href="/member/${username}"><img src="https://cdn.v2ex.com/avatar/test_large.png" class="avatar" border="0" align="default" /></a></td></tr></table></div></div>`,
    );
}

/** 给回复 #floor 注入感谢数 / OP 标记，用于构造 Like、TopReply、OnlyOp 场景 */
export function decorateReplies(
  html: string,
  opts: { thanks?: Record<number, number>; opFloors?: number[] },
): string {
  const [head, ...cells] = html.split('<div id="r_');
  return (
    head +
    cells
      .map((cell) => {
        const floor = Number(/<span class="no">(\d+)<\/span>/.exec(cell)?.[1]);
        const thank = opts.thanks?.[floor];
        let out = cell;
        if (thank) {
          out = out.replace(
            '<div class="fr">',
            `<div class="fr"> &nbsp; <span class="small fade"><img src="/static/img/small_like.png" align="absmiddle" border="0" alt="Thanks" /> ${thank}</span> `,
          );
        }
        if (opts.opFloors?.includes(floor)) {
          out = out.replace(
            '<div class="badges"></div>',
            '<div class="badges"><div class="badge op">OP</div></div>',
          );
        }
        return '<div id="r_' + out;
      })
      .join('')
  );
}

/** 往 browser context 登记本次导航使用的 HTML（路径 → 内容），供 sub-request（如 ?p=1）使用 */
export function setRouteHtml(session: Session, name: string, html: string): void {
  (session.context as BrowserContext & { __html: Map<string, string> }).__html.set(name, html);
}
