import { useCallback, useEffect, useRef, useState } from 'react';

import type { MouseEvent } from 'react';

import { useApp } from '../../app-context';
import { CMD, eventBus } from '../../event-bus';
import styles from './base-html-render.module.scss';
import { useLatest } from './use-latest';

const checkHeight = 900;

interface BaseHtmlRenderProps {
  html?: string;
  /** 对应原版透传到根节点的 class */
  className?: string;
}

export function BaseHtmlRender({ html, className }: BaseHtmlRenderProps) {
  const { config } = useApp();
  const contentRef = useRef<HTMLDivElement>(null);
  const [mask, setMask] = useState(false);
  const handOpenRef = useRef(false);
  const autoCollapseRef = useLatest(config.contentAutoCollapse);
  const [prevAutoCollapse, setPrevAutoCollapse] = useState(config.contentAutoCollapse);
  if (prevAutoCollapse !== config.contentAutoCollapse) {
    setPrevAutoCollapse(config.contentAutoCollapse);
    if (!config.contentAutoCollapse) setMask(false);
  }

  const mouseup = (e: MouseEvent) => {
    if (!config.base64) return;
    const selectionText = window.getSelection()?.toString();
    if (selectionText) {
      const r = selectionText.match(/([A-Za-z0-9+/=]+)/g);
      if (r) {
        if (r[0].length < 4) return;
        eventBus.emit(CMD.SHOW_TOOLTIP, { text: r[0], e: e.nativeEvent });
      }
    }
  };

  const checkContentHeight = useCallback(() => {
    if (handOpenRef.current) return;
    const el = contentRef.current;
    if (!el) return;
    setMask(el.getBoundingClientRect().height >= checkHeight);
  }, []);

  // 原版只在 html 变化（及挂载）时检查，不跟随 contentAutoCollapse 变化
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !html) return;
    if (!autoCollapseRef.current) return;
    const imgs = Array.from(el.querySelectorAll('img'));
    imgs.forEach((img) => {
      img.removeEventListener('load', checkContentHeight);
      img.addEventListener('load', checkContentHeight);
    });
    checkContentHeight();
    return () => imgs.forEach((img) => img.removeEventListener('load', checkContentHeight));
  }, [html, checkContentHeight, autoCollapseRef]);

  if (!html) return null;

  return (
    <div className={[styles.htmlWrapper, className].filter(Boolean).join(' ')}>
      <div className={mask ? styles.mask : undefined}>
        <div ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} onMouseUp={mouseup} />
      </div>
      {mask && (
        <div
          className={styles.expand}
          onClick={() => {
            handOpenRef.current = true;
            setMask(false);
          }}
        >
          展开
        </div>
      )}
    </div>
  );
}
