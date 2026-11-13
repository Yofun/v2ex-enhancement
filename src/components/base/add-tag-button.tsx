import { CMD, eventBus } from '@/core/event-bus';
import { clickable } from '@/utils/a11y';

import styles from './add-tag-button.module.scss';
import { Icon } from './icon';

interface AddTagButtonProps {
  username: string;
  /** 调用方用它决定显示时机和定位（如悬停才显示），按钮自己只管外观 */
  className?: string;
}

export function AddTagButton({ username, className }: AddTagButtonProps) {
  return (
    <span
      className={[styles.btn, className].filter(Boolean).join(' ')}
      title="添加标签"
      onClick={(e) => {
        e.stopPropagation();
        eventBus.emit(CMD.ADD_TAG, username);
      }}
      {...clickable()}
    >
      <Icon icon="ph:plus" />
      <span>添加标签</span>
    </span>
  );
}
