import { gmAddStyle } from './gm';

/** 存在 GM_addStyle 就用，否则退回 <style> 标签 */
export function injectStyle(css: string): HTMLStyleElement {
  const el = gmAddStyle(css);
  if (el && typeof el === 'object' && 'textContent' in el) return el;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head ?? document.documentElement).append(style);
  return style;
}
