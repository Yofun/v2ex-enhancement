import { useEffect, useRef } from 'react';

import type { MouseEvent, ReactNode } from 'react';

import { CMD, eventBus } from '@/core/event-bus';

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

  const showPop = (e: MouseEvent<HTMLSpanElement>) => {
    if (disabled) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    idRef.current = Date.now();
    eventBus.emit(CMD.SHOW_CONFIRM_MODAL, { title, rect, id: idRef.current });
    eventBus.offOne(CMD.SHOW_CONFIRM_MODAL_CONFIRM, cbRef.current);
    eventBus.on(CMD.SHOW_CONFIRM_MODAL_CONFIRM, cbRef.current);
  };

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        showPop(e);
      }}
    >
      {children}
    </span>
  );
}
