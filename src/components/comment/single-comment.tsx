import type { ReactNode } from 'react';

import { useApp } from '@/app/app-context';
import { Icon } from '@/components/base/icon';
import { CMD, eventBus } from '@/core/event-bus';
import type { Reply } from '@/core/types';
import { clickable } from '@/utils/a11y';

import { BaseHtmlRender } from './base-html-render';
import common from './common.module.scss';
import styles from './single-comment.module.scss';

interface SingleCommentProps {
  comment: Reply;
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export function SingleComment({ comment }: SingleCommentProps) {
  const { config, isLogin, tags } = useApp();
  const myTags = tags[comment.username] ?? [];

  const jump = () => eventBus.emit(CMD.JUMP, comment.floor);

  const tagList: ReactNode = myTags.map((i) => (
    <span key={i} className={common.myTag}>
      <Icon icon="ph:tag" />
      <span>{i}</span>
    </span>
  ));

  const point = comment.thankCount ? (
    <div className={styles.point}>
      {comment.isThanked ? (
        <Icon color="var(--v2n-danger)" icon="ph:heart-fill" />
      ) : (
        <Icon color={comment.thankCount ? 'var(--v2n-danger)' : undefined} icon="ph:heart" />
      )}
      <div className={common.linkNum}>{comment.thankCount}</div>
    </div>
  ) : null;

  const opBadge = comment.isOp && <div className={common.owner}>OP</div>;
  const modBadge = comment.isMod && <div className={common.mod}>MOD</div>;
  const avatar = (
    <a className={cls('avatar', styles.avatar)} href={`/member/${comment.username}`}>
      <img src={comment.avatar} alt={comment.username} />
    </a>
  );

  return (
    <div className={cls(styles.comment, config.viewType === 'simple' && styles.isSimple)}>
      {avatar}
      <div className={styles.commentBody}>
        <div className={styles.texts}>
          <a href={`/member/${comment.username}`} className={common.username}>
            {comment.username}
          </a>
          {opBadge}
          {modBadge}
          <span className="ago">{comment.date}</span>
          {isLogin && config.openTag && tagList}
          {point}
        </div>
        <BaseHtmlRender
          className={cls('reply_content', styles.replyContent)}
          html={comment.reply_content}
        />
      </div>
      <div className={styles.authorRight}>
        <div className={cls(common.floor, styles.floor)}>{comment.floor}</div>
        <div
          className={cls(common.tool, styles.jump)}
          onClick={(e) => {
            e.stopPropagation();
            jump();
          }}
          {...clickable(`跳转到 #${comment.floor}`)}
        >
          <span>跳转</span>
        </div>
      </div>
    </div>
  );
}
