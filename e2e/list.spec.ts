import { expect, test } from '@playwright/test';

import { snapshotDom } from './extract';
import type { ScriptKind } from './harness';
import { openSession } from './harness';

const pages = [
  { name: 'home', path: '/', sel: 'body' },
  { name: 'node', path: '/go/programmer', sel: 'body' },
  { name: 'member', path: '/member/Livid', sel: 'body' },
  { name: 'recent', path: '/recent', sel: 'body' },
];
const views = ['table', 'card', 'simple'];

/** card 视图会按 1 秒间隔逐条拉取预览：用假时钟一次性走完，再等请求落地，避免与真实时间竞争 */
async function settle(s: Awaited<ReturnType<typeof openSession>>): Promise<void> {
  await s.page.clock.runFor(60_000);
  let last = '';
  for (let i = 0; i < 40; i++) {
    const cur = await s.page.evaluate(
      () =>
        `${document.querySelectorAll('.post-item.preview').length}/${document.querySelectorAll('.post-content').length}`,
    );
    if (cur === last) return;
    last = cur;
    await s.page.waitForTimeout(250);
  }
}

async function load(
  browser: import('@playwright/test').Browser,
  kind: ScriptKind,
  path: string,
  viewType: string,
) {
  const s = await openSession(browser, { kind, config: { viewType } });
  await s.page.clock.install();
  await s.goto(path);
  await s.page.waitForSelector('#app', { state: 'attached' });
  await settle(s);
  return s;
}

for (const p of pages) {
  for (const view of views) {
    test(`列表页 DOM 一致 ${p.name} ${view}`, async ({ browser }) => {
      const [o, r] = await Promise.all([
        load(browser, 'original', p.path, view),
        load(browser, 'restored', p.path, view),
      ]);
      try {
        expect(o.errors).toEqual([]);
        expect(r.errors).toEqual([]);
        const count = (s: typeof o) => s.page.locator('.post-item').count();
        const toggles = (s: typeof o) => s.page.locator('.toggle').count();
        const [oc, rc] = [await count(o), await count(r)];
        expect(oc, 'baseline 有 post-item').toBeGreaterThan(0);
        expect(rc).toBe(oc);
        expect(await toggles(r)).toBe(await toggles(o));
        const [os, rs] = [await snapshotDom(o.page, p.sel), await snapshotDom(r.page, p.sel)];
        expect(rs.join('\n')).toBe(os.join('\n'));
        const api = (s: typeof o) =>
          s.requests
            .filter((q) => q.url.includes('/api/topics/show.json'))
            .map((q) => q.url)
            .sort();
        expect(api(r)).toEqual(api(o));
        if (view === 'card') {
          expect(
            await r.page.locator('.post-content').count(),
            '卡片视图应抓取到预览',
          ).toBeGreaterThan(0);
          expect(api(r).length).toBeGreaterThan(0);
        } else {
          expect(api(r)).toEqual([]);
        }
        const cache = (s: typeof o) =>
          s.page.evaluate(() =>
            (JSON.parse(localStorage.getItem('cacheData') ?? '[]') as { id: string }[])
              .map((v) => v.id)
              .sort(),
          );
        expect(await cache(r)).toEqual(await cache(o));
      } finally {
        await Promise.all([o.close(), r.close()]);
      }
    });
  }
}

for (const p of pages) {
  for (const view of views) {
    test(`点击“预览”后一致 ${p.name} ${view}`, async ({ browser }) => {
      const [o, r] = await Promise.all([
        load(browser, 'original', p.path, view),
        load(browser, 'restored', p.path, view),
      ]);
      try {
        for (const s of [o, r]) {
          await s.page.locator('.post-item .toggle').first().dispatchEvent('click');
          await s.page.waitForTimeout(600);
        }
        expect(o.errors).toEqual([]);
        expect(r.errors).toEqual([]);
        const text = (s: typeof o) => s.page.locator('.post-item .toggle').first().innerText();
        // card 视图默认已展开，点击即收起（文案回到“预览”）；其余视图点击后展开
        const expected = view === 'card' ? '预览' : '收起';
        expect(await text(o)).toBe(expected);
        expect(await text(r)).toBe(expected);
        if (view !== 'card') {
          for (const s of [o, r]) {
            await expect(s.page.locator('.post-item.preview').first()).toContainText(
              'synthetic body',
            );
          }
        }
        const [os, rs] = [await snapshotDom(o.page, 'body'), await snapshotDom(r.page, 'body')];
        expect(rs.join('\n')).toBe(os.join('\n'));
        // 再点一次：收起
        for (const s of [o, r]) {
          await s.page.locator('.post-item .toggle').first().dispatchEvent('click');
          await s.page.waitForTimeout(300);
        }
        const [os2, rs2] = [await snapshotDom(o.page, 'body'), await snapshotDom(r.page, 'body')];
        expect(rs2.join('\n')).toBe(os2.join('\n'));
      } finally {
        await Promise.all([o.close(), r.close()]);
      }
    });
  }
}
