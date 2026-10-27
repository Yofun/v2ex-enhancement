import { expect, test } from '@playwright/test';

import type { ScriptKind } from './harness';
import { asLoggedIn, fixture, openSession } from './harness';

async function storedConfig(
  browser: import('@playwright/test').Browser,
  kind: ScriptKind,
  opts: { preset?: Record<string, unknown>; user?: string; loggedIn?: boolean },
) {
  const s = await openSession(browser, {
    kind,
    config: opts.preset,
    configUser: opts.user,
    notes: [],
  });
  await s.goto('/', opts.loggedIn ? asLoggedIn(fixture('home.html'), opts.user) : undefined);
  await s.page.waitForSelector('#app', { state: 'attached' });
  await s.page.waitForTimeout(500);
  const raw = await s.page.evaluate(() => localStorage.getItem('v2ex-config'));
  const errors = s.errors;
  await s.close();
  return { raw, errors };
}

const scenarios = [
  { name: '未登录 默认配置', opts: {} },
  { name: '登录 默认配置', opts: { loggedIn: true, user: 'tester' } },
  {
    name: '合并已存配置（含嵌套 notice、未知字段）',
    opts: {
      preset: {
        viewType: 'card',
        topReplyCount: 9,
        notice: { uid: 'u1', loopCheckNoticeInterval: 30 },
        legacyField: 1,
      },
    },
  },
];

for (const sc of scenarios) {
  test(`v2ex-config 持久化一致：${sc.name}`, async ({ browser }) => {
    const [o, r] = await Promise.all([
      storedConfig(browser, 'original', sc.opts),
      storedConfig(browser, 'restored', sc.opts),
    ]);
    expect(o.errors).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(o.raw, '基线应写入配置').not.toBeNull();
    const [oc, rc] = [JSON.parse(o.raw!), JSON.parse(r.raw!)] as Record<
      string,
      Record<string, unknown>
    >[];
    expect(rc).toEqual(oc);
    // 键顺序也应一致（逐字段 deepEqual 之外，序列化文本一致更严格）
    expect(r.raw).toBe(o.raw);
  });
}
