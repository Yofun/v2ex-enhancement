import { gmAddStyle } from './gm';

/** 存在 GM_addStyle 就用，否则退回 <style> 标签 */
export function injectStyle(css: string): HTMLStyleElement {
  const el = gmAddStyle(css);
  if (el && typeof el === 'object' && 'textContent' in el) return el;
  const style = document.createElement('style');
  style.textContent = css;
  if (!mount(style)) {
    // document-start 时 documentElement 都可能还没建好，等它出现再挂
    const observer = new MutationObserver(() => {
      if (mount(style)) observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  }
  return style;
}

function mount(style: HTMLStyleElement): boolean {
  const parent = document.head ?? document.documentElement;
  if (!parent) return false;
  parent.append(style);
  return true;
}
