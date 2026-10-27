import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';

import styles from './base-button.module.scss';
import { BaseLoading } from './base-loading';
import { Tooltip } from './tooltip';

export interface BaseButtonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  keyboard?: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'normal' | 'large';
  type?: 'primary' | 'link' | 'gary';
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}

export function BaseButton({
  keyboard,
  active,
  disabled,
  loading,
  size = 'normal',
  type = 'primary',
  onClick,
  className,
  children,
  ...attrs
}: BaseButtonProps) {
  const classes = [
    styles.baseButton,
    className,
    active && styles.active,
    styles[size],
    styles[type],
    (disabled || loading) && styles.disabled,
    !disabled && 'hvr-grow',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tooltip disabled={!keyboard} title={`快捷键: ${keyboard}`}>
      <div {...attrs} className={classes} onClick={(e) => !disabled && !loading && onClick?.(e)}>
        <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
        {loading && <BaseLoading size="small" className={styles.loading} />}
        {keyboard && (
          <div className={styles.keyNotice}>
            <span className={styles.key}>{keyboard}</span>
          </div>
        )}
      </div>
    </Tooltip>
  );
}
