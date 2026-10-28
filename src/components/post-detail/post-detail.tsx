import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { useApp } from '@/app/app-context';
import { BaseLoading } from '@/components/base/base-loading';
import { BaseSelect } from '@/components/base/base-select';
import { Icon } from '@/components/base/icon';
import { Tooltip } from '@/components/base/tooltip';
import { BaseHtmlRender } from '@/components/comment/base-html-render';
import { Comment } from '@/components/comment/comment';
import { Point } from '@/components/comment/point';
import { PostDetailWidthContext } from '@/components/comment/post-detail-width-context';
import { PostEditor } from '@/components/comment/post-editor';
import { SingleComment } from '@/components/comment/single-comment';
import { Toolbar } from '@/components/comment/toolbar';
import { CMD, eventBus } from '@/core/event-bus';
import { session } from '@/core/session';
import { CommentDisplayType, PageType, type Reply } from '@/core/types';
import { functions } from '@/utils/functions';
import { slideToggle } from '@/utils/slide';

import styles from './post-detail.module.scss';
import { useImagePreview } from './use-image-preview';

export interface PostDetailProps {
  modelValue?: boolean;
  loading?: boolean;
  refreshLoading?: boolean;
  displayType?: CommentDisplayType;
  onUpdateModelValue?: (value: boolean) => void;
  onUpdateDisplayType?: (value: CommentDisplayType) => void;
  onRefresh?: () => void;
}

interface TargetUser {
  left: string[];
  right: string;
  rightFloor: number;
}

const NBSP3 = ' \u00a0 ';

const EMPTY_TARGET_USER: TargetUser = { left: [], right: '', rightFloor: -1 };

function isOlderThan(date: string, ms: number): boolean {
  return Date.now() - new Date(date).valueOf() > ms;
}

function isYoungerThan(date: string, ms: number): boolean {
  return Date.now() - new Date(date).valueOf() < ms;
}

function getFilterCallList(show: boolean, text: string, allReplyUsers: string[]): string[] {
  if (!show) return [];
  const list = ['管理员', '所有人'].concat(allReplyUsers);
  if (!text) return list;
  return list.filter((i) => {
    try {
      return i.search(text) > -1;
    } catch {
      return false;
    }
  });
}

// 原模板里的 href="javascript:" + onclick="upVoteTopic(id)" 调用的是 V2EX 页面自己的函数，React 不允许直接写这两个属性
function VoteLink({
  fn,
  postId,
  icon,
}: {
  fn: 'upVoteTopic' | 'downVoteTopic';
  postId: string;
  icon: string;
}) {
  const setup = useCallback(
    (el: HTMLAnchorElement | null) => {
      if (!el) return;
      el.setAttribute('href', 'javascript:');
      el.setAttribute('onclick', `${fn}(${postId});`);
    },
    [fn, postId],
  );
  return (
    <a ref={setup} className="vote">
      <li className={`fa ${icon}`} />
      {icon === 'fa-chevron-up' ? NBSP3 : null}
    </a>
  );
}

