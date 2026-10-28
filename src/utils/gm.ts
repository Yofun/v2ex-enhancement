/// <reference types="vite-plugin-monkey/client" />
// `$` 由 vite-plugin-monkey 提供：未授权/不存在时导出 undefined，被使用的 GM_* 会自动写入 @grant
import { GM_addStyle, GM_openInTab, GM_registerMenuCommand, GM_xmlhttpRequest } from '$';

export function gmAddStyle(css: string): HTMLStyleElement | undefined {
  return typeof GM_addStyle === 'function' ? GM_addStyle(css) : undefined;
}

/** 返回是否真的通过 GM_openInTab 打开 */
export function gmOpenInTab(url: string, options: { active: boolean }): boolean {
  if (typeof GM_openInTab !== 'function') return false;
  GM_openInTab(url, options);
  return true;
}

export function gmRegisterMenuCommand(name: string, callback: () => void): boolean {
  if (typeof GM_registerMenuCommand !== 'function') return false;
  GM_registerMenuCommand(name, callback);
  return true;
}

/** 跨域 POST JSON（钉钉 webhook 等），失败静默 */
export function gmPostJson(url: string, data: unknown): void {
  if (typeof GM_xmlhttpRequest !== 'function') return;
  GM_xmlhttpRequest({
    method: 'POST',
    url,
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify(data),
  });
}
