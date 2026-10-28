import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { CMD, eventBus } from '@/core/event-bus';
import { useFade } from '@/hooks/use-fade';
import { parse } from '@/parsers';
import { functions } from '@/utils/functions';

import { BaseButton } from './base-button';
import baseModal from './modal.module.scss';
import styles from './tag-modal.module.scss';

interface TagModalProps {
  tags: Record<string, string[]>;
  onUpdateTags?: (tags: Record<string, string[]>) => void;
}

export function TagModal({ tags, onUpdateTags }: TagModalProps) {
  const [show, setShow] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [tag, setTag] = useState('');
  const [focusCount, setFocusCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mounted, className: fade } = useFade(show);

  useEffect(() => {
    const onAddTag = (username?: string) => {
      setCurrentUsername(username ?? '');
      setShow(true);
      setFocusCount((n) => n + 1);
    };
    eventBus.on(CMD.ADD_TAG, onAddTag);
    return () => eventBus.offOne(CMD.ADD_TAG, onAddTag);
  }, []);

  useLayoutEffect(() => {
    if (focusCount > 0 && mounted) inputRef.current?.focus();
  }, [focusCount, mounted]);

  async function addTag() {
    if (!tag) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '请输入标签' });
      return;
    }
    const oldTag = functions.clone(tags);
    const tempTag = functions.clone(tags);
    const userTags: string[] = tempTag[currentUsername] ?? [];
    if (userTags.some((v) => v === tag)) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '标签已存在！' });
      return;
    }
    userTags.push(tag);
    tempTag[currentUsername] = userTags;
    onUpdateTags?.(tempTag);
    setTag('');
    setShow(false);
    const res = await parse.saveTags(tempTag);
    if (!res) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '标签添加失败！' });
      onUpdateTags?.(oldTag);
    }
  }

  if (!mounted) return null;

  return (
    <div className={`${styles.tagModal} ${baseModal.modal} ${fade}`}>
      <div
        className={baseModal.mask}
        onClick={(e) => {
          e.stopPropagation();
          setShow(false);
        }}
      />
      <div className={styles.wrapper}>
        <div className={`${baseModal.title} ${styles.title}`}> 添加标签 </div>
        <div className={baseModal.option}>
          <span>用户：</span>
          <div>
            <b>{currentUsername}</b>
          </div>
        </div>
        <input
          type="text"
          ref={inputRef}
          className={styles.input}
          style={{ width: '100%' }}
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTag();
          }}
        />
        <div className={styles.btns}>
          <BaseButton
            type="link"
            onClick={(e) => {
              e.stopPropagation();
              setShow(false);
              setTag('');
            }}
          >
            取消
          </BaseButton>
          <BaseButton
            onClick={(e) => {
              e.stopPropagation();
              addTag();
            }}
          >
            确定
          </BaseButton>
        </div>
      </div>
    </div>
  );
}
