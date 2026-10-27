import type { Browser, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { diffStyled, snapshotDom, waitCommentsStable } from './extract';
import type { ScriptKind } from './harness';
import { asLoggedIn, decorateReplies, fixture, openSession, setRouteHtml } from './harness';

test.setTimeout(120_000);

const night = (html: string) => html.replace(/<body[^>]*>/, '<body class="Night">');
const app = (p: Page) => p.locator('#app');
const toolbar = (p: Page) =>
  app(p).locator('[class*="toolbar"]').filter({ hasText: 'Tweet' }).first();
const floor = (p: Page, n: number) => app(p).locator(`[data-floor="${n}"]`).first();

// card 视图的预览预置到缓存里，避免 1 秒间隔的逐条抓取与真实时间赛跑
const homeIds = [...fixture('home.html').matchAll(/id="topic-link-(\d+)"/g)].map((m) => m[1]);
const cacheData = JSON.stringify(
  homeIds.map((id) => ({
    id,
    title: `cached ${id}`,
    content_rendered: `<p>cached body ${id}</p><blockquote>quote</blockquote>`,
    created: Math.floor(Date.now() / 1000),
  })),
);

interface Case {
  name: string;
  path: string;
  config?: Record<string, unknown>;
  storage?: Record<string, string>;
  night?: boolean;
  notes?: boolean;
  /** 只有登录后才有这些入口（回复框、标签等） */
  loginOnly?: boolean;
  /** 在两边执行完（返回后等待稳定）再比较样式 */
  actions?: (page: Page) => Promise<void>;
}

async function load(browser: Browser, kind: ScriptKind, c: Case, loggedIn: boolean) {
  const s = await openSession(browser, {
    kind,
    config: c.config,
    configUser: loggedIn ? 'tester' : undefined,
    storage: c.storage,
    notes: c.notes ? [{ id: 'aaaaa', title: '--用户标签--' }] : [],
    noteContent: c.notes
      ? { aaaaa: `--用户标签--${JSON.stringify({ stark123: ['朋友'], javen73: ['楼主'] })}` }
      : undefined,
  });
  const isTopic = c.path.startsWith('/t/');
  const prep = (h: string) => {
    const a = c.night ? night(h) : h;
    return loggedIn ? asLoggedIn(a, 'tester') : a;
  };
  for (const n of ['topic_1252074.html', 'topic_1252074.p2.html']) {
    setRouteHtml(
      s,
      n,
      prep(decorateReplies(fixture(n), { thanks: { 3: 5, 7: 12, 90: 20 }, opFloors: [13] })),
    );
  }
  const listFile = c.path === '/' ? 'home.html' : undefined;
  await s.goto(c.path, !isTopic && listFile ? prep(fixture(listFile)) : undefined);
  if (isTopic) await waitCommentsStable(s.page);
  await s.page.waitForTimeout(2000);
  if (c.actions) {
    await c.actions(s.page);
    await s.page.waitForTimeout(700);
  }
  return s;
}

const topicCases: Case[] = [
  { name: '帖子页', path: '/t/1252074' },
  { name: '帖子页 V2原版', path: '/t/1252074', config: { commentDisplayType: 2 } },
  { name: '帖子页 只看楼主', path: '/t/1252074', config: { commentDisplayType: 3 } },
  { name: '帖子页 simple 视图', path: '/t/1252074', config: { viewType: 'simple' } },
  { name: '帖子页 夜间', path: '/t/1252074', night: true },
  { name: '帖子页 含标签', path: '/t/1252074', config: { openTag: true }, notes: true },
  {
    name: '帖子页 postWidth',
    path: '/t/1252074',
    config: { postWidth: '60rem' },
  },
  {
    name: '打开评论区回复框',
    loginOnly: true,
    path: '/t/1252074',
    actions: async (p) => {
      await toolbar(p).getByText('回复', { exact: true }).click();
      await app(p).locator('textarea').last().fill('hello @st');
    },
  },
  {
    name: '楼层回复框 + 悬停',
    loginOnly: true,
    path: '/t/1252074',
    actions: async (p) => {
      await floor(p, 13).hover();
      await floor(p, 13).getByText('回复', { exact: true }).first().click();
    },
  },
  {
    name: '表情面板',
    loginOnly: true,
    path: '/t/1252074',
    actions: async (p) => {
      await toolbar(p).getByText('回复', { exact: true }).click();
      await app(p)
        .locator('textarea')
        .last()
        .locator('xpath=following-sibling::*[contains(@class,"oolbar")][1]//*[name()="svg"]')
        .first()
        .click();
    },
  },
  {
    name: '感谢确认框',
    loginOnly: true,
    path: '/t/1252074',
    actions: async (p) => {
      await toolbar(p).getByText('感谢', { exact: true }).click();
    },
  },
  {
    name: '收藏后的 toast',
    loginOnly: true,
    path: '/t/1252074',
    actions: async (p) => {
      await toolbar(p).getByText('收藏', { exact: true }).click();
      await p.waitForTimeout(300);
    },
  },
  {
    name: '设置面板（主题 tab）',
    path: '/t/1252074',
    actions: async (p) => {
      await p.locator('.v2next-setting').first().click();
      await p.waitForTimeout(500);
      await p
        .locator('[class*="setting-modal"]')
        .first()
        .getByText('主题', { exact: true })
        .click();
    },
  },
  {
    name: '设置面板（其他 tab）',
    path: '/t/1252074',
    actions: async (p) => {
      await p.locator('.v2next-setting').first().click();
      await p.waitForTimeout(500);
      await p
        .locator('[class*="setting-modal"]')
        .first()
        .getByText('其他', { exact: true })
        .click();
    },
  },
  {
    name: '设置面板（关于 tab）',
    path: '/t/1252074',
    actions: async (p) => {
      await p.locator('.v2next-setting').first().click();
      await p.waitForTimeout(500);
      await p
        .locator('[class*="setting-modal"]')
        .first()
        .getByText('关于', { exact: true })
        .click();
    },
  },
  {
    name: '设置 → 使用需知弹窗',
    path: '/t/1252074',
    actions: async (p) => {
      await p.locator('.v2next-setting').first().click();
      await p.waitForTimeout(500);
      await p
        .locator('[class*="setting-modal"]')
        .first()
        .getByText('卡片', { exact: true })
        .click();
    },
  },
  {
    name: '标签弹窗',
    loginOnly: true,
    path: '/t/1252074',
    config: { openTag: true },
    notes: true,
    actions: async (p) => {
      const add = app(p).locator('[title="添加标签"]').first();
      await add.locator('xpath=..').hover();
      await add.click();
    },
  },
];

const listCases: Case[] = [
  { name: '首页 table', path: '/', config: { viewType: 'table' } },
  { name: '首页 simple', path: '/', config: { viewType: 'simple' } },
  { name: '首页 card', path: '/', config: { viewType: 'card' }, storage: { cacheData } },
  { name: '首页 夜间', path: '/', night: true },
  {
    name: '首页 card 夜间',
    path: '/',
    config: { viewType: 'card' },
    storage: { cacheData },
    night: true,
  },
  {
    name: '首页 打开主题弹窗',
    path: '/',
    config: { autoOpenDetail: true },
    actions: async (p) => {
      await p.locator('a[href*="/t/1252074"]').first().click();
      await waitCommentsStable(p);
    },
  },
  {
    name: '首页 card 打开主题弹窗 夜间',
    path: '/',
    config: { autoOpenDetail: true, viewType: 'card' },
    storage: { cacheData },
    night: true,
    actions: async (p) => {
      await p.locator('a[href*="/t/1252074"]').first().click();
      await waitCommentsStable(p);
    },
  },
];

for (const loggedIn of [false, true]) {
  for (const c of [...topicCases, ...listCases]) {
    if (c.loginOnly && !loggedIn) continue;
    test(`计算样式一致：${c.name}${loggedIn ? ' 已登录' : ''}`, async ({ browser }) => {
      const [o, r] = await Promise.all([
        load(browser, 'original', c, loggedIn),
        load(browser, 'restored', c, loggedIn),
      ]);
      try {
        expect(o.errors).toEqual([]);
        expect(r.errors).toEqual([]);
        const [os, rs] = await Promise.all([
          snapshotDom(o.page, 'body', true, true),
          snapshotDom(r.page, 'body', true, true),
        ]);
        expect(diffStyled(os, rs)).toEqual([]);
      } finally {
        await Promise.all([o.close(), r.close()]);
      }
    });
  }
}
