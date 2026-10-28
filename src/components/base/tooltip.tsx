import { cloneElement, useLayoutEffect, useRef, useState } from 'react';

import type { MouseEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { useFade } from '@/hooks/use-fade';

import styles from './tooltip.module.scss';

interface TooltipProps {
  title?: string;
  disabled?: boolean;
  /** 唯一子元素，会被注入 onClick / onMouseEnter / onMouseLeave */
  children: ReactElement;
}

interface ChildHandlers {
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
}

export function Tooltip({ title = '', disabled = false, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const visible = show && !!title;
  const { mounted, className } = useFade(visible);

  const showPop = (e: MouseEvent<HTMLElement>) => {
    if (disabled) return;
    if (!title) return;
    e.stopPropagation();
    setRect((e.target as HTMLElement).getBoundingClientRect());
    setShow(true);
  };

  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!visible || !el || !rect) return;
    const tip = el.getBoundingClientRect();
    if (rect.top < 50) {
      el.style.top = rect.top + rect.height + 10 + 'px';
    } else {
      el.style.top = rect.top - tip.height - 10 + 'px';
    }
    el.style.left = rect.left - (tip.width - rect.width) / 2 + 'px';
  }, [visible, mounted, rect]);

  const child = children as ReactElement<ChildHandlers>;
  const own = child.props;

  return (
    <>
      {mounted &&
        title &&
        createPortal(
          <div ref={tipRef} className={`${styles.tip} ${className}`}>
            {title}
          </div>,
          document.body,
        )}
      {cloneElement(child, {
        onClick: (e) => {
          own.onClick?.(e);
          setShow(false);
        },
        onMouseEnter: (e) => {
          own.onMouseEnter?.(e);
          showPop(e);
        },
        onMouseLeave: (e) => {
          own.onMouseLeave?.(e);
          setShow(false);
        },
      })}
    </>
  );
}
