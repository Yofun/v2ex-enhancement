import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

import packageJson from './package.json' with { type: 'json' };

const repositoryUrl = 'https://github.com/Yofun/v2ex-enhancement';

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' }),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'V2EX Enhancement',
        namespace: repositoryUrl,
        version: packageJson.version,
        description: '为 V2EX 提供模块化的页面美化和增强功能。',
        author: 'Yofun',
        match: ['https://v2ex.com/*', 'https://www.v2ex.com/*'],
        homepageURL: repositoryUrl,
        supportURL: `${repositoryUrl}/issues`,
        'run-at': 'document-start',
      },
      server: {
        open: false,
        prefix: (name) => `dev: ${name}`,
      },
      build: {
        fileName: 'v2ex-enhancement.user.js',
        cssSideEffects:
          "(css) => { const style = document.createElement('style'); style.textContent = css; const target = document.head ?? document.documentElement; if (target) { target.append(style); } else { document.addEventListener('DOMContentLoaded', () => document.head.append(style), { once: true }); } }",
        externalGlobals: {
          react: cdn.jsdelivr('React', 'umd/react.production.min.js'),
          'react-dom/client': cdn.jsdelivr('ReactDOM', 'umd/react-dom.production.min.js'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
