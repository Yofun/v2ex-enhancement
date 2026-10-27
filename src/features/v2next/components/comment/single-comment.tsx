import type { ReactNode } from 'react';

import { useApp } from '../../app-context';
import { CMD, eventBus } from '../../event-bus';
import type { Reply } from '../../types';
import { Icon } from '../base/icon';
import { BaseHtmlRender } from './base-html-render';
import common from './common.module.scss';
import styles from './single-comment.module.scss';

interface SingleCommentProps {
  comment: Reply;
  isRight?: boolean;
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

export function SingleComment({ comment, isRight = false }: SingleCommentProps) {
  const { config, isLogin, tags } = useApp();
  const myTags = tags[comment.username] ?? [];

  const jump = () => eventBus.emit(CMD.JUMP, comment.floor);

  const tagList: ReactNode = myTags.map((i) => (
    <span key={i} className={common.myTag}>
      <i className="fa fa-tag" />
      <span>{i}</span>
    </span>
  ));

  const point = comment.thankCount ? (
    <div className={styles.point}>
      {comment.isThanked ? (
        <Icon color="rgb(224,42,42)" icon="icon-park-solid:like" />
      ) : (
        <Icon
          color={comment.thankCount ? 'rgb(224,42,42)' : undefined}
          icon="icon-park-outline:like"
        />
      )}
      <div className={common.linkNum}>{comment.thankCount}</div>
    </div>
  ) : null;

  const opBadge = comment.isOp && <div className={cls(common.owner, styles.owner)}>OP</div>;
  const modBadge = comment.isMod && <div className={cls(common.mod, styles.mod)}>MOD</div>;
  const avatar = (
    <a className={cls('avatar', styles.avatar)} href={`/member/${comment.username}`}>
      <img src={comment.avatar} alt="" />
    </a>
  );

  return (
    <div className={cls(styles.comment, config.viewType === 'simple' && styles.isSimple)}>
      {!isRight && avatar}
      <div className={cls(styles.commentBody, isRight && styles.isRight)}>
        <div className={styles.texts}>
          {isRight && point}
          {isLogin && config.openTag && isRight && tagList}
          {isRight && <span className="ago">{comment.date}</span>}
          {isRight && modBadge}
          {isRight && opBadge}
          <a href={`/member/${comment.username}`} className={cls(common.username, styles.username)}>
            {comment.username}
          </a>
          {!isRight && opBadge}
          {!isRight && modBadge}
          {!isRight && <span className="ago">{comment.date}</span>}
          {isLogin && config.openTag && !isRight && tagList}
          {!isRight && point}
        </div>
        <BaseHtmlRender
          className={cls('reply_content', styles.replyContent)}
          html={comment.reply_content}
        />
      </div>
      {isRight && avatar}
      <div className={styles.authorRight}>
        <div className={cls(common.floor, styles.floor)}>{comment.floor}</div>
        <div
          className={cls(common.tool, styles.jump)}
          onClick={(e) => {
            e.stopPropagation();
            jump();
          }}
        >
          <span>跳转</span>
        </div>
      </div>
    </div>
  );
}
