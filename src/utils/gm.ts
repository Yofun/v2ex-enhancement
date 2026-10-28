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

/** 跨域 GET 文本：有 GM_xmlhttpRequest 时走它（不受 CORS 限制），否则退回 fetch */
export function gmGetText(url: string): Promise<string> {
  if (typeof GM_xmlhttpRequest !== 'function') {
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error(`请求失败 ${res.status}`);
      return res.text();
    });
  }
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      onload: (res) =>
        res.status >= 200 && res.status < 300
          ? resolve(res.responseText)
          : reject(new Error(`请求失败 ${res.status}`)),
      onerror: () => reject(new Error('网络错误')),
      ontimeout: () => reject(new Error('请求超时')),
    });
  });
}
