import { createRoot, type Root } from 'react-dom/client';

import type { Feature } from '@/shared/feature-runtime';

import { StatusPanel } from './status-panel';

import './style.scss';

const panelId = 'v2ex-enhancement-panel';

export const statusPanelFeature: Feature = {
  id: 'status-panel',
  setup() {
    const container = document.createElement('div');
    container.id = panelId;
    document.body.append(container);

    const root: Root = createRoot(container);
    root.render(<StatusPanel />);

    return () => {
      root.unmount();
      container.remove();
    };
  },
};
