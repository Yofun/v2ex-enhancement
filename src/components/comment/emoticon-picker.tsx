import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { Icon } from '@/components/base/icon';
import { classicsEmoticons, DefaultVal, emojiEmoticons } from '@/core/constants';
import { session } from '@/core/session';

import styles from './emoticon-picker.module.scss';

interface EmoticonPickerProps {
  /** 定位锚点：工具栏上的表情按钮 */
  anchor: HTMLElement | null;
  onPick: (text: string) => void;
  onClose: () => void;
}

const GAP = 8;
const TABS = ['经典', ...emojiEmoticons.map((g) => g.title)];

const emojiSrc = (url: string) => (session.config.replaceImgur ? DefaultVal.imgurProxy + url : url);

export function EmoticonPicker({ anchor, onPick, onClose }: EmoticonPickerProps) {
  const [tab, setTab] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 面板高度固定，所以切换分类不会改变尺寸，位置也就不会跳。
  // 优先朝上展开（编辑器通常贴着底部），上方放不下再朝下，两个方向都钳制在视口内。
  const place = useCallback(() => {
    const el = panelRef.current;
    if (!el || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const { width, height } = el.getBoundingClientRect();
    const left = Math.max(GAP, Math.min(a.left, window.innerWidth - width - GAP));
    const fitsAbove = a.top - height - GAP >= GAP;
    const top = fitsAbove
      ? a.top - height - GAP
      : Math.max(GAP, Math.min(a.bottom + GAP, window.innerHeight - height - GAP));
    setPos({ left, top });
  }, [anchor]);

  useLayoutEffect(place, [place]);

  // 详情弹框内容区是可滚动的，锚点会跟着滚走，所以滚动和缩放都要重新定位
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), place()));
    };
    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('scroll', schedule, true);
    };
  }, [place]);

  // 锚点自身的点击交给它的 onClick 做开关，这里放过，否则会先关再开
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    const onPointerDown = (e: Event) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [anchor, onClose]);

  const pick = (text: string) => {
    onPick(text);
    onClose();
  };

  return createPortal(
    // portal 的事件仍沿 React 树冒泡，这里截断，避免触发 PostEditor 根节点的 onClick
    <div
      ref={panelRef}
      className={styles.picker}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? undefined : 'hidden' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.tabs} role="tablist">
        {TABS.map((title, i) => (
          <button
            key={title}
            type="button"
            role="tab"
            aria-selected={i === tab}
            className={`${styles.tab} ${i === tab ? styles.active : ''}`}
            onClick={() => setTab(i)}
          >
            {title}
          </button>
        ))}
        <button type="button" className={styles.close} aria-label="关闭表情面板" onClick={onClose}>
          <Icon icon="ph:x" />
        </button>
      </div>
      <div className={styles.grid} role="tabpanel">
        {tab === 0
          ? classicsEmoticons.map((item) => (
              <button
                key={item.name}
                type="button"
                className={styles.cell}
                title={item.name}
                aria-label={item.name}
                onClick={() => pick(item.name)}
              >
                <img src={emojiSrc(item.high)} alt="" loading="lazy" referrerPolicy="no-referrer" />
              </button>
            ))
          : emojiEmoticons[tab - 1].list.map((emoji, i) => (
              <button
                key={i}
                type="button"
                className={styles.cell}
                aria-label={emoji}
                onClick={() => pick(emoji)}
              >
                {emoji}
              </button>
            ))}
      </div>
    </div>,
    document.body,
  );
}