export function PostDetail({
  modelValue = false,
  loading = false,
  refreshLoading = false,
  displayType = CommentDisplayType.FloorInFloorNoCallUser,
  onUpdateModelValue,
  onUpdateDisplayType,
  onRefresh,
}: PostDetailProps) {
  const { allReplyUsers, post, tags, isLogin, config, pageType, isNight } = useApp();

  const [isSticky, setIsSticky] = useState(false);
  const [selectCallIndex, setSelectCallIndex] = useState(0);
  const [postDetailWidth, setPostDetailWidth] = useState(0);
  const [showCallList, setShowCallList] = useState(false);
  const [showRelationReply, setShowRelationReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [callStyle, setCallStyle] = useState<CSSProperties>({ top: 0, left: 0 });
  const [targetUser, setTargetUser] = useState<TargetUser>(EMPTY_TARGET_USER);
  const [currentFloor, setCurrentFloor] = useState<string | number>('');

  const detailRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const mainWrapperRef = useRef<HTMLDivElement>(null);
  const replyBoxRef = useRef<HTMLDivElement>(null);
  const topReplyRef = useRef<HTMLDivElement>(null);

  const { modalRef, maskRef, handleMainClick, closePreviewModal } = useImagePreview();

  const isPost = pageType === PageType.Post;
  const isMy = post.member.username === session.user.username;
  const myTags = tags[post.member.username] ?? [];
  const isSpecificArea =
    (pageType === PageType.Node || pageType === PageType.Post) &&
    ['东京', 'World of Warcraft'].includes(post.node.title);
  const canAppend = isMy && isOlderThan(post.createDate, 1000 * 60 * 30);
  const canEditMove = isMy && isYoungerThan(post.createDate, 1000 * 60 * 10);

  const filterCallList = useMemo(
    () => getFilterCallList(showCallList, replyText, allReplyUsers),
    [showCallList, replyText, allReplyUsers],
  );

  const opUsername = post.member?.username;
  const replyList = useMemo<Reply[]>(() => {
    if (
      displayType === CommentDisplayType.FloorInFloor ||
      displayType === CommentDisplayType.FloorInFloorNoCallUser
    ) {
      return post.nestedReplies;
    }
    if (displayType === CommentDisplayType.Like) {
      return (functions.clone(post.nestedReplies) as Reply[]).sort(
        (a, b) => b.thankCount - a.thankCount,
      );
    }
    if (displayType === CommentDisplayType.New) {
      return (functions.clone(post.replyList) as Reply[]).reverse();
    }
    if (displayType === CommentDisplayType.V2exOrigin) return post.replyList;
    if (displayType === CommentDisplayType.FloorInFloorNested) return post.nestedRedundReplies;
    if (displayType === CommentDisplayType.OnlyOp) {
      return post.replyList.filter((v) => v.username === opUsername);
    }
    return [];
  }, [displayType, post.nestedReplies, post.replyList, post.nestedRedundReplies, opUsername]);

  const relationReply = useMemo<Reply[]>(() => {
    if (!targetUser.left.length || !targetUser.right) return [];
    return post.replyList.filter((v) => {
      if (!targetUser.left.concat(targetUser.right).includes(v.username)) return false;
      if (v.floor > targetUser.rightFloor) {
        if (v.replyUsers.includes(targetUser.right)) return true;
        if (v.username === targetUser.right) {
          for (const user of targetUser.left) {
            if (v.replyUsers.includes(user)) return true;
          }
        }
        return false;
      }
      return true;
    });
  }, [targetUser, post.replyList]);

  // watch post.id：清空回复框（由 PostEditor 的 key 完成）并把详情滚回顶部
  const prevPostId = useRef(post.id);
  useEffect(() => {
    if (prevPostId.current === post.id) return;
    prevPostId.current = post.id;
    if (isLogin) {
      requestAnimationFrame(() => detailRef.current?.scrollTo({ top: 0 }));
    }
  }, [post.id, isLogin]);

  // watch modelValue（帖子页内嵌展示时不处理）
  const [prevModelValue, setPrevModelValue] = useState(modelValue);
  if (prevModelValue !== modelValue) {
    setPrevModelValue(modelValue);
    if (!isPost) {
      if (modelValue) {
        setCurrentFloor('');
      } else {
        setIsSticky(false);
        setShowRelationReply(false);
      }
    }
  }
  useEffect(() => {
    if (!isPost && modelValue) {
      const id = requestAnimationFrame(() => mainRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [modelValue, isPost]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPostDetailWidth(mainWrapperRef.current?.getBoundingClientRect().width || 0);
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = mainWrapperRef.current;
    if (!el) return;
    if (config.postWidth) el.style.setProperty('width', config.postWidth, 'important');
    else el.style.removeProperty('width');
  }, [config.postWidth]);

  useEffect(() => {
    const el = replyBoxRef.current;
    if (!isLogin || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.target.toggleAttribute('stuck', entry.intersectionRatio < 1),
      {
        threshold: [1],
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLogin]);

  const setCall = useCallback((name: string) => {
    eventBus.emit(CMD.SET_CALL, name);
    setShowCallList(false);
  }, []);

  useEffect(() => {
    if (!isLogin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!modelValue) return;
      if (!showCallList) return;
      const length = filterCallList.slice(0, 10).length;
      if (e.key === 'Enter') {
        setCall(filterCallList[selectCallIndex]);
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') {
        setSelectCallIndex(selectCallIndex - 1 < 0 ? length - 1 : selectCallIndex - 1);
        e.preventDefault();
      }
      if (e.key === 'ArrowDown') {
        setSelectCallIndex(selectCallIndex + 1 > length - 1 ? 0 : selectCallIndex + 1);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLogin, modelValue, showCallList, filterCallList, selectCallIndex, setCall]);

  useEffect(() => {
    const onShowCall = (val: { show: boolean; text: string; top: number; left: number }) => {
      if (val.show) {
        setShowCallList(true);
        setReplyText(val.text);
        const top = isPost
          ? `${val.top + window.scrollY - 40}px`
          : `${val.top + (detailRef.current?.scrollTop ?? 0) + 15}px`;
        const left = `${val.left - (mainRef.current?.getBoundingClientRect().left ?? 0) + 10}px`;
        setCallStyle({ top, left });
        if (selectCallIndex >= getFilterCallList(true, val.text, allReplyUsers).length) {
          setSelectCallIndex(0);
        }
      } else {
        setReplyText('');
        setShowCallList(false);
        setSelectCallIndex(0);
      }
    };
    eventBus.on(CMD.SHOW_CALL, onShowCall);
    return () => eventBus.offOne(CMD.SHOW_CALL, onShowCall);
  }, [isPost, selectCallIndex, allReplyUsers]);

  useEffect(() => {
    const onRelationReply = (val: TargetUser) => {
      setTargetUser(val);
      setShowRelationReply(true);
    };
    eventBus.on(CMD.RELATION_REPLY, onRelationReply);
    return () => eventBus.offOne(CMD.RELATION_REPLY, onRelationReply);
  }, []);

  const jump = useCallback(
    (target: string | number) => {
      const lastItem = replyList[replyList.length - 1] ?? post.replyList[post.replyList.length - 1];
      const lastFloor = lastItem?.floor ?? 0;
      let floor: number;
      if (target === '') {
        floor = lastFloor;
      } else {
        floor = Number(target);
        if (floor === 0) floor = 1;
        if (floor > lastFloor) floor = lastFloor;
      }
      if (!post.replyList.length) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '没有回复可跳转！' });
        return;
      }
      if (floor > post.replyList.length) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '没有找到对应回复！' });
        return;
      }
      const comments = document.querySelectorAll<HTMLElement>(`.c_${floor}`);
      if (!comments.length) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '没有找到对应回复！' });
        return;
      }
      comments[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      comments.forEach((c) => c.classList.add('ding'));
      setCurrentFloor(floor + 1);
      window.setTimeout(() => comments.forEach((c) => c.classList.remove('ding')), 2000);
    },
    [replyList, post.replyList],
  );

  useEffect(() => {
    eventBus.on(CMD.JUMP, jump);
    return () => eventBus.offOne(CMD.JUMP, jump);
  }, [jump]);

  const close = (from?: 'space' | 'btn') => {
    if (isPost) return;
    if (from === 'space') {
      if (config.closePostDetailBySpace) onUpdateModelValue?.(false);
    } else {
      onUpdateModelValue?.(false);
    }
  };

  const stop = handleMainClick;

  const scrollTop = () => {
    if (isPost) window.scrollTo({ top: 0, behavior: 'smooth' });
    else detailRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBottom = () => {
    setIsSticky(false);
    window.setTimeout(() => {
      if (isPost) {
        window.scrollTo({ top: document.body.scrollHeight - 850, behavior: 'smooth' });
      } else {
        const el = detailRef.current;
        el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    });
  };

  const rootClass = [
    styles.postDetail,
    'post-detail',
    isPost ? styles.isPostPage : '',
    isNight ? styles.isNight : '',
    pageType ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const headerHtml = post.headerTemplate || (post.jsonContent as string | undefined) || '';
  const showReplyHeader = post.replyList.length > 0 || loading;
  const showReplyList = replyList.length > 0 || loading;

  return (
    <PostDetailWidthContext.Provider value={postDetailWidth}>
      <div
        className={rootClass}
        ref={detailRef}
        style={modelValue ? undefined : { display: 'none' }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Esc') close();
        }}
        onClick={() => close('space')}
      >
        <div
          ref={mainRef}
          className={`${styles.main} ${isSpecificArea ? styles.specificArea : ''}`}
          tabIndex={1}
          onClick={stop}
        >
          <div className={styles.mainWrapper} ref={mainWrapperRef}>
            <div className={`${styles.myBox} ${styles.postWrapper} post-wrapper`}>
              <div className="header">
                <div className="fr">
                  <a
                    href={`/member/${post.member.username}`}
                    style={{ width: '73px', height: '73px', display: 'inline-block' }}
                  >
                    {post.member.avatar_large ? (
                      <img
                        src={post.member.avatar_large}
                        className="avatar"
                        style={{ width: '73px', height: '73px' }}
                        alt={post.member.username}
                      />
                    ) : null}
                  </a>
                </div>
                <a href="/">V2EX</a>
                <span className="chevron">{'\u00a0\u00a0›\u00a0\u00a0'}</span>
                <a href={post.node.url}>{post.node.title}</a>
                <div className="sep10" />
                <h1>{post.title}</h1>
                <div id={`topic_${post.id}_votes`} className="votes">
                  <VoteLink fn="upVoteTopic" postId={post.id} icon="fa-chevron-up" />
                  {NBSP3}
                  <VoteLink fn="downVoteTopic" postId={post.id} icon="fa-chevron-down" />
                </div>
                {NBSP3}
                <small className="gray">
                  <a href={`/member/${post.member.username}`}>{post.member.username}</a>
                  {' · '}
                  {post.member.createDate ? (
                    <>
                      <span className={post.member.isNew ? styles.danger : undefined}>
                        {post.member.createDate}
                      </span>
                      {' · '}
                    </>
                  ) : null}
                  {post.createDateAgo ? (
                    <>
                      <span title={post.createDate}>{post.createDateAgo}</span>
                      {' · '}
                    </>
                  ) : null}
                  {` ${post.clickCount} 次点击 `}
                  {isMy ? (
                    <>
                      {'\u00a0\u00a0 '}
                      <a href={`/t/${post.id}/info`}>
                        <li className="fa fa-info-circle" />
                      </a>
                      {'\u00a0\u00a0 '}
                      {canAppend ? (
                        <a href={`/append/topic/${post.id}`} className="op">
                          APPEND
                        </a>
                      ) : null}
                      {canEditMove ? (
                        <>
                          <a href={`/move/topic/${post.id}`} className="op">
                            MOVE
                          </a>
                          {'\u00a0 '}
                          <a href={`/edit/topic/${post.id}`} className="op">
                            EDIT
                          </a>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </small>
                {isLogin && config.openTag ? (
                  <>
                    {myTags.map((tag) => (
                      <span className={styles.myTag} key={tag}>
                        <i className="fa fa-tag" />
                        <span>{tag}</span>
                        <i
                          className={`fa fa-trash-o ${styles.remove}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            eventBus.emit(CMD.REMOVE_TAG, { username: post.member.username, tag });
                          }}
                        />
                      </span>
                    ))}
                    <span
                      className={`${styles.addTag} ago`}
                      title="添加标签"
                      onClick={(e) => {
                        e.stopPropagation();
                        eventBus.emit(CMD.ADD_TAG, post.member.username);
                      }}
                    >
                      +
                    </span>
                  </>
                ) : null}
              </div>
              <BaseHtmlRender html={headerHtml} />
              <Toolbar onReply={() => setIsSticky((v) => !v)}>
                <Point
                  onAddThank={() =>
                    eventBus.emit(CMD.CHANGE_POST_THANK, { id: post.id, type: 'add' })
                  }
                  onRecallThank={() =>
                    eventBus.emit(CMD.CHANGE_POST_THANK, { id: post.id, type: 'recall' })
                  }
                  item={{
                    isThanked: post.isThanked,
                    thankCount: post.thankCount,
                    username: post.username,
                  }}
                  apiUrl={`topic/${post.id}`}
                />
              </Toolbar>
            </div>

            {post.topReplyList.length > 0 && config.showTopReply ? (
              <div className={styles.myBox}>
                <div
                  className={`${styles.myCell} ${styles.flex}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (topReplyRef.current) slideToggle(topReplyRef.current);
                  }}
                >
                  <span>高赞回复</span>
                  <div className={styles.topReply}>
                    <Tooltip title="收起高赞回复">
                      <div className={styles.tool}>
                        <Icon icon="gravity-ui:chevrons-collapse-vertical" />
                      </div>
                    </Tooltip>
                  </div>
                </div>
                <div ref={topReplyRef}>
                  {post.topReplyList.map((item) => (
                    <Comment key={item.floor} type="top" modelValue={item} />
                  ))}
                </div>
              </div>
            ) : null}

            <div className={`${styles.myBox} comment-wrapper`}>
              {showReplyHeader ? (
                <div className={`${styles.myCell} ${styles.flex}`}>
                  <div>
                    {`${post.replyCount} 条回复 `}
                    {post.lastReplyDate ? (
                      <span>
                        {' \u00a0'}
                        <strong className="snow">•</strong>
                        {` \u00a0${post.lastReplyDate}`}
                      </span>
                    ) : null}
                  </div>
                  {config.showToolbar ? (
                    <BaseSelect
                      displayType={displayType}
                      onUpdateDisplayType={onUpdateDisplayType}
                    />
                  ) : (
                    <div className="fr" dangerouslySetInnerHTML={{ __html: post.fr }} />
                  )}
                </div>
              ) : null}
              {showReplyList ? (
                loading ? (
                  <div className={styles.loadingWrapper}>
                    <BaseLoading size="large" />
                  </div>
                ) : (
                  <div className={styles.comments}>
                    {modelValue
                      ? replyList.map((item) => <Comment key={item.floor} modelValue={item} />)
                      : null}
                  </div>
                )
              ) : null}
            </div>
            {!showReplyList ? (
              <div id="no-comments-yet" className={styles.noComments}>
                目前尚无回复
              </div>
            ) : null}
            {isLogin ? (
              <div className={`${styles.myBox} ${isSticky ? styles.sticky : ''}`} ref={replyBoxRef}>
                <div className={`${styles.myCell} ${styles.flex}`}>
                  <span>添加一条新回复</span>
                  <div className="notice-right gray">
                    {isSticky ? (
                      <a
                        style={{ marginRight: '2rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSticky(false);
                        }}
                      >
                        取消回复框停靠
                      </a>
                    ) : null}
                    <a
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollTop();
                      }}
                    >
                      回到顶部
                    </a>
                  </div>
                </div>
                <div className={styles.p1}>
                  <PostEditor
                    key={post.id}
                    onClose={goBottom}
                    useType="reply-post"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSticky(true);
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {showRelationReply ? (
            <div
              className={styles.relationReply}
              onClick={(e) => {
                e.stopPropagation();
                close('space');
              }}
            >
              <div
                className={`${styles.myCell} ${styles.flex}`}
                onClick={(e) => {
                  e.stopPropagation();
                  stop(e);
                }}
              >
                <span className="gray">上下文</span>
                <div className={styles.topReply}>
                  <Icon
                    icon="ic:round-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRelationReply(false);
                    }}
                  />
                </div>
              </div>
              <div
                className={styles.comments}
                onClick={(e) => {
                  e.stopPropagation();
                  stop(e);
                }}
              >
                {relationReply.map((item) => (
                  <SingleComment
                    key={item.floor}
                    isRight={item.username === targetUser.right}
                    comment={item}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {showCallList && filterCallList.length ? (
            <div className={styles.callList} style={callStyle}>
              {filterCallList.map((item, index) => (
                <div
                  key={item}
                  className={`${styles.callItem} ${index === selectCallIndex ? styles.select : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCall(item);
                  }}
                >
                  <a>{item}</a>
                </div>
              ))}
            </div>
          ) : null}

          <div
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              close('btn');
            }}
          >
            <Icon icon="icon-park-outline:close" />
          </div>
          <div
            className={styles.openNewTab}
            onClick={(e) => {
              e.stopPropagation();
              functions.openNewTab(`https://www.v2ex.com/t/${post.id}`, config.newTabOpenActive);
            }}
          >
            <Icon icon="majesticons:open" />
          </div>
          <div
            className={`${styles.refresh} gray`}
            onClick={(e) => {
              e.stopPropagation();
              onRefresh?.();
            }}
          >
            {refreshLoading ? <BaseLoading /> : <Icon icon="material-symbols:refresh" />}
          </div>
          <div
            className={`${styles.scrollTo} gray`}
            onClick={(e) => {
              e.stopPropagation();
              jump(currentFloor);
            }}
          >
            <Icon icon="lucide:move-down" />
            <input
              type="text"
              value={currentFloor}
              onChange={(e) => setCurrentFloor(e.target.value)}
              onClick={stop}
              onKeyDown={(e) => {
                if (e.key === 'Enter') jump(currentFloor);
              }}
            />
          </div>
          <div
            className={`${styles.scrollTop} gray`}
            onClick={(e) => {
              e.stopPropagation();
              scrollTop();
            }}
          >
            <Icon icon="lucide:move-up" />
          </div>
        </div>
        {createPortal(
          <div className={styles.previewModal} ref={modalRef}>
            <div className={styles.mask} ref={maskRef} onClick={closePreviewModal} />
            <Icon className={styles.close} icon="fontisto:close-a" onClick={closePreviewModal} />
          </div>,
          document.body,
        )}
      </div>
    </PostDetailWidthContext.Provider>
  );
}
