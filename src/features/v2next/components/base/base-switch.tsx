import styles from './base-switch.module.scss';

interface BaseSwitchProps {
  modelValue?: boolean;
  onUpdateModelValue?: (value: boolean) => void;
}

export function BaseSwitch({ modelValue, onUpdateModelValue }: BaseSwitchProps) {
  return (
    <div
      className={modelValue ? `${styles.switch} ${styles.active}` : styles.switch}
      onClick={() => onUpdateModelValue?.(!modelValue)}
    />
  );
}
