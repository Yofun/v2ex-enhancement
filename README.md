# V2EX Enhancement

面向 [V2EX](https://www.v2ex.com/) 的模块化 React 油猴脚本。项目使用 Vite 和
`vite-plugin-monkey`，构建结果是可直接安装的单个 userscript 文件。

## 环境

- Node.js `20.19+` 或 `22.12+`
- Tampermonkey 或 Violentmonkey

## 开发

```sh
corepack enable
yarn install
yarn start
```

开发服务启动后，在脚本管理器中安装：

```text
http://127.0.0.1:5173/__vite-plugin-monkey.install.user.js
```

保持 Vite 进程运行，访问 V2EX 后修改源码即可通过热更新调试。开发脚本会显示为
`dev: V2EX Enhancement`，可与正式版本区分；调试时只保留开发脚本启用，避免两份脚本同时执行。

## 构建

```sh
yarn build
```

产物为 `dist/v2ex-enhancement.user.js`，可直接拖入脚本管理器安装。

## 质量检查

```sh
yarn typecheck
yarn lint
yarn format:check
```

## 模块组织

```text
src/
  features/                 独立用户功能
    appearance/             V2EX 页面视觉样式
    status-panel/           React 状态面板示例
  shared/feature-runtime.ts 功能生命周期与异常隔离
  main.ts                   脚本入口，仅注册并启动功能
```

新增功能时，在 `src/features/<feature-name>/` 内实现，并将其导出项添加到
`src/features/index.ts`。每个功能的初始化失败会被隔离，不影响其他功能继续运行。
