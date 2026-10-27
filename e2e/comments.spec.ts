import { expect, test } from '@playwright/test';

import { extractComments, waitCommentsStable } from './extract';
import type { ScriptKind } from './harness';
import { decorateReplies, fixture, openSession, setRouteHtml } from './harness';

const thanks: Record<number, number> = { 3: 5, 7: 12, 20: 3, 40: 8, 41: 8, 90: 20, 140: 1 };
const opFloors = [13, 25, 60];
const decorate = (html: string) => decorateReplies(html, { thanks, opFloors });

async function render(
  browser: import('@playwright/test').Browser,
  kind: ScriptKind,
  path: string,
  config: Record<string, unknown>,
) {
  const s = await openSession(browser, { kind, config });
  for (const n of ['topic_1252074.html', 'topic_1252074.p2.html'])
    setRouteHtml(s, n, decorate(fixture(n)));
  await s.goto(
    path,
    decorate(fixture(path.includes('p=2') ? 'topic_1252074.p2.html' : 'topic_1252074.html')),
  );
  await waitCommentsStable(s.page);
  const comments = await extractComments(s.page);
  const header = await s.page
    .locator('#app .comment-wrapper > div')
    .first()
    .innerText()
    .catch(() => '');
  const errors = [...s.errors];
  await s.close();
  return { comments, header, errors };
}

const cases: { name: string; config: Record<string, unknown> }[] = [
  { name: 'FloorInFloor(0)', config: { commentDisplayType: 0 } },
  { name: 'Like(1)', config: { commentDisplayType: 1 } },
  { name: 'V2exOrigin(2)', config: { commentDisplayType: 2 } },
  { name: 'OnlyOp(3)', config: { commentDisplayType: 3 } },
  { name: 'FloorInFloorNoCallUser(4)', config: { commentDisplayType: 4 } },
  { name: 'FloorInFloorNested(5)', config: { commentDisplayType: 5 } },
  { name: 'New(6)', config: { commentDisplayType: 6 } },
  {
    name: 'TopReply on (min 5, count 3)',
    config: {
      commentDisplayType: 0,
      showTopReply: true,
      topReplyLoveMinCount: 5,
      topReplyCount: 3,
    },
  },
  { name: 'TopReply off', config: { commentDisplayType: 0, showTopReply: false } },
];

for (const c of cases) {
  for (const path of ['/t/1252074', '/t/1252074?p=2']) {
    test(`评论结构一致 ${c.name} ${path}`, async ({ browser }) => {
      const [orig, rest] = await Promise.all([
        render(browser, 'original', path, c.config),
        render(browser, 'restored', path, c.config),
      ]);
      expect(orig.errors, 'original errors').toEqual([]);
      expect(rest.errors, 'restored errors').toEqual([]);
      expect(orig.comments.length, 'baseline 有评论').toBeGreaterThan(0);
      expect(rest.comments).toEqual(orig.comments);
      expect(rest.header).toEqual(orig.header);
      console.log(
        c.name,
        path,
        'n=',
        rest.comments.length,
        'top=',
        rest.comments.filter((x) => x.area === 'top').length,
        'maxFloor=',
        Math.max(...rest.comments.map((x) => x.floor)),
        'nested=',
        rest.comments.filter((x) => x.parent !== null).length,
      );
    });
  }
}
