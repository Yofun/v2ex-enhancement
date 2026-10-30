import { useState } from 'react';

import { CommentDisplayType } from '@/core/types';

import styles from './base-select.module.scss';
import { Icon } from './icon';

interface BaseSelectProps {
  displayType: CommentDisplayType;
  onUpdateDisplayType?: (value: CommentDisplayType) => void;
}

const isNewOrLike = (type: CommentDisplayType | null | undefined) =>
  type === CommentDisplayType.New || type === CommentDisplayType.Like;

const OPTIONS: { type: CommentDisplayType; label: string }[] = [
  { type: CommentDisplayType.FloorInFloorNoCallUser, label: '楼中楼' },
  { type: CommentDisplayType.FloorInFloor, label: '楼中楼(@)' },
  { type: CommentDisplayType.FloorInFloorNested, label: '冗余楼中楼' },
  { type: CommentDisplayType.OnlyOp, label: '只看楼主' },
  { type: CommentDisplayType.V2exOrigin, label: 'V2原版' },
];

export function BaseSelect({ displayType, onUpdateDisplayType }: BaseSelectProps) {
  const [showChangeDisplayType, setShowChangeDisplayType] = useState(false);
  const [lastDisplayType, setLastDisplayType] = useState<CommentDisplayType | null>(null);

  const changeOption = (item: CommentDisplayType) => {
    if (!isNewOrLike(displayType)) {
      setLastDisplayType(displayType);
    }
    onUpdateDisplayType?.(item);
    setShowChangeDisplayType(false);
  };

  const clickDisplayType = () => {
    if (isNewOrLike(displayType)) {
      return changeOption(lastDisplayType ?? CommentDisplayType.FloorInFloorNoCallUser);
    }
    setShowChangeDisplayType(!showChangeDisplayType);
  };

  const judge = isNewOrLike(displayType) ? lastDisplayType : displayType;
  const currentDisplayType = OPTIONS.find((o) => o.type === judge)?.label ?? '楼中楼';

  return (
    <div className={styles.displayType}>
      <div
        className={`${styles.type} ${displayType === CommentDisplayType.New ? styles.active : ''}`}
        onClick={() => changeOption(CommentDisplayType.New)}
      >
        最新{' '}
      </div>
      <div
        className={`${styles.type} ${displayType === CommentDisplayType.Like ? styles.active : ''}`}
        onClick={() => changeOption(CommentDisplayType.Like)}
      >
        最热{' '}
      </div>
      <div style={{ position: 'relative' }}>
        <div
          className={`${styles.type} ${!isNewOrLike(displayType) ? styles.active : ''}`}
          onClick={clickDisplayType}
        >
          <span>{currentDisplayType}</span>
          <Icon icon="ph:caret-down" />
        </div>
        {showChangeDisplayType && (
          <div className={styles.typeList}>
            {OPTIONS.map((o) => (
              <div
                key={o.type}
                className={`${styles.item} ${displayType === o.type ? styles.active : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  changeOption(o.type);
                }}
              >
                {o.label}{' '}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
