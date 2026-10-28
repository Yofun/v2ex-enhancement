import { expect, test } from '@playwright/test';

import { fixture, openSession, setRouteHtml } from './harness';

const rule = {
  id: 'r1',
  name: 'imgur 镜像',
  enabled: true,
  match: '^https?://i\\.imgur\\.com/(.+)$',
  mode: 'replace',
  replacement: 'https://mirror.test/$1',
  script: '',
};

test('图片规则：帖子正文和评论里的 imgur 图片被改写，并保留 originUrl 以便失败时还原', async ({
  browser,
}) => {
  const s = await openSession(browser, {
    kind: 'restored',
    config: {},
    storage: { 'v2next-image-rules': JSON.stringify([rule]) },
  });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  await s.page.route('https://mirror.test/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: png }),
  );
  await s.goto('/t/1252074');
  await s.page.waitForSelector('#app [data-floor]');
  await s.page.waitForSelector('#app img[originurl]');
  const imgs = await s.page.evaluate(() =>
    [...document.querySelectorAll('#app img[originurl]')].map((i) => ({
      src: (i as HTMLImageElement).src,
      origin: i.getAttribute('originUrl'),
    })),
  );
  expect(imgs.length).toBeGreaterThan(0);
  for (const i of imgs) {
    expect(i.origin).toContain('imgur.com');
    expect(i.src).toBe(i.origin!.replace('https://i.imgur.com/', 'https://mirror.test/'));
  }
});

test('图片规则：没有规则时保持原样', async ({ browser }) => {
  const s = await openSession(browser, { kind: 'restored', config: {} });
  await s.goto('/t/1252074');
  await s.page.waitForSelector('#app [data-floor]');
  const mirrored = await s.page.locator('#app img[src^="https://mirror.test"]').count();
  expect(mirrored).toBe(0);
});

test('图片规则：设置里添加、启用、测试并持久化', async ({ browser }) => {
  const s = await openSession(browser, { kind: 'restored', config: {} });
  await s.goto('/');
  await s.page.waitForSelector('#app', { state: 'attached' });
  await s.page.click('.v2next-setting');
  await s.page
    .locator('span:visible', { hasText: /^图片$/ })
    .first()
    .click({ force: true });
  await s.page.getByText('添加规则').click();
  await expect(s.page.getByText('未启用')).toBeVisible();
  const stored = () =>
    s.page.evaluate(() => JSON.parse(localStorage.getItem('v2next-image-rules') ?? '[]'));
  expect(await stored()).toHaveLength(1);
  await s.page.getByPlaceholder('如 https://proxy.example/$1').fill('https://mirror.test/$1');
  await s.page.locator('[class*="head"] [class*="switch"]').first().click();
  await expect(s.page.getByText('测试结果：https://mirror.test/Uk7Ztv5.jpeg')).toBeVisible();
  const [r] = await stored();
  expect(r.enabled).toBe(true);
  expect(r.replacement).toBe('https://mirror.test/$1');
});

test('图片规则：异步脚本把纯文本相册链接替换成多张图片', async ({ browser }) => {
  const album = 'https://imgur.com/a/abc1234';
  const s = await openSession(browser, {
    kind: 'restored',
    config: {},
    storage: {
      'v2next-image-rules': JSON.stringify([
        {
          ...rule,
          id: 'album',
          match: '^https://imgur\\.com/a/',
          mode: 'script',
          script:
            "await new Promise((r) => setTimeout(r, 50)); return ['https://mirror.test/1.png', 'https://mirror.test/2.png'];",
        },
      ]),
    },
  });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  await s.page.route('https://mirror.test/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: png }),
  );
  setRouteHtml(
    s,
    'topic_1252074.html',
    fixture('topic_1252074.html').replace(
      '<div class="topic_content">',
      `<div class="topic_content"><a href="${album}">${album}</a><br>`,
    ),
  );
  await s.goto('/t/1252074');
  await s.page.waitForSelector('#app [data-floor]');
  await expect(s.page.locator(`#app a[href="${album}"] img`)).toHaveCount(2);
  const srcs = await s.page
    .locator(`#app a[href="${album}"] img`)
    .evaluateAll((l) => l.map((i) => (i as HTMLImageElement).src));
  expect(srcs).toEqual(['https://mirror.test/1.png', 'https://mirror.test/2.png']);
});
