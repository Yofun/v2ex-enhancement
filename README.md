# V2EX Enhancement

一个 Tampermonkey 用户脚本，增强 [V2EX](https://www.v2ex.com/) 的浏览体验：列表预览、帖子详情浮层、楼中楼评论、用户标签、自动签到等。

基于 [V2Next](https://github.com/zyronon/V2Next) 10.31 还原为 **React + TypeScript + Vite**，使用 `vite-plugin-monkey` 构建为单个 `.user.js` 文件，并通过 Playwright 与原脚本做对照测试，保证行为一致。构建产物由 CI 生成并发布到 GitHub Releases。

## 功能特性

- **列表三种视图** —— 简洁 / 表格 / 卡片；卡片视图会抓取并折叠展示主题正文预览
- **帖子详情浮层** —— 在首页、节点页、用户页点击主题，直接在列表上方的浮层里查看，不跳转页面；可配置空格键关闭、新标签页打开
- **楼中楼评论** —— 多种评论展示方式（楼中楼 / 楼中楼隐藏 @ / 嵌套 / 感谢排序 / V2EX 原版 / 只看楼主），自动合并多页回复
- **热门回复** —— 按感谢数展示热门回复，数量和阈值可配置
- **回复编辑器** —— 表情选择、`@` 用户补全、回复楼层引用、图片粘贴/上传
- **用户标签** —— 给用户打标签，数据保存在 V2EX 记事本中
- **阅读辅助** —— 记住已读楼层并自动跳转、正文过长自动折叠、选中文本 Base64 解码、图片链接自动转图片
- **通知** —— 提醒页接管、未读数标题提示与闪烁、定时检查、钉钉 Webhook 推送
- **自动签到** —— 登录后自动领取每日登录奖励
- **历史最热** —— 首页「最热」标签下的昨天/前天/3 天/7 天/30 天最热
- **外观** —— 夜间模式适配、自定义背景色、字号、帖子页宽度
- **设置面板** —— 页面右上角「脚本设置」，配置按用户保存在本地并同步到 V2EX 记事本

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 Violentmonkey
2. 点击安装最新版：**[v2ex-enhancement.user.js](https://github.com/Yofun/v2ex-enhancement/releases/latest/download/v2ex-enhancement.user.js)**
3. 打开 [V2EX](https://www.v2ex.com/) 即可使用，点击右上角「脚本设置」调整配置

脚本头部声明了 `@updateURL`，脚本管理器会按其更新策略自动检查新版本。

> 脚本只在 PC 端页面（存在 `#Rightbar`）生效，且不要与原版 V2Next 同时启用。

## 开发

### 环境

- Node.js `20.19+` 或 `22.12+`（见 `.nvmrc`）
- Corepack（随 Node 提供）

### 启动

```sh
corepack enable
yarn install
yarn start
```

开发服务启动后，在脚本管理器中安装一次：

```text
http://127.0.0.1:5173/__vite-plugin-monkey.install.user.js
```

保持 Vite 进程运行，访问 V2EX 后修改源码即可热更新。开发脚本显示为 `dev: V2EX Enhancement`，调试时只保留开发脚本启用，避免多份脚本同时执行。

### 构建

```sh
yarn build
```

产物为 `dist/v2ex-enhancement.user.js`（已 gitignore），可直接拖入脚本管理器安装。

### 质量检查

```sh
yarn typecheck
yarn lint
yarn format:check
yarn test   # vitest 单测（自动下载 fixture）
yarn e2e    # Playwright：以原版 V2Next 10.31 为基线做对照验证
```

`yarn test` 和 `yarn e2e` 会先通过 `scripts/fetch-fixtures.mjs` 下载公开的 V2EX 页面快照到 `e2e/fixtures/`（已 gitignore，不入库）。

### 目录结构

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
e2e/               Playwright 对照测试
scripts/           fixture 下载脚本
.github/workflows/ 发布流水线
.agents/skills/    项目内的 agent 工作流（release）
```

约定：同目录用相对路径，跨目录用 `@/` 别名；组件样式用同名 `*.module.scss`。

### 与原版的差异

- 未移植 `loadAndRunScript`（会下载第三方 URL 的代码并 `eval`）及依赖它的「v2新帖挂件」，设置里对应的「插件」tab 一并省略
- 钉钉通知改为通过 `GM_xmlhttpRequest` 直连钉钉 Webhook，不再经由第三方转发服务器
- 修复了原脚本的几处 bug（请求挂起、`https://https://` 拼接、取消感谢计数等）
- 去掉了安卓 App、官网等与本项目无关的入口

## 发布流程

发布分为本地和 CI 两段：

| 步骤                                  | 位置 | 工具                                                   |
| ------------------------------------- | ---- | ------------------------------------------------------ |
| 类型检查 + lint                       | 本地 | release-it `before:init` 钩子                          |
| 升级 `package.json` 版本              | 本地 | [release-it](https://github.com/release-it/release-it) |
| 构建产物                              | 本地 | `yarn build`（`after:bump` 钩子）                      |
| 生成 `CHANGELOG.md`                   | 本地 | `@release-it/conventional-changelog`                   |
| 提交 `chore: release vX.Y.Z` 并打 tag | 本地 | release-it                                             |
| 推送提交和 tag                        | 本地 | `git push --follow-tags origin main`                   |
| 创建 GitHub Release 并上传产物        | CI   | `.github/workflows/release.yml`（tag 触发）            |

```sh
# 1. 提交信息遵循 Conventional Commits（feat / fix / perf / refactor / docs ...），changelog 据此生成
# 2. 在 main 分支、工作区干净时执行：
yarn release -- patch      # 或 minor / major / 具体版本号，如 yarn release -- 1.0.0
# 3. 推送提交和 tag，触发 CI
git push --follow-tags origin main
```

`yarn release:dry -- patch` 可以预览版本号和 changelog 而不做任何修改。

CI 会校验 tag 与 `package.json` 版本一致，执行 `typecheck`、`lint`、`format:check` 和构建，然后用 `CHANGELOG.md` 里该版本的内容作为 Release 说明，并上传 `dist/v2ex-enhancement.user.js`。release-it 本身不会访问 GitHub API（`github.release = false`）。详细步骤见 [.agents/skills/release/SKILL.md](.agents/skills/release/SKILL.md)。

## 许可

原脚本 V2Next 使用 GPL 许可。本仓库尚未声明 LICENSE，发布前请补充与之兼容的许可证。
