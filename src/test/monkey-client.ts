// vitest 中替代 vite-plugin-monkey 的 `$` 模块：模拟没有 GM_* 授权的环境
export const GM_addStyle: undefined = undefined;
export const GM_openInTab: undefined = undefined;
export const GM_registerMenuCommand: undefined = undefined;
export const GM_xmlhttpRequest: undefined = undefined;
