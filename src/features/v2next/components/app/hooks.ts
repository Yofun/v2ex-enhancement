import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/**
 * useState + 同步可读的 ref：事件总线 / document 监听等"异步回调"里需要像 Vue 那样
 * 立即读到刚写入的值，同时仍然走 React 的渲染。setter 只在回调里调用，不要在渲染期调用。
 */
export function useSyncState<T>(
  initial: T | (() => T),
): [T, (next: T | ((prev: T) => T)) => void, MutableRefObject<T>] {
  const [state, setState] = useState(initial);
  const ref = useRef(state);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next;
    ref.current = value;
    setState(value);
  }, []);
  return [state, set, ref];
}

/** 始终指向最新一次渲染的值，供长生命周期的监听器使用 */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** 等价于 Vue watch（非 immediate）：首次渲染不触发 */
export function useUpdateEffect(effect: () => void | (() => void), deps: unknown[]): void {
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
