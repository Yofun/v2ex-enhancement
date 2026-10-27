import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { chromium, defineConfig } from '@playwright/test';

// 本机缓存的 Chromium 版本可能与 @playwright/test 期望的不一致（且离线无法下载）：
// 依次尝试 CHROMIUM_PATH、期望版本、缓存目录里最新的 headless shell。
function resolveExecutable(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(chromium.executablePath())) return undefined;
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), 'Library/Caches/ms-playwright');
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const d of dirs) {
    const base = join(cache, d);
    for (const sub of readdirSync(base)) {
      const exe = join(base, sub, 'chrome-headless-shell');
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

const executablePath = resolveExecutable();

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  fullyParallel: true,
  // 每个用例同时开原脚本与还原版两个浏览器上下文，并发过高会让异步等待变慢
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    headless: true,
    actionTimeout: 5_000,
    launchOptions: executablePath ? { executablePath } : {},
  },
});
