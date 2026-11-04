import { useEffect, useId, useRef } from 'react';

import { createPortal } from 'react-dom';

import { Icon } from '@/components/base/icon';
import { SingleComment } from '@/components/comment/single-comment';
import type { Reply } from '@/core/types';

import styles from './context-modal.module.scss';

interface ContextModalProps {
  /** 要展示的对话，按楼层升序 */
  replies: Reply[];
  /** 被查看上下文的那个人，他的回复排在右侧 */
  rightUser: string;
  onClose: () => void;
}

export function ContextModal({ replies, rightUser, onClose }: ContextModalProps) {
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 焦点放进可滚动区域，方向键 / 空格才能直接滚这里而不是滚背后的详情
    bodyRef.current?.focus();
    // 捕获阶段拦截 Esc：只关上下文，不要连带把下面的主题详情也关掉
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return createPortal(
    // portal 的事件仍沿 React 树冒泡，到 PostDetail 根节点会触发“点空白处关闭详情”，这里截断
    <div className={styles.root} onClick={(e) => e.stopPropagation()}>
      <div className={styles.mask} onClick={onClose} />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.header}>
          <span id={titleId} className={styles.title}>
            上下文
          </span>
          <span className={styles.count}>{replies.length} 条</span>
          <button type="button" className={styles.close} aria-label="关闭" onClick={onClose}>
            <Icon icon="ph:x" />
          </button>
        </div>
        <div ref={bodyRef} className={styles.body} tabIndex={-1}>
          {replies.map((item) => (
            <SingleComment key={item.floor} isRight={item.username === rightUser} comment={item} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
