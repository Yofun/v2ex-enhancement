import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import { waitCommentsStable } from './extract';
import { fixture } from './harness';
import type { Step } from './scenario';
import { runScenario } from './scenario';

test.setTimeout(240_000);

// card 视图下预览按 1 秒间隔逐条抓取，与真实时间赛跑；预置缓存后全部同步渲染，结果确定
const cacheData = JSON.stringify(
  [...new Set([...fixture('home.html').matchAll(/id="topic-link-(\d+)"/g)].map((m) => m[1]))].map(
    (id) => ({
      id,
      title: `cached ${id}`,
      content_rendered: `<p>cached body ${id}</p>`,
      created: Math.floor(Date.now() / 1000),
    }),
  ),
);

const step = (name: string, run: (page: Page) => Promise<void | false>): Step => ({ name, run });
const title = (p: Page) => p.locator('a[href*="/t/1252074"]').first();
const opened = async (p: Page) => {
  await waitCommentsStable(p);
};

for (const loggedIn of [false, true]) {
  for (const viewType of ['table', 'card'] as const) {
    test(`列表页弹出主题详情 ${viewType} ${loggedIn ? '已登录' : '未登录'}`, async ({
      browser,
    }) => {
      const steps: Step[] = [
        step('点击标题打开弹窗', async (p) => {
          await title(p).click();
          await opened(p);
        }),
        step('Esc 关闭', (p) => p.keyboard.press('Escape')),
        step('再次打开', async (p) => {
          await title(p).click();
          await opened(p);
        }),
        step('点击遮罩关闭', (p) => p.mouse.click(5, 300)),
        step('再次打开(2)', async (p) => {
          await title(p).click();
          await opened(p);
        }),
        step('空格关闭', (p) => p.keyboard.press('Space')),
      ];
      await runScenario(
        browser,
        {
          path: '/',
          routeTopics: ['topic_1252074'],
          loggedIn,
          storage: viewType === 'card' ? { cacheData } : undefined,
          config: { viewType, autoOpenDetail: true, closePostDetailBySpace: true },
        },
        steps,
      );
    });
  }
}
