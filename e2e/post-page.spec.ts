import { expect, test } from '@playwright/test';

import { snapshotDom, waitCommentsStable } from './extract';
import type { ScriptKind } from './harness';
import { asLoggedIn, decorateReplies, fixture, openSession, setRouteHtml } from './harness';

const decorate = (html: string) =>
  decorateReplies(html, { thanks: { 3: 5, 7: 12, 20: 3, 90: 20 }, opFloors: [13, 25] });

async function render(
  browser: import('@playwright/test').Browser,
  kind: ScriptKind,
  config: Record<string, unknown>,
  loggedIn: boolean,
) {
  const s = await openSession(browser, {
    kind,
    config,
    configUser: loggedIn ? 'tester' : undefined,
    notes: [],
  });
  const prep = (n: string) => {
    const h = decorate(fixture(n));
    return loggedIn ? asLoggedIn(h, 'tester') : h;
  };
  for (const n of ['topic_1252074.html', 'topic_1252074.p2.html']) setRouteHtml(s, n, prep(n));
  await s.goto('/t/1252074');
  await waitCommentsStable(s.page);
  await s.page.waitForTimeout(500);
  return s;
}

for (const loggedIn of [false, true]) {
  for (const type of [0, 1, 2, 3, 4, 5, 6]) {
    test(`帖子页 #app 完整 DOM 一致 type=${type}${loggedIn ? ' 已登录' : ''}`, async ({
      browser,
    }) => {
      const cfg = { commentDisplayType: type };
      const [o, r] = await Promise.all([
        render(browser, 'original', cfg, loggedIn),
        render(browser, 'restored', cfg, loggedIn),
      ]);
      try {
        expect(o.errors).toEqual([]);
        expect(r.errors).toEqual([]);
        const [os, rs] = [
          await snapshotDom(o.page, 'body', true),
          await snapshotDom(r.page, 'body', true),
        ];
        expect(rs.join('\n')).toBe(os.join('\n'));
      } finally {
        await Promise.all([o.close(), r.close()]);
      }
    });
  }
}
