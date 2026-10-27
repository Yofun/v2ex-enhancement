import { useLayoutEffect, useRef } from 'react';

/** 让异步回调/事件监听读到最新的值（对应 Vue 里读 reactive 的最新值） */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
