import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { Step } from './scenario';
import { runScenario } from './scenario';

test.setTimeout(240_000);

const topic = 'topic_1252074';
const app = (page: Page) => page.locator('#app');
// 帖子顶部工具栏：第一个 class 含 toolbar 且直接包含“收藏”的元素
const postToolbar = (page: Page) =>
  app(page).locator('[class*="toolbar"]').filter({ hasText: 'Tweet' }).first();
// “+” 只在悬停（帖子头或评论作者行）时显示
const clickAddTag = async (p: Page) => {
  const add = app(p).locator('[title="添加标签"]').first();
  await add
    .locator(
      'xpath=ancestor::*[self::small or self::span[contains(@class,"texts")] or contains(@class,"header")][1]',
    )
    .hover();
  await add.click();
};
const floor = (page: Page, n: number) => app(page).locator(`[data-floor="${n}"]`).first();

const step = (name: string, run: (page: Page) => Promise<void | false>): Step => ({ name, run });

test('帖子页工具栏：收藏/忽略/报告/感谢/Tweet（已登录）', async ({ browser }) => {
  const steps: Step[] = [
    step('收藏', (p) => postToolbar(p).getByText('收藏', { exact: true }).click()),
    step('取消收藏', (p) => postToolbar(p).getByText('取消收藏', { exact: true }).click()),
    step('Tweet', (p) => postToolbar(p).getByText('Tweet', { exact: true }).click()),
    step('报告', (p) => postToolbar(p).getByText('报告', { exact: true }).click()),
    step('感谢主题（弹出确认）', (p) => postToolbar(p).getByText('感谢', { exact: true }).click()),
    step('感谢主题（取消）', (p) => p.getByText('取消', { exact: true }).click()),
    step('感谢主题（再点）', (p) => postToolbar(p).getByText('感谢', { exact: true }).click()),
    step('感谢主题（确认）', (p) => p.getByText('确认', { exact: true }).click()),
  ];
  const { toasts } = await runScenario(
    browser,
    { path: '/t/1252074', topic, loggedIn: true },
    steps,
  );
  // 基线确实弹过提示，说明 toast 对比不是空对空
  expect(toasts).toContain('收藏成功');
  expect(toasts).toContain('取消成功');
});

test('回复框：打开、输入、表情、提交（已登录）', async ({ browser }) => {
  const steps: Step[] = [
    step('点击回复', (p) => postToolbar(p).getByText('回复', { exact: true }).click()),
    step('输入内容', (p) => app(p).locator('textarea').first().fill('hello 测试')),
    step('输入 @', (p) => app(p).locator('textarea').first().pressSequentially(' @st')),
    step('Esc', (p) => app(p).locator('textarea').first().press('Escape')),
    step('提交回复', async (p) => {
      await app(p).locator('textarea').last().fill('提交的回复 @stark123 ');
      await app(p).getByText('回复', { exact: true }).last().click();
    }),
  ];
  await runScenario(browser, { path: '/t/1252074', topic, loggedIn: true }, steps);
});

test('楼层操作：隐藏/展开/回复/感谢/上下文/跳转（已登录）', async ({ browser }) => {
  const steps: Step[] = [
    step('悬停 13 楼', (p) => floor(p, 13).hover()),
    step('13 楼 回复', (p) => floor(p, 13).getByText('回复', { exact: true }).first().click()),
    step('13 楼 回复框输入', (p) =>
      floor(p, 13).locator('textarea').first().pressSequentially('回复 13'),
    ),
    step('13 楼 提交回复', async (p) => {
      await floor(p, 13).getByText('回复', { exact: true }).last().click();
    }),
    step('13 楼 再次回复', (p) => floor(p, 13).getByText('回复', { exact: true }).first().click()),
    step('13 楼 关闭回复框', (p) =>
      floor(p, 13).getByText('关闭', { exact: true }).first().click(),
    ),
    step('13 楼 上下文', (p) => floor(p, 13).getByText('上下文', { exact: true }).first().click()),
    step('第一个“跳转”', (p) => app(p).getByText('跳转', { exact: true }).first().click()),
    step('13 楼 隐藏', (p) => floor(p, 13).getByText('隐藏', { exact: true }).first().click()),
    step('13 楼 展开', (p) => floor(p, 13).locator('[class*="expand"]').first().click()),
    step('11 楼 感谢', (p) => floor(p, 11).getByText('感谢', { exact: true }).first().click()),
    step('11 楼 感谢 确认', (p) => p.getByText('确认', { exact: true }).click()),
  ];
  await runScenario(browser, { path: '/t/1252074', topic, loggedIn: true }, steps);
});

test('用户标签：添加 / 删除（已登录，写回记事本）', async ({ browser }) => {
  const steps: Step[] = [
    step('点击楼主旁的 + 添加标签', (p) => clickAddTag(p)),
    step('输入标签', (p) =>
      p
        .locator('[class*="tag-modal"] input[type="text"], [class*="tagModal"] input[type="text"]')
        .first()
        .fill('新标签'),
    ),
    step('取消', (p) => p.getByText('取消', { exact: true }).click()),
    step('再次点击 +', (p) => clickAddTag(p)),
    step('输入标签(2)', (p) =>
      p
        .locator('[class*="tag-modal"] input[type="text"], [class*="tagModal"] input[type="text"]')
        .first()
        .fill('新标签'),
    ),
    step('回车确认', (p) =>
      p
        .locator('[class*="tag-modal"] input[type="text"], [class*="tagModal"] input[type="text"]')
        .first()
        .press('Enter'),
    ),
    step('删除标签', async (p) => {
      const rm = app(p).locator('[class*="remove"]').first();
      // 图标只在悬停时显示；滚动会让悬停失效，直接派发 click
      await rm.dispatchEvent('click');
    }),
  ];
  await runScenario(
    browser,
    {
      path: '/t/1252074',
      topic,
      loggedIn: true,
      config: { openTag: true },
      notes: [{ id: 'aaaaa', title: '--用户标签--' }],
      noteContent: {
        aaaaa: `--用户标签--${JSON.stringify({ stark123: ['朋友'], javen73: ['楼主'] })}`,
      },
    },
    steps,
  );
});
