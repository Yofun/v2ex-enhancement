import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

test.setTimeout(240_000);

import type { Step } from './scenario';
import { runScenario } from './scenario';

const topic = 'topic_1252074';

// 两个实现的 class 名不同（data-v 作用域 vs CSS Modules），交互只依赖文案与 class 子串
const app = (page: Page) => page.locator('#app');
const modal = (page: Page) => page.locator('[class*="setting-modal"]').first();

const clickText = (name: string, text: string, nth = 0): Step => ({
  name,
  run: async (page) => {
    await app(page).getByText(text, { exact: true }).nth(nth).click();
  },
});

for (const loggedIn of [false, true]) {
  const tag = loggedIn ? '已登录' : '未登录';

  test(`帖子页：评论展示方式切换 ${tag}`, async ({ browser }) => {
    const steps: Step[] = [clickText('展开类型菜单', '楼中楼')];
    for (const item of ['楼中楼(@)', '冗余楼中楼', '只看楼主', 'V2原版', '楼中楼']) {
      steps.push({
        name: `选择 ${item}`,
        run: async (page) => {
          // 菜单项在“当前项”之后，取最后一个匹配
          await app(page).getByText(item, { exact: true }).last().click();
        },
      });
      steps.push({
        name: '再次展开菜单',
        run: async (page) => {
          await app(page).getByText(item, { exact: true }).first().click();
        },
      });
    }
    steps.push(clickText('点击 最热', '最热'), clickText('点击 最新', '最新'));
    await runScenario(browser, { path: '/t/1252074', topic, loggedIn }, steps);
  });

  test(`设置面板：逐项切换 ${tag}`, async ({ browser }) => {
    const steps: Step[] = [
      {
        name: '打开设置',
        run: async (page) => {
          await page.locator('.v2next-setting').first().click();
          await modal(page).waitFor();
        },
      },
    ];
    for (let tab = 0; tab < 4; tab++) {
      steps.push({
        name: `切到第 ${tab} 个 tab`,
        run: async (page) => {
          await modal(page)
            .getByText(['列表', '主题', '其他', '关于'][tab], { exact: true })
            .click();
        },
      });
      for (let i = 0; i < 12; i++) {
        steps.push({
          name: `tab${tab} 点击第 ${i} 个开关`,
          run: async (page) => {
            const sw = modal(page).locator('[class*="switch"]');
            if ((await sw.count()) <= i) return false;
            await sw.nth(i).click();
          },
        });
      }
      for (let i = 0; i < 6; i++) {
        steps.push({
          name: `tab${tab} 点击第 ${i} 个 radio`,
          run: async (page) => {
            const r = modal(page).locator('[class*="radio"]:not([class*="group"])');
            if ((await r.count()) <= i) return false;
            await r.nth(i).click();
          },
        });
        if (tab === 0 && i === 2) {
          steps.push(
            {
              name: '使用需知：不同意',
              run: async (page) => {
                await modal(page).getByText('不同意', { exact: true }).click();
              },
            },
            {
              name: '再选卡片',
              run: async (page) => {
                await modal(page).locator('[class*="radio"]:not([class*="group"])').nth(2).click();
              },
            },
            {
              name: '使用需知：同意',
              run: async (page) => {
                await modal(page).getByText('同意', { exact: true }).click();
              },
            },
          );
        }
      }
    }
    await runScenario(browser, { path: '/t/1252074', topic, loggedIn }, steps);
  });
}
