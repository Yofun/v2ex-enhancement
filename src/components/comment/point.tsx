import { useApp } from '@/app/app-context';
import { Icon } from '@/components/base/icon';
import { PopConfirm } from '@/components/base/pop-confirm';
import { CMD, eventBus } from '@/core/event-bus';
import { session } from '@/core/session';
import { postForJson } from '@/services/request';

import common from './common.module.scss';

export interface PointItem {
  username: string;
  isThanked?: boolean;
  thankCount?: number;
}

interface PointProps {
  item: PointItem;
  /** 形如 "reply/123"、"topic/123" */
  apiUrl: string;
  onAddThank?: () => void;
  onRecallThank?: () => void;
  /** 对应原版的 v-show：隐藏但保留在 DOM 中 */
  hidden?: boolean;
}

interface ThankResponse {
  success: boolean;
  message?: string;
  once?: string;
}

export function Point({ item, apiUrl, onAddThank, onRecallThank, hidden = false }: PointProps) {
  const { post, isLogin } = useApp();
  const disabled = item.username === session.user.username || !!item.isThanked || !isLogin;

  const thankError = () => {
    if (!isLogin) {
      return eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '请先登录！' });
    }
    if (item.username === session.user.username) {
      return eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '不能感谢自己' });
    }
    if (item.isThanked) {
      return eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '已经感谢过了' });
    }
  };

  const thank = () => {
    onAddThank?.();
    const url = `${location.origin}/thank/${apiUrl}?once=${post.once}`;
    postForJson<ThankResponse>(url).then(
      (res) => {
        if (!res.success) {
          onRecallThank?.();
          eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: res.message });
        }
        eventBus.emit(CMD.REFRESH_ONCE, res.once);
      },
      () => {
        onRecallThank?.();
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '感谢失败' });
        eventBus.emit(CMD.REFRESH_ONCE);
      },
    );
  };

  return (
    <span style={{ display: hidden ? 'none' : 'contents' }}>
      <PopConfirm
        disabled={disabled}
        title={`确认花费 10 个铜币向 @${item.username} 的这条回复发送感谢？`}
        onConfirm={thank}
      >
        <div
          className={[common.tool, disabled && common.disabled].filter(Boolean).join(' ')}
          onClick={thankError}
        >
          {item.isThanked ? (
            <Icon color="var(--v2n-danger)" icon="ph:heart-fill" />
          ) : (
            <Icon color={item.thankCount ? 'var(--v2n-danger)' : undefined} icon="ph:heart" />
          )}
          {item.thankCount ? (
            <span className={common.linkNum}>{item.thankCount}</span>
          ) : (
            <span>感谢</span>
          )}
        </div>
      </PopConfirm>
    </span>
  );
}
