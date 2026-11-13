import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { CMD, eventBus } from '@/core/event-bus';
import { useFade } from '@/hooks/use-fade';
import { parse } from '@/parsers';
import { clickable } from '@/utils/a11y';
import { functions } from '@/utils/functions';

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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const inputId = `${uid}-tag`;
  const errorId = `${uid}-error`;
  const { mounted, className: fade } = useFade(show);

  useEffect(() => {
    const onAddTag = (username?: string) => {
      setCurrentUsername(username ?? '');
      setError('');
      setShow(true);
      setFocusCount((n) => n + 1);
    };
    eventBus.on(CMD.ADD_TAG, onAddTag);
    return () => eventBus.offOne(CMD.ADD_TAG, onAddTag);
  }, []);

  useLayoutEffect(() => {
    if (focusCount > 0 && mounted) inputRef.current?.focus();
  }, [focusCount, mounted]);

  const close = () => {
    setShow(false);
    setTag('');
    setError('');
  };

  async function addTag() {
    if (saving) return;
    const value = tag.trim();
    if (!value) {
      setError('请输入标签');
      return;
    }
    const next = functions.clone(tags);
    const userTags: string[] = next[currentUsername] ?? [];
    if (userTags.includes(value)) {
      setError('标签已存在');
      return;
    }
    next[currentUsername] = [...userTags, value];
    // 保存失败要把错误留在表单里，所以等保存结果再关弹框，不再先更新界面
    setSaving(true);
    const ok = await parse
      .saveTags(next)
      .catch(() => false)
      .finally(() => setSaving(false));
    if (!ok) {
      setError('保存失败，请稍后重试');
      return;
    }
    onUpdateTags?.(next);
    close();
  }

  if (!mounted) return null;

  const existing = tags[currentUsername] ?? [];

  return (
    <div className={`${styles.tagModal} ${baseModal.modal} ${fade}`}>
      <div
        className={baseModal.mask}
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      />
      <div className={styles.wrapper} role="dialog" aria-modal="true" aria-label="添加标签">
        <div className={styles.header}>
          <span className={styles.title}>添加标签</span>
        </div>
        <div className={styles.body}>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.label}>用户</span>
              <div className={styles.value}>{currentUsername}</div>
            </div>
            <div className={styles.row}>
              <label className={styles.label} htmlFor={inputId}>
                标签<span className={styles.required}>必填</span>
              </label>
              <div className={styles.field}>
                <input
                  id={inputId}
                  type="text"
                  ref={inputRef}
                  className={`${styles.input} ${error ? styles.invalid : ''}`}
                  placeholder="输入标签，按回车确认"
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                  value={tag}
                  onChange={(e) => {
                    setTag(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTag();
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      close();
                    }
                  }}
                />
                {error && (
                  <div id={errorId} className={styles.error} role="alert">
                    {error}
                  </div>
                )}
              </div>
            </div>
            {existing.length > 0 && (
              <div className={styles.row}>
                <span className={styles.label}>已有标签</span>
                <div className={styles.chips}>
                  {existing.map((t) => (
                    <span key={t} className={styles.chip}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={styles.footer}>
          <div
            className={styles.btn}
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            {...clickable()}
          >
            取消
          </div>
          <div
            className={`${styles.btn} ${styles.primary} ${saving ? styles.disabled : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              addTag();
            }}
            {...clickable()}
          >
            确定
          </div>
        </div>
      </div>
    </div>
  );
}
