import { useEffect, useRef } from 'react';

import type { ReactNode } from 'react';

import { CMD, eventBus } from '@/core/event-bus';
import { clickable } from '@/utils/a11y';

interface PopConfirmProps {
  title?: string;
  disabled?: boolean;
  onConfirm?: () => void;
  children?: ReactNode;
}

export function PopConfirm({ title = '', disabled = false, onConfirm, children }: PopConfirmProps) {
  const idRef = useRef<number | ''>('');
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  });

  const cbRef = useRef((id: number) => {
    if (id === idRef.current) {
      onConfirmRef.current?.();
      idRef.current = '';
    }
  });

  useEffect(() => {
    const cb = cbRef.current;
    return () => eventBus.offOne(CMD.SHOW_CONFIRM_MODAL_CONFIRM, cb);
  }, []);

  const showPop = (anchor: Element) => {
    if (disabled) return;
    const rect = anchor.getBoundingClientRect();
    idRef.current = Date.now();
    eventBus.emit(CMD.SHOW_CONFIRM_MODAL, { title, rect, id: idRef.current });
    eventBus.offOne(CMD.SHOW_CONFIRM_MODAL_CONFIRM, cbRef.current);
    eventBus.on(CMD.SHOW_CONFIRM_MODAL_CONFIRM, cbRef.current);
  };

  return (
    <span
      {...clickable()}
      onClick={(e) => {
        e.stopPropagation();
        showPop(e.target as Element);
      }}
    >
      {children}
    </span>
  );
}
