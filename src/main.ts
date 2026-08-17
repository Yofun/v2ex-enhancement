import { features } from '@/features';
import { startFeatures } from '@/shared/feature-runtime';

function start(): void {
  startFeatures(features);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
