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
yarn test   # vitest 单测（自动下载 fixture）
yarn e2e    # Playwright：以原版 V2Next 10.31 为基线做对照验证
```

## 模块组织

```text
src/
  main.ts          脚本入口：DOM 就绪后调用 app/bootstrap
  app/             应用外壳：bootstrap（按页面类型解析并挂载）、App、AppContext、通知/日历等
  components/      React 组件：base（通用 UI）、comment、post-detail、setting
  core/            类型、常量、session 状态、事件总线、host 消息总线、JSX 运行时垫片
  hooks/           通用 hooks
  parsers/         V2EX 页面/回复的 DOM 解析
  services/        网络请求、记事本数据同步、自动签到
  utils/           纯工具（回复楼层树、DOM、GM 封装、邮箱解码等）
  styles/          全局样式与按配置生成的动态样式
  test/            单测替身与对照基准（仅 vitest 使用）
e2e/               Playwright 对照测试（fixture 由 yarn fixtures 下载，不入库）
```

约定：同目录用相对路径，跨目录用 `@/` 别名；组件样式用同名 `*.module.scss`。
