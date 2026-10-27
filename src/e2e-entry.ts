// 仅供 e2e 差异测试使用的入口（vite build --mode e2e）：只启用 v2next，
// 避免其它美化 feature 改动 DOM，影响与原 V2Next 脚本的逐元素对比。
import { v2nextFeature } from '@/features/v2next';
import { startFeatures } from '@/shared/feature-runtime';

function start(): void {
  startFeatures([v2nextFeature]);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
