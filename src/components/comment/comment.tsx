import { useEffect, useRef, useState } from 'react';

import type { CSSProperties } from 'react';

import { useApp } from '@/app/app-context';
import { Icon } from '@/components/base/icon';
import { DefaultVal } from '@/core/constants';
import { CMD, eventBus } from '@/core/event-bus';
import type { Reply } from '@/core/types';
import { CommentDisplayType } from '@/core/types';
import { postForText } from '@/services/request';

import { Author } from './author';
import { BaseHtmlRender } from './base-html-render';
import styles from './comment.module.scss';
import { usePostDetailWidth } from './post-detail-width-context';
import { PostEditor } from './post-editor';
import { TopSubComment } from './top-sub-comment';

interface CommentProps {
  modelValue: Reply;
  type?: 'list' | 'top';
}

export function Comment({ modelValue, type = 'list' }: CommentProps) {
  const { post, show, config } = useApp();
  const postDetailWidth = usePostDetailWidth();

  const [edit, setEdit] = useState(false);
  const [expand, setExpand] = useState(true);
  const [expandTopReply, setExpandTopReply] = useState(true);
  const [expandWrong, setExpandWrong] = useState(false);
  const [cssStyle, setCssStyle] = useState<CSSProperties | null>(null);

  const commentRef = useRef<HTMLDivElement>(null);
  const floor = modelValue.floor;

  const [prevShow, setPrevShow] = useState(show);
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) setEdit(false);
  }

  // 对应原版 mounted + watch postDetailWidth
  useEffect(() => {
    if (postDetailWidth === 0) return;
    const el = commentRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ban = postDetailWidth * 0.6;
    if (ban < rect.width && rect.width < ban + 25 && modelValue.children.length) {
      setExpand(false);
      const padding = 2;
      setCssStyle({
        padding: '1rem 0',
        width: `calc(${postDetailWidth}px - ${padding}rem)`,
        transform: `translateX(calc(${rect.width - postDetailWidth}px + ${padding}rem))`,
        background: 'var(--color-second-bg)',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postDetailWidth]);

  const hide = () => {
    const url = `${location.origin}/ignore/reply/${modelValue.id}?once=${post.once}`;
    eventBus.emit(CMD.REMOVE, modelValue.floor);
    postForText(url).then(
      () => {
        eventBus.emit(CMD.REFRESH_ONCE);
        eventBus.emit(CMD.SHOW_MSG, { type: 'success', text: '隐藏成功' });
      },
      () => {
        eventBus.emit(CMD.SHOW_MSG, {
          type: 'warning',
          text: '隐藏成功,仅本次有效（接口调用失败！）',
        });
      },
    );
  };

  const toggleExpand = () => setExpand((v) => !v);

  const className = [
    styles.comment,
    modelValue.isOp && 'isOp',
    config.viewType === 'simple' && styles.isSimple,
    (type === 'top' ? true : modelValue.level === 0) && styles.isLevelOne,
    type !== 'top' && 'c_' + floor,
  ]
    .filter(Boolean)
    .join(' ');

  const hideCallUser =
    [CommentDisplayType.Like, CommentDisplayType.FloorInFloorNoCallUser].includes(
      config.commentDisplayType,
    ) && type !== 'top';

  return (
    <div className={className} ref={commentRef} data-floor={floor}>
      <Author
        modelValue={expand}
        onUpdateModelValue={setExpand}
        comment={modelValue}
        onReply={() => setEdit((v) => !v)}
        type={type}
        onHide={hide}
      />
      {cssStyle && !expand && (
        <div className="more ago" onClick={toggleExpand}>
          由于嵌套回复层级太深，自动将后续回复隐藏
        </div>
      )}
      {expand && (
        <div className={styles.commentContentW} style={cssStyle ?? undefined}>
          {cssStyle && (
            <div className={`more ago ${styles.more}`} onClick={toggleExpand}>
              由于嵌套回复层级太深，自动将以下回复移至可见范围
            </div>
          )}
          <div className={styles.commentContent}>
            <div className={styles.expandLine} onClick={toggleExpand} />
            <div className={styles.right}>
              <div className={styles.w}>
                {modelValue.isWrong && (
                  <div className={styles.wrongWrapper}>
                    <span onClick={() => setExpandWrong((v) => !v)} title="点击楼层号查看提示">
                      <a href={'/member/' + modelValue.replyUsers[0]}>
                        {'@' + modelValue.replyUsers[0] + '\u00a0\u00a0'}
                      </a>
                      <span className={styles.delLine}>{'#' + modelValue.replyFloor}</span>
                      <i
                        className={`fa fa-question-circle-o ${styles.wrongIcon}`}
                        aria-hidden="true"
                      />
                    </span>
                    {expandWrong && (
                      <div className={styles.warning}>
                        这条回复似乎有点问题，指定的楼层号与@的人对应不上
                        <br />
                        原因可能有下面几种：
                        <br />
                        一、屏蔽用户导致楼层塌陷：你屏蔽了A，自A以后的回复的楼层号都会减1
                        <br />
                        二、忽略回复导致楼层塌陷：原理同上
                        <br />
                        三、层主回复时指定错了楼层号（同一，层主屏蔽了别人，导致楼层塌陷）
                        <br />
                        四、脚本解析错误，请在{' '}
                        <a href={DefaultVal.issue} target="_blank">
                          这里
                        </a>
                        反馈
                      </div>
                    )}
                  </div>
                )}
                <BaseHtmlRender
                  className="reply_content"
                  html={
                    hideCallUser ? modelValue.hideCallUserReplyContent : modelValue.reply_content
                  }
                />
                {edit && (
                  <PostEditor
                    className={styles.editor}
                    onClose={() => setEdit(false)}
                    replyUser={modelValue.username}
                    replyFloor={modelValue.floor}
                  />
                )}
                {type === 'top' && modelValue.replyCount > 0 && (
                  <div className={styles.replyCount} onClick={() => setExpandTopReply((v) => !v)}>
                    <div className={styles.gang} />
                    <span> 共有{modelValue.replyCount} 条回复 </span>
                    <Icon icon={expandTopReply ? 'ep:arrow-up-bold' : 'ep:arrow-down-bold'} />
                  </div>
                )}
              </div>
              <div className={styles.simpleWrapper}>
                {type === 'top'
                  ? expandTopReply &&
                    modelValue.replyCount > 0 && (
                      <div className={styles.topReplyWrap}>
                        {modelValue.children.map((item, index) => (
                          <TopSubComment key={index} level={1} modelValue={item} />
                        ))}
                      </div>
                    )
                  : modelValue.children.map((item, index) => (
                      <Comment key={index} modelValue={item} />
                    ))}
              </div>
            </div>
          </div>
          {cssStyle && (
            <div className={`more ago ${styles.more}`} onClick={toggleExpand}>
              由于嵌套回复层级太深，自动将以上回复移至可见范围
            </div>
          )}
        </div>
      )}
    </div>
  );
}
