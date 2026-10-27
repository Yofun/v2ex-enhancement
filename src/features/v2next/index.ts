import type { Feature } from '@/shared/feature-runtime';

import { bootstrap } from './bootstrap';

export const v2nextFeature: Feature = {
  id: 'v2next',
  setup: bootstrap,
};
