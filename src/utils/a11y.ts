import type { KeyboardEvent } from 'react';

function activateOnKey(e: KeyboardEvent<Element>) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/**
 * 给 div / span / svg 这类非语义元素补上按钮语义：可 Tab 聚焦、可回车或空格触发。
 *
 * 回车/空格是在元素上派发一次真实 click，由它自己的 onClick 处理，
 * 所以键盘与鼠标走的是同一条路径，调用方不用把处理函数再写一遍。
 * data-v2n-click 供 global.scss 统一挂 :focus-visible 轮廓。
 *
 * @param label 纯图标按钮必须给，有可见文字时省略。
 */
export function clickable(label?: string) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    // Icon 默认带 aria-hidden，当它本身就是按钮时要撤掉，否则辅助技术读不到
    'aria-hidden': undefined,
    'data-v2n-click': '',
    onKeyDown: activateOnKey,
  };
}
