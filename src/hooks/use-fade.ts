import { useEffect, useState } from 'react';

import styles from '@/components/base/fade.module.scss';

const FADE_DURATION = 300;

/**
 * 等效 Vue <Transition>（name 为默认 v / fade）：进入时先以隐藏态挂载再淡入，离开时先淡出再卸载。
 *
 * 不在渲染期 setState：嵌套使用时渲染期更新会丢失 mounted，弹窗不出现。
 */
export function useFade(visible: boolean) {
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(visible);

  useEffect(() => {
    if (visible) {
      // 隐藏态至少绘制一帧，transition 才会生效；mounted 在回调里置位，供之后离开时保留淡出
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          setMounted(true);
          setShown(true);
        });
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
      setShown(false);
    }, FADE_DURATION);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return {
    // visible 变为 true 的同一次渲染就挂载，不等 effect
    mounted: visible || mounted,
    className: shown && visible ? styles.fade : `${styles.fade} ${styles.hidden}`,
  };
}
