import { useLayoutEffect, useRef } from 'react';

import type { MutableRefObject } from 'react';

/** 始终指向最新一次渲染的值，供异步回调、长生命周期的监听器读取 */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
