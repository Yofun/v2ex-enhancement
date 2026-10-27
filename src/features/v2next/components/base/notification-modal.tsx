import { useEffect, useRef, useState } from 'react';

import { BaseLoading } from './base-loading';
import baseModal from './modal.module.scss';
import styles from './notification-modal.module.scss';
import { useFade } from './use-fade';

type FilterType = 'all' | 'reply' | 'star' | 'collect';

interface NotificationModalProps {
  modelValue?: boolean;
  /** 提醒列表 HTML（V2EX 原生 .cell 节点） */
  list?: string;
  total?: number | string;
  /** 分页 HTML */
  pages?: string;
  loading?: boolean;
  onUpdateModelValue?: (value: boolean) => void;
}

const FILTERS: { type: FilterType; label: string }[] = [
  { type: 'all', label: '全部' },
  { type: 'reply', label: '回复' },
  { type: 'star', label: '感谢' },
  { type: 'collect', label: '收藏' },
];

export function NotificationModal({
  modelValue,
  list,
  total,
  pages,
  loading,
  onUpdateModelValue,
}: NotificationModalProps) {
  const [index, setIndex] = useState<FilterType>('all');
  const notifyWrapRef = useRef<HTMLDivElement>(null);
  const { mounted, className: fade } = useFade(!!modelValue);

  // 对应原 watch（非 immediate）：筛选或列表变化时回到顶部
  const scrollWatchReady = useRef(false);
  useEffect(() => {
    if (!scrollWatchReady.current) {
      scrollWatchReady.current = true;
      return;
    }
    if (notifyWrapRef.current) notifyWrapRef.current.scrollTop = 0;
  }, [index, list]);

  const modelWatchReady = useRef(false);
  useEffect(() => {
    if (!modelWatchReady.current) {
      modelWatchReady.current = true;
      return;
    }
    if (modelValue) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (notifyWrapRef.current) notifyWrapRef.current.scrollTop = 0;
    }
  }, [modelValue]);

  const close = () => onUpdateModelValue?.(false);

  if (!mounted) return null;

  return (
    <div className={`${styles.notificationModal} ${baseModal.modal} ${fade}`}>
      <div
        className={baseModal.mask}
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      />
      <div className={styles.modalRoot}>
        <div className={styles.modalHeader}>
          <div className={`${baseModal.title} ${styles.title}`}> 提醒系统 </div>
          <i className="fa fa-times" onClick={close} />
        </div>
        <div className={styles.modalBody}>
          <div className={styles.filter}>
            {FILTERS.map((f) => (
              <div
                key={f.type}
                className={index === f.type ? styles.active : undefined}
                onClick={() => setIndex(f.type)}
              >
                {f.label}
              </div>
            ))}
          </div>
          <div className={styles.listWrap}>
            <div ref={notifyWrapRef} className={styles.notifyWrap}>
              <div
                id="notifications"
                className={styles[index]}
                dangerouslySetInnerHTML={{ __html: list ?? '' }}
              />
            </div>
            {loading && (
              <div className={styles.loadingWrap}>
                <BaseLoading />
              </div>
            )}
          </div>
          <div className={styles.footer}>
            <div className={styles.pages} dangerouslySetInnerHTML={{ __html: pages ?? '' }} />
            <div className={styles.total}>
              <span>总共收到提醒</span>
              {total}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
