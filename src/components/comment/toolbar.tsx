import { useState } from 'react';

import type { ReactNode } from 'react';

import { useApp } from '@/app/app-context';
import { BaseLoading } from '@/components/base/base-loading';
import { Icon } from '@/components/base/icon';
import { CMD, eventBus } from '@/core/event-bus';
import { session } from '@/core/session';
import { PageType } from '@/core/types';
import { useLatest } from '@/hooks/use-latest';
import { clickable } from '@/utils/a11y';

import common from './common.module.scss';
import styles from './toolbar.module.scss';

interface ToolbarProps {
  /** 对应原版默认插槽，渲染在最前面（如点赞 Point） */
  children?: ReactNode;
  onReply?: () => void;
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export function Toolbar({ children, onReply }: ToolbarProps) {
  const { isLogin, post, pageType } = useApp();
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [loading3, setLoading3] = useState(false);

  // 原版在 await 之后读取的是响应式的最新 post
  const postRef = useLatest(post);

  const checkIsLogin = (callback?: () => void) => {
    if (!isLogin) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '请先登录！' });
      return false;
    }
    callback?.();
    return true;
  };

  const tweet = () => {
    const username = session.user?.username ?? '';
    const url = `https://twitter.com/intent/tweet?url=${location.origin}/t/${post.id}?r=${username}&related=v2ex&text=${post.title}`;
    window.open(url, '_blank', 'width=550,height=370');
  };

  const report = async () => {
    if (!checkIsLogin()) return;
    if (loading3) return;
    const isReport = post.isReport;
    if (isReport) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'success', text: '你已对本主题进行了报告' });
      return;
    }
    const url = `${location.origin}/report/topic/${post.id}?once=${post.once}`;
    setLoading3(true);
    let apiRes: Response;
    try {
      apiRes = await fetch(url);
    } finally {
      setLoading3(false);
    }
    if (apiRes.redirected) {
      const htmlText = await apiRes.text();
      // 原版语义：search 返回 -1 时同样为真，因此只要发生重定向就视为成功
      if (htmlText.search('你已对本主题进行了报告')) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'success', text: '你已对本主题进行了报告' });
        eventBus.emit(CMD.REFRESH_ONCE, htmlText);
        eventBus.emit(CMD.MERGE, { isReport: !isReport });
        return;
      }
    }
    eventBus.emit(CMD.REFRESH_ONCE);
    eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '操作失败，请重试' });
  };

  const toggleIgnore = async () => {
    if (!checkIsLogin()) return;
    const url = `${location.origin}/${post.isIgnore ? 'unignore' : 'ignore'}/topic/${post.id}?once=${post.once}`;
    if (pageType === PageType.Post) {
      setLoading2(true);
      try {
        const apiRes = await fetch(url);
        const isIgnore = postRef.current.isIgnore;
        if (apiRes.redirected) {
          if (!isIgnore) {
            window.location.href = location.origin;
          }
          eventBus.emit(CMD.SHOW_MSG, {
            type: 'success',
            text: isIgnore ? '取消成功' : '忽略成功',
          });
          eventBus.emit(CMD.MERGE, { isIgnore: !isIgnore });
        } else {
          eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '忽略失败' });
        }
      } finally {
        setLoading2(false);
      }
    } else {
      if (post.isIgnore) {
        setLoading2(true);
      } else {
        eventBus.emit(CMD.IGNORE);
      }
      try {
        const apiRes = await fetch(url);
        const isIgnore = postRef.current.isIgnore;
        if (apiRes.redirected) {
          if (isIgnore) {
            eventBus.emit(CMD.REFRESH_ONCE);
          }
          eventBus.emit(CMD.SHOW_MSG, {
            type: 'success',
            text: isIgnore ? '取消成功' : '忽略成功',
          });
          eventBus.emit(CMD.MERGE, { isIgnore: !isIgnore });
        } else {
          eventBus.emit(CMD.SHOW_MSG, {
            type: 'warning',
            text: '忽略成功,仅本次有效（接口调用失败！）',
          });
        }
      } finally {
        setLoading2(false);
      }
    }
  };

  const toggleFavorite = async () => {
    if (!checkIsLogin()) return;
    if (loading) return;
    const isFavorite = post.isFavorite;
    if (!isFavorite && session.config.collectBrowserNotice) {
      eventBus.emit(CMD.SHOW_MSG, {
        type: 'success',
        text: '别忘记按Command/Cmd/CTRL + D添加到书签哦',
      });
    }
    const url = `${location.origin}/${isFavorite ? 'unfavorite' : 'favorite'}/topic/${post.id}?once=${post.once}`;
    setLoading(true);
    let apiRes: Response;
    try {
      apiRes = await fetch(url);
    } finally {
      setLoading(false);
    }
    if (apiRes.redirected) {
      const htmlText = await apiRes.text();
      // 原版语义：search 返回 -1 时同样为真
      if (htmlText.search(isFavorite ? '加入收藏' : '取消收藏')) {
        const { collectCount } = postRef.current;
        eventBus.emit(CMD.SHOW_MSG, {
          type: 'success',
          text: isFavorite ? '取消成功' : '收藏成功',
        });
        eventBus.emit(CMD.MERGE, {
          collectCount: isFavorite ? collectCount - 1 : collectCount + 1,
        });
        eventBus.emit(CMD.REFRESH_ONCE, htmlText);
        eventBus.emit(CMD.MERGE, { isFavorite: !isFavorite });
        return;
      }
    }
    eventBus.emit(CMD.REFRESH_ONCE);
    eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '操作失败' });
  };

  return (
    <div className={styles.toolbar}>
      {children}
      <div
        className={common.tool}
        onClick={(e) => {
          e.stopPropagation();
          checkIsLogin(onReply);
        }}
        {...clickable()}
      >
        <Icon icon="mynaui:message" />
        <span>回复</span>
      </div>
      <div
        className={cls(common.tool, loading && common.disabled)}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite();
        }}
        {...clickable()}
      >
        {loading ? (
          <BaseLoading size="small" />
        ) : post.isFavorite ? (
          <Icon color="var(--v2n-danger)" icon="iconoir:star-solid" />
        ) : (
          <Icon icon="iconoir:star" />
        )}
        <span>{(post.isFavorite ? '取消' : '') + '收藏'}</span>
      </div>
      {post.collectCount !== 0 && (
        <div className={cls(common.tool, common.noHover)}>
          <span>{post.collectCount + '人收藏'}</span>
        </div>
      )}
      <div
        className={common.tool}
        onClick={(e) => {
          e.stopPropagation();
          tweet();
        }}
        {...clickable()}
      >
        <Icon icon="uil:share" />
        <span>Tweet</span>
      </div>
      <div
        className={cls(common.tool, loading2 && common.disabled)}
        onClick={(e) => {
          e.stopPropagation();
          toggleIgnore();
        }}
        {...clickable()}
      >
        {loading2 ? <BaseLoading size="small" /> : <Icon icon="fluent:eye-hide-24-regular" />}
        <span>{post.isIgnore ? '取消忽略' : '忽略'}</span>
      </div>
      <div
        className={cls(common.tool, loading3 && common.disabled)}
        onClick={(e) => {
          e.stopPropagation();
          report();
        }}
        title={post.isReport ? '你已对本主题进行了报告' : undefined}
        {...clickable()}
      >
        {loading3 ? <BaseLoading size="small" /> : <Icon icon="solar:danger-triangle-outline" />}
        <span>{post.isReport ? '已报告' : '报告'}</span>
      </div>
    </div>
  );
}
