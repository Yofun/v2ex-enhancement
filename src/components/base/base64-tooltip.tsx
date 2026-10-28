import { useEffect, useRef, useState } from 'react';

import { CMD, eventBus } from '@/core/event-bus';

import { BaseButton } from './base-button';
import styles from './base64-tooltip.module.scss';
import { Icon } from './icon';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function Base64Tooltip() {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showRef = useRef(false);
  const [show, setShowState] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [decodeText, setDecodeText] = useState('');
  const [style, setStyle] = useState({ left: '-100vw', top: '-100vh' });

  const setShow = (value: boolean) => {
    showRef.current = value;
    setShowState(value);
  };

  useEffect(() => {
    let timer = 0;
    const onShowTooltip = ({ text, e }: { text: string; e: MouseEvent }) => {
      timer = window.setTimeout(() => setShow(true));
      setOriginalText(text);
      setDecodeText('');
      setStyle({ left: e.clientX + 'px', top: e.clientY + 20 + 'px' });
    };
    eventBus.on(CMD.SHOW_TOOLTIP, onShowTooltip);

    const onWindowClick = (e: MouseEvent) => {
      const el = tooltipRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node) && showRef.current) {
        setShow(false);
      }
    };
    window.addEventListener('click', onWindowClick, { capture: true });

    // scroll 不冒泡，用捕获监听以兼容 .post-detail 晚于本组件挂载的情况
    const onScroll = (e: Event) => {
      if (showRef.current && (e.target as Element).classList?.contains('post-detail'))
        setShow(false);
    };
    document.addEventListener('scroll', onScroll, { capture: true });

    return () => {
      window.clearTimeout(timer);
      eventBus.offOne(CMD.SHOW_TOOLTIP, onShowTooltip);
      window.removeEventListener('click', onWindowClick, { capture: true });
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(decodeText);
      eventBus.emit(CMD.SHOW_MSG, { type: 'success', text: '复制成功' });
    } else {
      eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '复制失败！浏览器不支持！' });
    }
  };

  const decode = () => {
    try {
      new Blob([base64ToArrayBuffer(originalText)]).text().then((r) => setDecodeText(r));
    } catch {
      eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: 'Base64解码失败！不是标准数据！' });
    }
  };

  return (
    <div
      ref={tooltipRef}
      className={styles.base64Tooltip}
      style={{ ...style, display: show ? undefined : 'none' }}
      onClick={decode}
    >
      {!decodeText ? (
        <>
          {' '}
          Base64解码：{originalText} <Icon icon="system-uicons:translate" />
        </>
      ) : (
        <div>
          <span>{decodeText}</span>
          <BaseButton className={styles.btn} size="small" onClick={copy}>
            点击复制
          </BaseButton>
        </div>
      )}
    </div>
  );
}
