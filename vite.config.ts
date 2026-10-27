import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import monkey, { cdn } from 'vite-plugin-monkey';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json' with { type: 'json' };

const repositoryUrl = 'https://github.com/Yofun/v2ex-enhancement';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // vitest 下不加载油猴插件（它会注册 dev server 钩子），GM_* 由 alias 的桩模块代替
    ...(mode === 'test'
      ? []
      : [
          monkey({
            entry: mode === 'e2e' ? 'src/e2e-entry.ts' : 'src/main.ts',
            userscript: {
              name: 'V2EX Enhancement',
              namespace: repositoryUrl,
              version: packageJson.version,
              description: '为 V2EX 提供模块化的页面美化和增强功能。',
              author: 'Yofun',
              match: ['https://v2ex.com/*', 'https://*.v2ex.com/*'],
              grant: ['GM_addStyle', 'GM_openInTab', 'GM_registerMenuCommand', 'GM_xmlhttpRequest'],
              connect: ['oapi.dingtalk.com'],
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
                'react-dom': cdn.jsdelivr('ReactDOM', 'umd/react-dom.production.min.js'),
                'react-dom/client': 'ReactDOM',
              },
            },
          }),
        ]),
  ],
  build: mode === 'e2e' ? { outDir: 'node_modules/.e2e-dist' } : undefined,
  resolve: {
    alias: {
      'react/jsx-runtime': fileURLToPath(new URL('./src/shared/jsx-runtime.ts', import.meta.url)),
      'react/jsx-dev-runtime': fileURLToPath(
        new URL('./src/shared/jsx-runtime.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...(mode === 'test'
        ? {
            $: fileURLToPath(
              new URL('./src/features/v2next/__mocks__/monkey-client.ts', import.meta.url),
            ),
          }
        : {}),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
