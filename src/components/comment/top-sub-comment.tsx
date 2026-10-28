import { useState } from 'react';

import { useApp } from '@/app/app-context';
import type { Reply } from '@/core/types';

import { Author } from './author';
import { BaseHtmlRender } from './base-html-render';
import { PostEditor } from './post-editor';
import styles from './top-sub-comment.module.scss';

interface TopSubCommentProps {
  modelValue: Reply;
  level?: number;
}

export function TopSubComment({ modelValue, level = -1 }: TopSubCommentProps) {
  const { show } = useApp();
  const [expand, setExpand] = useState(true);
  const [edit, setEdit] = useState(false);

  const [prevShow, setPrevShow] = useState(show);
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) setEdit(false);
  }

  return (
    <div
      className={[styles.topSubComment, level === 1 && styles.topSubReply]
        .filter(Boolean)
        .join(' ')}
      data-floor={modelValue.floor}
    >
      <div className={styles.expandLine} />
      <div className={styles.right}>
        <Author
          modelValue={expand}
          onUpdateModelValue={setExpand}
          comment={modelValue}
          onReply={() => setEdit((v) => !v)}
          type="top"
        />
        <BaseHtmlRender
          className="top-reply_content reply_content"
          html={modelValue.hideCallUserReplyContent}
        />
        {edit && (
          <PostEditor
            onClose={() => setEdit(false)}
            replyUser={modelValue.username}
            replyFloor={modelValue.floor}
          />
        )}
        <div className="simple-wrapper">
          {modelValue.children.map((item, index) => (
            <TopSubComment key={index} modelValue={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
