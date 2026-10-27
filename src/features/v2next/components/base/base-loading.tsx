import styles from './base-loading.module.scss';

interface BaseLoadingProps {
  size?: 'small' | 'normal' | 'large';
  /** 额外 class，供父组件覆盖定位（对应原版 scoped 样式里 .base-button .loading） */
  className?: string;
}

export function BaseLoading({ size = 'normal', className }: BaseLoadingProps) {
  return <div className={[styles.loading, styles[size], className].filter(Boolean).join(' ')} />;
}
