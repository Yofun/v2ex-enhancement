import { useFade } from '@/hooks/use-fade';

import { BaseButton } from './base-button';
import { Icon } from './icon';
import baseModal from './modal.module.scss';
import styles from './notice-modal.module.scss';

interface NoticeModalProps {
  show?: boolean;
  onUpdateShow?: (value: boolean) => void;
  onConfirm?: () => void;
}

export function NoticeModal({ show = false, onUpdateShow, onConfirm }: NoticeModalProps) {
  const { mounted, className: fade } = useFade(show);

  const close = () => onUpdateShow?.(false);
  const confirm = () => {
    close();
    onConfirm?.();
  };

  if (!mounted) return null;

  return (
    <div className={`${styles.settingModal} ${baseModal.modal} ${fade}`}>
      <div className={baseModal.mask} onClick={close} />
      <div className={styles.modalRoot}>
        <div className={styles.modalHeader}>
          <div className={`${baseModal.title} ${styles.title}`}> 使用需知 </div>
          <Icon icon="ic:round-close" onClick={close} />
        </div>
        <div className={styles.body}>
          <div className={styles.modalContent}>
            <div>开启此功能会带来以下影响</div>
            <div>缺点</div>
            <div style={{ color: 'red' }}>
              <div>1、你的IP可能会被封禁</div>
              <div>2、消耗更多流量，给服务器带来更大的负担</div>
              <div>3、你的V站浏览进度条会变快</div>
            </div>
            <div>优点</div>
            <div>1、卡片模式，无需打开主题即可查看内容</div>
            <div>2、打开主题时提前预览正文内容，无需等待加载</div>
            <div>原理</div>
            <div>1、解析列表所有主题ID，批量调用show.json接口，获取对应主题的正文</div>
            <div>2、请求的主题数据会缓存到本地，不会重复请求，超过3天的数据会删除</div>
            <div>3、前面4条会并发请求，4条以后的一秒请求一条</div>
          </div>
          <div className={styles.btns}>
            <BaseButton type="link" onClick={close}>
              不同意
            </BaseButton>
            <BaseButton onClick={confirm}>同意</BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
}
