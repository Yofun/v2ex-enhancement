import { expect, test } from '@playwright/test';

import { waitCommentsStable } from './extract';
import type { ScriptKind } from './harness';
import { asLoggedIn, fixture, openSession } from './harness';

const pages = [
  { name: '首页', path: '/', file: 'home.html' },
  { name: '节点页', path: '/go/programmer', file: 'node.html' },
  { name: '用户页', path: '/member/Livid', file: 'member.html' },
  { name: 'recent', path: '/recent', file: 'recent.html' },
  { name: '帖子页', path: '/t/1252074', file: 'topic_1252074.html' },
  { name: '帖子页 p=2', path: '/t/1252074?p=2', file: 'topic_1252074.p2.html' },
  { name: '帖子页(另一篇)', path: '/t/1252085', file: 'topic_1252085.html' },
];

// 完整构建产物（含其它 feature）与仅 v2next 构建，都必须无报错地启动
for (const kind of ['full', 'restored'] as const) {
  for (const p of pages) {
    for (const loggedIn of [false, true]) {
      test(`启动无错误 [${kind}] ${p.name}${loggedIn ? ' (已登录)' : ''}`, async ({ browser }) => {
        const s = await openSession(browser, {
          kind,
          configUser: loggedIn ? 'tester' : undefined,
          notes: [],
        });
        const html = loggedIn ? asLoggedIn(fixture(p.file), 'tester') : undefined;
        await s.goto(p.path, html);
        await s.page.waitForSelector('#app', { state: 'attached' });
        if (p.path.startsWith('/t/')) await waitCommentsStable(s.page);
        else await s.page.waitForTimeout(500);
        expect(s.errors).toEqual([]);
        expect(await s.page.locator('#app').count()).toBe(1);
        const setting = s.page.locator('.tools .v2next-setting');
        await expect(setting.first()).toHaveText('脚本设置');
        await s.close();
      });
    }
  }
}

async function networkTrace(
  browser: import('@playwright/test').Browser,
  kind: ScriptKind,
  path: string,
  file: string,
  mission: 'claimed' | 'available',
) {
  const s = await openSession(browser, {
    kind,
    configUser: 'tester',
    notes: [],
    overrides:
      mission === 'available'
        ? {
            '/mission/daily': () => ({
              body: '<html><body><div id="Wrapper"><div id="Main"><input type="button" value="领取 X 铜币" /></div></div></body></html>',
            }),
          }
        : undefined,
  });
  await s.goto(path, asLoggedIn(fixture(file), 'tester'));
  await s.page.waitForSelector('#app', { state: 'attached' });
  // 记事本/签到是串行请求链：等到连续 0.8s 没有在途请求
  for (let quiet = 0, i = 0; quiet < 4 && i < 80; i++) {
    await s.page.waitForTimeout(200);
    quiet = s.inflight() === 0 ? quiet + 1 : 0;
  }
  const trace = s.requests
    .filter((q) => !/\.(js|css|png|jpg|gif|svg|ico)(\?|$)/.test(q.url) && !q.url.includes('/api/'))
    .map((q) => `${q.method} ${q.url.replace('https://www.v2ex.com', '')}`)
    .filter((l) => !/^GET \/(t\/\d+(\?p=\d+)?|go\/\w+|member\/\w+|recent|)$/.test(l))
    .sort();
  const body = s.requests.filter((q) => q.method === 'POST').map((q) => q.url);
  const sign = await s.page.evaluate(() => localStorage.getItem('menu_clockInTime'));
  const errors = s.errors;
  await s.close();
  return { trace, body, sign, errors };
}

for (const mission of ['claimed', 'available'] as const) {
  test(`已登录：记事本/签到请求与原脚本一致 (签到${mission === 'claimed' ? '已领' : '可领'})`, async ({
    browser,
  }) => {
    const [o, r] = await Promise.all([
      networkTrace(browser, 'original', '/t/1252074', 'topic_1252074.html', mission),
      networkTrace(browser, 'restored', '/t/1252074', 'topic_1252074.html', mission),
    ]);
    expect(o.errors).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(
      o.trace.some((l) => l.includes('/notes')),
      '基线应读取记事本',
    ).toBe(true);
    expect(
      o.trace.some((l) => l.includes('/mission/daily')),
      '基线应检查签到',
    ).toBe(true);
    expect(r.trace).toEqual(o.trace);
    expect(r.body).toEqual(o.body);
    expect(r.sign).toBe(o.sign);
    expect(o.sign).not.toBeNull();
  });
}

test('油猴菜单命令与原脚本一致', async ({ browser }) => {
  const menus: Record<string, string[]> = {};
  for (const kind of ['original', 'restored'] as const) {
    const s = await openSession(browser, { kind });
    await s.goto('/');
    await s.page.waitForSelector('#app', { state: 'attached' });
    await s.page.waitForTimeout(500);
    menus[kind] = await s.page.evaluate(() =>
      (window as unknown as { __gm: { menu: { name: string }[] } }).__gm.menu.map((m) => m.name),
    );
    await s.close();
  }
  expect(menus.original.length, '基线应注册菜单').toBeGreaterThan(0);
  expect(menus.restored).toEqual(menus.original);
});
