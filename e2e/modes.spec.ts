import { expect, test } from '@playwright/test';

import { snapshotDom } from './extract';
import { runScenario } from './scenario';

test.setTimeout(120_000);

const noSteps = [] as const;
const night = (html: string) => html.replace(/<body[^>]*>/, '<body class="Night">');

const topic = 'topic_1252074';

test('回复数超过 maxReplyCountLimit：停止解析楼中楼', async ({ browser }) => {
  await runScenario(
    browser,
    { path: '/t/1252074', topic, waitComments: false, config: { maxReplyCountLimit: 10 } },
    [...noSteps],
  );
});

test('回复数超过上限（已登录）', async ({ browser }) => {
  await runScenario(
    browser,
    {
      path: '/t/1252074',
      topic,
      waitComments: false,
      loggedIn: true,
      config: { maxReplyCountLimit: 10 },
    },
    [...noSteps],
  );
});

for (const q of ['script=0', 'script=1', 'script']) {
  test(`?${q} 查询参数：只显示提示不解析`, async ({ browser }) => {
    await runScenario(browser, { path: `/t/1252074?${q}`, topic, waitComments: false }, [
      ...noSteps,
    ]);
  });
}

test('postWidth 主题宽度', async ({ browser }) => {
  await runScenario(browser, { path: '/t/1252074', topic, config: { postWidth: '60rem' } }, [
    ...noSteps,
  ]);
});

for (const p of ['/', '/t/1252074']) {
  test(`夜间模式 ${p}`, async ({ browser }) => {
    await runScenario(
      browser,
      { path: p, topic: p.startsWith('/t/') ? topic : undefined, rewrite: night },
      [...noSteps],
    );
  });
}

test('已登录：记事本里的标签与配置被读取', async ({ browser }) => {
  await runScenario(
    browser,
    {
      path: '/t/1252074',
      topic,
      loggedIn: true,
      config: { openTag: true },
      notes: [
        { id: 'aaaaa', title: '--用户标签--' },
        { id: 'bbbbb', title: '--config--' },
      ],
      noteContent: {
        aaaaa: `--用户标签--${JSON.stringify({ stark123: ['朋友', '同事'], javen73: ['楼主'] })}`,
        bbbbb: `--config--${JSON.stringify({ commentDisplayType: 4, showTopReply: false })}`,
      },
    },
    [...noSteps],
  );
});

test('其它页面类型：/changes 与 member/topics 不报错', async ({ browser }) => {
  // 没有对应 fixture 时只做启动冒烟：脚本应当优雅地忽略
  const s = await (await import('./harness')).openSession(browser, { kind: 'restored' });
  await s.goto('/member/Livid/topics', (await import('./harness')).fixture('member.html'));
  await s.page.waitForTimeout(500);
  expect(s.errors).toEqual([]);
  await snapshotDom(s.page);
  await s.close();
});
