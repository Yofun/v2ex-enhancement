import type { Browser, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { snapshotDom, waitCommentsStable } from './extract';
import type { Session } from './harness';
import { asLoggedIn, decorateReplies, fixture, openSession, setRouteHtml } from './harness';

export interface Step {
  name: string;
  /** 返回 false 表示本步没有可执行的目标（两边都跳过比较） */
  run: (page: Page) => Promise<void | false>;
}

export interface ScenarioOptions {
  path: string;
  /** 帖子页使用的 fixture 前缀（会同时处理 .p2） */
  topic?: string;
  /** 列表页上会被点开的主题（fixture 前缀），仅注册路由，不等待评论渲染 */
  routeTopics?: string[];
  loggedIn?: boolean;
  config?: Record<string, unknown>;
  settleMs?: number;
  /** 帖子页是否等待评论渲染（stopMe 等场景不会渲染评论），默认 true */
  waitComments?: boolean;
  /** 记事本 mock：/notes 列表与 /notes/edit/:id 内容 */
  notes?: { id: string; title: string }[];
  noteContent?: Record<string, string>;
  /** 对每个 HTML 做额外改写（两边同样应用） */
  rewrite?: (html: string) => string;
  storage?: Record<string, string>;
  /** card 视图会按 1 秒间隔逐条抓预览：用假时钟在加载后一次性走完，避免与真实时间竞争 */
  fastForwardCardPreviews?: boolean;
}

const decorate = (html: string) =>
  decorateReplies(html, { thanks: { 3: 5, 7: 12, 20: 3, 90: 20 }, opFloors: [13, 25] });

async function open(browser: Browser, kind: 'original' | 'restored', o: ScenarioOptions) {
  const s = await openSession(browser, {
    kind,
    config: o.config,
    configUser: o.loggedIn ? 'tester' : undefined,
    storage: o.storage,
    notes: o.notes ?? [],
    noteContent: o.noteContent,
  });
  const prep = (html: string) => {
    const h0 = o.topic || o.routeTopics ? decorate(html) : html;
    const h = o.rewrite ? o.rewrite(h0) : h0;
    return o.loggedIn ? asLoggedIn(h, 'tester') : h;
  };
  for (const t of [o.topic, ...(o.routeTopics ?? [])]) {
    if (!t) continue;
    for (const n of [`${t}.html`, `${t}.p2.html`]) setRouteHtml(s, n, prep(fixture(n)));
  }
  const listFile = (
    {
      '/': 'home.html',
      '/go/programmer': 'node.html',
      '/member/Livid': 'member.html',
      '/recent': 'recent.html',
    } as Record<string, string>
  )[o.path.split('?')[0]];
  await s.goto(
    o.path,
    !o.topic && listFile && (o.loggedIn || o.rewrite) ? prep(fixture(listFile)) : undefined,
  );
  if (o.topic && o.waitComments !== false) await waitCommentsStable(s.page);
  await s.page.waitForSelector('#app', { state: 'attached' });
  if (o.fastForwardCardPreviews) await s.page.clock.runFor(60_000);
  await settleDom(s);
  return s;
}

/** 等请求全部结束，且 DOM 连续两次采样一致（异步抓取、fetch 回调等落地） */
async function settleDom(s: Session, minMs = 250): Promise<void> {
  let last = '';
  let same = 0;
  for (let i = 0; i < 60; i++) {
    await s.page.waitForTimeout(minMs);
    // 在途请求最多等 5 秒，避免个别请求悬挂时每一步都被拖满
    if (s.inflight() > 0 && i * minMs < 5000) {
      same = 0;
      continue;
    }
    const cur = (await snapshotDom(s.page, 'body', true)).join('\n');
    same = cur === last ? same + 1 : 0;
    last = cur;
    // 连续 3 次一致（约 0.75s 无请求、无 DOM 变化），记事本等串行请求链也能落地
    if (same >= 2) return;
  }
}

const requestLog = (s: Session) =>
  s.requests
    .filter((q) => !/\.(js|css|png|jpg|gif|svg|ico)(\?|$)/.test(q.url))
    .map(
      (q) =>
        `${q.method} ${q.url.replace('https://www.v2ex.com', '')} ${q.body ? q.body.length : ''}`,
    )
    // 启动期的异步请求（记事本/签到/成员信息）到达顺序不稳定，按多重集比较
    .sort();

async function state(s: Session) {
  return {
    dom: (await snapshotDom(s.page, 'body', true)).join('\n'),
    config: await s.page.evaluate(() => localStorage.getItem('v2ex-config')),
    requests: requestLog(s).join('\n'),
    errors: s.errors.join('\n'),
    toasts: (
      await s.page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts)
    ).join(' | '),
  };
}

/** 在原脚本与还原版上依次执行同样的步骤，每步之后比较 DOM / 配置 / 网络请求 / 报错 */
export async function runScenario(
  browser: Browser,
  o: ScenarioOptions,
  steps: Step[],
): Promise<{ toasts: string }> {
  const [orig, rest] = await Promise.all([
    open(browser, 'original', o),
    open(browser, 'restored', o),
  ]);
  let toasts = '';
  try {
    const a0 = await state(orig);
    const b0 = await state(rest);
    expect(b0.errors, '初始化报错').toBe(a0.errors);
    expect(b0.dom, '初始 DOM').toBe(a0.dom);
    for (const step of steps) {
      const tag = (side: string, p: Promise<void | false>) =>
        p.catch((e: Error) => {
          throw new Error(`[${side}] 步骤「${step.name}」失败: ${e.message}`);
        });
      const acted = await Promise.all([
        tag('original', step.run(orig.page)),
        tag('restored', step.run(rest.page)),
      ]);
      if (acted[0] === false && acted[1] === false) continue;
      expect(acted[1] === false, `[${step.name}] 两边可执行性不同`).toBe(acted[0] === false);
      await Promise.all([settleDom(orig, o.settleMs), settleDom(rest, o.settleMs)]);
      const [a, b] = [await state(orig), await state(rest)];
      expect(b.errors, `[${step.name}] 报错`).toBe(a.errors);
      expect(b.requests, `[${step.name}] 网络请求`).toBe(a.requests);
      expect(b.toasts, `[${step.name}] toast 提示`).toBe(a.toasts);
      toasts = a.toasts;
      expect(b.config, `[${step.name}] v2ex-config`).toBe(a.config);
      expect(b.dom, `[${step.name}] DOM`).toBe(a.dom);
    }
  } finally {
    await Promise.all([orig.close(), rest.close()]);
  }
  return { toasts };
}
