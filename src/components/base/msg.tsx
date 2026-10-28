import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from './icon';
import styles from './msg.module.scss';

interface MsgProps {
  type?: string;
  text?: string;
  onClose?: () => void;
}

const DURATION = 3000;
const LEAVE_DURATION = 260;

export function Msg({ type, text, onClose }: MsgProps) {
  const [leaving, setLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const timerRef = useRef(0);
  const startRef = useRef(0);
  const remainRef = useRef(DURATION);

  const leave = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setLeaving(true);
    timerRef.current = window.setTimeout(() => onCloseRef.current?.(), LEAVE_DURATION);
  }, []);

  const start = useCallback(() => {
    startRef.current = Date.now();
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(leave, remainRef.current);
  }, [leave]);

  // 鼠标悬停时暂停倒计时，移开后用剩余时间继续
  const pause = () => {
    if (leaving) return;
    window.clearTimeout(timerRef.current);
    remainRef.current = Math.max(600, remainRef.current - (Date.now() - startRef.current));
  };

  useEffect(() => {
    start();
    return () => window.clearTimeout(timerRef.current);
  }, [start]);

  return (
    <div
      className={`${styles.msg} ${type ? (styles[type] ?? '') : ''} ${leaving ? styles.leaving : ''}`}
      onMouseEnter={pause}
      onMouseLeave={() => !leaving && start()}
    >
      <span className={styles.dot} />
      <div className={styles.text}>{text}</div>
      <Icon className={styles.close} icon="ic:round-close" onClick={leave} />
    </div>
  );
}
