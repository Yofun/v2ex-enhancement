import type { MouseEvent } from 'react';

import { useApp } from '@/app/app-context';
import { AddTagButton } from '@/components/base/add-tag-button';
import { Icon } from '@/components/base/icon';
import { PopConfirm } from '@/components/base/pop-confirm';
import { CMD, eventBus } from '@/core/event-bus';
import type { Reply } from '@/core/types';
import { clickable } from '@/utils/a11y';

import styles from './author.module.scss';
import common from './common.module.scss';
import { Point } from './point';

interface AuthorProps {
  /** true 表示展开（对应原版 v-model） */
  modelValue: boolean;
  onUpdateModelValue?: (value: boolean) => void;
  comment: Reply;
  type?: 'list' | 'top';
  onReply?: () => void;
  onHide?: () => void;
}

const stop = (fn: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  fn();
};

export function Author({
  modelValue,
  onUpdateModelValue,
  comment,
  type = 'list',
  onReply,
  onHide,
}: AuthorProps) {
  const { isLogin, tags, config, isNight } = useApp();
  const myTags = tags[comment.username] ?? [];
  const pointInfo = {
    isThanked: comment.isThanked,
    thankCount: comment.thankCount,
    username: comment.username,
  };

  const jump = () => eventBus.emit(CMD.JUMP, comment.floor);

  const removeTag = (tag: string) =>
    eventBus.emit(CMD.REMOVE_TAG, { username: comment.username, tag });

  const checkIsLogin = (callback?: () => void) => {
    if (!isLogin) {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '请先登录！' });
      return false;
    }
    callback?.();
    return true;
  };

  const addThank = () => eventBus.emit(CMD.CHANGE_COMMENT_THANK, { id: comment.id, type: 'add' });
  const recallThank = () =>
    eventBus.emit(CMD.CHANGE_COMMENT_THANK, { id: comment.id, type: 'recall' });

  const pointApiUrl = 'reply/' + comment.id;

  return (
    <div className={[styles.author, !modelValue && styles.expand].filter(Boolean).join(' ')}>
      <div className={styles.authorLeft}>
        {!modelValue && (
          <Icon
            onClick={stop(() => onUpdateModelValue?.(true))}
            {...clickable('展开这条回复')}
            color="var(--color-active)"
            className={styles.expandIcon}
            icon="ph:arrows-out-simple"
          />
        )}
        {config.viewType !== 'simple' && (
          <a className={`avatar ${styles.avatar}`} href={`/member/${comment.username}`}>
            <img src={comment.avatar} alt={comment.username} />
          </a>
        )}
        <span className={styles.texts}>
          <strong>
            <a
              href={`/member/${comment.username}`}
              className={[common.username, styles.username, isNight && 'dark']
                .filter(Boolean)
                .join(' ')}
            >
              {comment.username}
            </a>
          </strong>
          {comment.isOp && <div className={`${common.owner} ${styles.owner}`}>OP</div>}
          {comment.isDup && <div className={styles.dup}>DUP</div>}
          {comment.isMod && <div className={`${common.mod} ${styles.mod}`}>MOD</div>}
          <span className="ago">{comment.date}</span>
          {isLogin && config.openTag && (
            <>
              {myTags.map((i) => (
                <span key={i} className={common.myTag}>
                  <Icon icon="ph:tag" />
                  <span>{i}</span>
                  <Icon
                    icon="ph:trash"
                    className={common.remove}
                    onClick={stop(() => removeTag(i))}
                    {...clickable(`删除标签 ${i}`)}
                  />
                </span>
              ))}
              <AddTagButton
                username={comment.username}
                className={`${common.addTag} ${styles.addTag}`}
              />
            </>
          )}
        </span>
      </div>
      <div className={styles.authorRight}>
        {isLogin && (
          <div className={styles.toolbar}>
            <PopConfirm title="确认隐藏这条回复?" onConfirm={() => onHide?.()}>
              <div className={common.tool}>
                <Icon icon="ph:eye-slash" />
                <span>隐藏</span>
              </div>
            </PopConfirm>
            {type === 'top' && (
              <div className={common.tool} onClick={stop(jump)} {...clickable()}>
                <Icon icon="ph:arrow-line-down" />
                <span>跳转</span>
              </div>
            )}
            <div
              className={common.tool}
              onClick={stop(() => checkIsLogin(onReply))}
              {...clickable()}
            >
              <Icon icon="ph:chat-circle" />
              <span>回复</span>
            </div>
            <Point
              item={pointInfo}
              onAddThank={addThank}
              onRecallThank={recallThank}
              apiUrl={pointApiUrl}
              hidden={!!comment.thankCount}
            />
          </div>
        )}
        <Point
          item={pointInfo}
          onAddThank={addThank}
          onRecallThank={recallThank}
          apiUrl={pointApiUrl}
          hidden={!comment.thankCount}
        />
        <div className={common.floor}>{comment.floor}</div>
      </div>
    </div>
  );
}
