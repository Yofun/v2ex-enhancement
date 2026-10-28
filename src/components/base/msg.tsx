import { useEffect, useRef } from 'react';

import { Icon } from './icon';
import styles from './msg.module.scss';

interface MsgProps {
  type?: string;
  text?: string;
  onClose?: () => void;
}

export function Msg({ type, text, onClose }: MsgProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => onCloseRef.current?.(), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.msg} ${type ? (styles[type] ?? '') : ''}`}>
      <div className={styles.left} onClick={() => onClose?.()}>
        <Icon icon="ic:round-close" />
      </div>
      <div className={styles.right}>{text}</div>
    </div>
  );
}
