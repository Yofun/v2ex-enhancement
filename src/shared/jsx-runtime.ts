import { createElement, Fragment } from 'react';

import type { ElementType, Key, ReactElement } from 'react';

// 油猴脚本里 React 来自 UMD 全局，不含 react/jsx-runtime；用 createElement 提供等价实现
export { Fragment };

interface JsxProps {
  children?: unknown;
  [prop: string]: unknown;
}

export function jsx(type: ElementType, props: JsxProps, key?: Key): ReactElement {
  const { children, ...rest } = props;
  const finalProps = key === undefined ? rest : { ...rest, key };
  const childList = children === undefined ? [] : Array.isArray(children) ? children : [children];
  return createElement(type, finalProps, ...childList);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
