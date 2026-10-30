import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChangeEvent, DragEvent, KeyboardEvent, MouseEvent } from 'react';

import { useApp } from '@/app/app-context';
import { BaseButton } from '@/components/base/base-button';
import { Icon } from '@/components/base/icon';
import { classicsEmoticons, DefaultVal, emojiEmoticons } from '@/core/constants';
import { CMD, eventBus } from '@/core/event-bus';
import { session } from '@/core/session';
import type { Reply } from '@/core/types';
import { useLatest } from '@/hooks/use-latest';
import { postForText } from '@/services/request';
import { clickable } from '@/utils/a11y';

import styles from './post-editor.module.scss';

interface PostEditorProps {
  replyUser?: string;
  replyFloor?: number;
  useType?: 'reply-comment' | 'reply-post';
  onClose?: () => void;
  className?: string;
  /** 对应原版透传到根节点的 onClick */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

const imgurClientIdPool = [
  '3107b9ef8b316f3',
  '442b04f26eefc8a',
  '59cfebe717c09e4',
  '60605aad4a62882',
  '6c65ab1d3f5452a',
  '83e123737849aa9',
  '9311f6be1c10160',
  'c4a4a563f698595',
  '81be04b9e4a08ce',
];

const none = '<span style="white-space:pre-wrap;"> </span>';

export function PostEditor({
  replyUser,
  replyFloor,
  useType = 'reply-comment',
  onClose,
  className,
  onClick,
}: PostEditorProps) {
  const { post, show, allReplyUsers } = useApp();
  const replyInfo = replyUser ? `@${replyUser} #${replyFloor} ` : '';

  const [content, setContent] = useState(replyInfo);
  const [isFocus, setIsFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isShowEmoticons, setIsShowEmoticons] = useState(false);
  const [emoticonPos, setEmoticonPos] = useState<{ left: number; bottom: number }>();
  const [mounted, setMounted] = useState(false);

  const txtRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef(content);
  const loadingRef = useRef(false);
  const uploadLoadingRef = useRef(false);
  const setCallRef = useRef<((name: string) => void) | null>(null);
  const allReplyUsersRef = useLatest(allReplyUsers);

  const updateContent = (value: string) => {
    contentRef.current = value;
    setContent(value);
  };

  const isDisabled = (value: string) => (value ? value === replyInfo : true);
  const disabled = isDisabled(content);

  // 原版是 computed，依赖 txtRef（挂载后会重算一次）和 content；selectionStart 非响应式
  /* eslint-disable react-hooks/refs */
  const cursorHtml = useMemo(() => {
    const el = txtRef.current;
    if (!el || !content) return '';
    const index = el.selectionStart || 0;
    return content
      .substring(0, index)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
      .replace(/\s/g, none);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, mounted]);
  /* eslint-enable react-hooks/refs */

  const checkHeight2 = () => {
    const el = txtRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  };

  const insert = (str: string) => {
    const el = txtRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const start = contentRef.current.slice(0, cursorPos);
    const end = contentRef.current.slice(cursorPos);
    updateContent(start + str + end);
    const moveCursorPos = start.length + str.length;
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(moveCursorPos, moveCursorPos);
      checkHeight2();
    });
  };

  const upload = async (file?: File | null) => {
    if (!file) return;
    if (uploadLoadingRef.current) return;
    uploadLoadingRef.current = true;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    const clientId = imgurClientIdPool[Math.floor(Math.random() * imgurClientIdPool.length)];
    try {
      const res = await fetch('https://api.imgur.com/3/upload', {
        method: 'POST',
        headers: { Authorization: `Client-ID ${clientId}` },
        body: formData,
      });
      uploadLoadingRef.current = false;
      setUploadLoading(false);
      if (res.ok) {
        const resData = (await res.json()) as { success?: boolean; data: { link: string } };
        if (resData.success) {
          return insert(' ' + resData.data.link + ' ');
        }
      }
    } catch {
      uploadLoadingRef.current = false;
      setUploadLoading(false);
    }
    eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '上传失败' });
  };

  const drop = (e: DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    upload(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    if (isDisabled(contentRef.current) || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const currentContent = contentRef.current;
    const submitContent = currentContent.replace(/\[((?!\[).)+\]/g, (match) => {
      const item = classicsEmoticons.find((v) => v.name === match);
      if (item) return item.low + ' ';
      return match;
    });
    let showContent = currentContent.replace(
      /https?:\/\/(i\.)?imgur\.com\/((?!http).)+\.(gif|png|jpg|jpeg|GIF|PNG|JPG|JPEG)/g,
      (match) =>
        `<img src="${match}" data-originUrl="${match}" data-notice="这个img标签由v2ex-超级增强脚本解析" style="max-width: 100%">`,
    );
    showContent = showContent.replace(/\[((?!\[).)+\]/g, (match) => {
      const item = classicsEmoticons.find((v) => v.name === match);
      if (item) {
        return `<a target="_blank" href="${item.low}" rel="nofollow noopener"><img src="${item.low}" class="embedded_image" rel="noreferrer"></a> `;
      }
      return match;
    });
    const matchUsers = showContent.match(/@([\w]+?[\s])/g);
    if (matchUsers) {
      matchUsers.forEach((i) => {
        const username = i.replace('@', '').replace(' ', '');
        showContent = showContent.replace(
          username,
          `<a href="/member/${username}">${username}</a>`,
        );
      });
    }
    showContent = showContent.replaceAll('\n', '<br/>');

    const replyContent = showContent ?? '';
    const replyUsers = replyUser ? [replyUser] : [];
    const item: Reply = {
      thankCount: 0,
      isThanked: false,
      isOp: post.username === session.user.username,
      isDup: false,
      id: String(Date.now()),
      username: session.user.username,
      avatar: session.user.avatar,
      date: '几秒前',
      floor: post.replyCount + 1,
      reply_content: replyContent,
      reply_text: submitContent,
      children: [],
      replyUsers,
      replyFloor: replyFloor || -1,
      level: useType === 'reply-comment' ? 1 : 0,
      replyCount: 0,
      hideCallUserReplyContent: replyContent,
    };
    if (item.replyUsers.length === 1) {
      item.hideCallUserReplyContent = item.reply_content.replace(
        /@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?(\s#[\d]+)?\s(<br>)?/,
        () => '',
      );
    }

    const url = `${location.origin}/t/${post.id}`;
    try {
      const res = await postForText(url, { content: submitContent, once: post.once });
      loadingRef.current = false;
      setLoading(false);
      if (res.search('你上一条回复的内容和这条相同') > -1) {
        return eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '你上一条回复的内容和这条相同' });
      }
      if (res.search('请不要在每一个回复中都包括外链，这看起来像是在 spamming') > -1) {
        return eventBus.emit(CMD.SHOW_MSG, {
          type: 'error',
          text: '请不要在每一个回复中都包括外链，这看起来像是在 spamming',
        });
      }
      if (res.search('创建新回复') > -1) {
        eventBus.emit(CMD.REFRESH_ONCE, res);
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '回复出现了问题，请使用原版进行回复' });
        const windowWidth = 1200;
        const left = window.document.body.clientWidth / 2 - windowWidth / 2;
        const newWin = window.open(
          '创建新回复',
          '',
          `width=${windowWidth},height=600,left=${left},top=100`,
        );
        if (!newWin) return;
        newWin.document.write(res);
        const loop = setInterval(() => {
          if (newWin.closed) {
            clearInterval(loop);
            eventBus.emit(CMD.REFRESH_POST);
          }
        }, 1000);
        return;
      }
      updateContent(replyInfo);
      onClose?.();
      eventBus.emit(CMD.REFRESH_ONCE, res);
      eventBus.emit(CMD.SHOW_MSG, { type: 'success', text: '回复成功' });
      eventBus.emit(CMD.ADD_REPLY, item);
    } catch (err) {
      console.log('err', err);
      loadingRef.current = false;
      setLoading(false);
      eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '回复失败' });
    }
  };

  const getEmojiSrc = (url: string) =>
    session.config.replaceImgur ? DefaultVal.imgurProxy + url : url;

  const showEmoticons = (e: MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (isShowEmoticons) {
      setIsShowEmoticons(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setEmoticonPos({ left: rect.left + 30, bottom: window.innerHeight - rect.top - 20 });
    setIsShowEmoticons(true);
  };

  const off = () => {
    eventBus.emit(CMD.SHOW_CALL, { show: false });
    eventBus.off(CMD.SET_CALL);
    setCallRef.current = null;
  };

  const showCallPopover = (text: string) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const r = cursor.getBoundingClientRect();
    eventBus.emit(CMD.SHOW_CALL, { show: true, top: r.top, left: r.left, text });
    eventBus.off(CMD.SET_CALL);
    const handler = (name: string) => {
      const el = txtRef.current;
      if (!el) return;
      const current = contentRef.current;
      const cursorPos = el.selectionStart;
      const lastCallPos = current.slice(0, cursorPos).lastIndexOf('@');
      const start = current.slice(0, lastCallPos + 1);
      const end = current.slice(cursorPos);
      if (name === '管理员') {
        name = 'Livid @Kai @Olivia @GordianZ @sparanoid @drymonfidelia @GordianZ @sillydaddy';
      }
      if (name === '所有人') {
        name = allReplyUsersRef.current.map((v, i) => (i ? '@' + v : v)).join(' ');
      }
      updateContent(start + name + ' ' + end);
      const moveCursorPos = start.length + name.length + 1;
      setTimeout(() => {
        el.setSelectionRange(moveCursorPos, moveCursorPos);
        checkHeight2();
      });
      eventBus.off(CMD.SET_CALL);
      setCallRef.current = null;
    };
    setCallRef.current = handler;
    eventBus.on(CMD.SET_CALL, handler as (value?: unknown) => void);
  };

  const handleInput = (data: string | null | undefined) => {
    const el = txtRef.current;
    if (!el) return;
    const cursorPos = el.selectionStart;
    const current = contentRef.current;
    if (!current) return;
    if (data === ' ') {
      return off();
    }
    if (data === '@') {
      if (current.length !== 1) {
        if (current[cursorPos - 2] === ' ' || current[cursorPos - 2] === '\n') {
          return showCallPopover('');
        }
      } else {
        return showCallPopover('');
      }
      off();
    } else {
      checkHeight2();
      const judgeStr = current.slice(0, cursorPos);
      const lastCallPos = judgeStr.lastIndexOf('@');
      if (lastCallPos === -1) {
        return off();
      }
      const callStr = judgeStr.slice(lastCallPos, cursorPos);
      if (callStr.includes(' ')) {
        off();
      } else {
        if (lastCallPos === 0) {
          return showCallPopover(callStr.replace('@', ''));
        }
        if (current.length !== 1) {
          if (current[lastCallPos - 1] === ' ' || current[lastCallPos - 1] === '\n') {
            return showCallPopover(callStr.replace('@', ''));
          }
        } else {
          return showCallPopover(callStr.replace('@', ''));
        }
        off();
      }
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value);
    handleInput((e.nativeEvent as InputEvent).data);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    switch (e.keyCode) {
      case 8:
        if (contentRef.current === '@') off();
        break;
      case 37:
      case 38:
      case 39:
      case 40:
        setTimeout(() => handleInput(''), 100);
        break;
      case 27:
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        break;
      case 13:
        if (e.ctrlKey) submit();
        if (e.metaKey) submit();
        break;
    }
  };

  const pasteHandler = (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []).filter(
      (item) => item.type.indexOf('image') !== -1,
    );
    if (items.length === 0) return;
    upload(items[0].getAsFile());
  };
  const pasteHandlerRef = useLatest(pasteHandler);
  const onPaste = useCallback((e: ClipboardEvent) => pasteHandlerRef.current(e), [pasteHandlerRef]);

  const onBlur = () => {
    document.removeEventListener('paste', onPaste);
    setIsFocus(false);
  };

  const onFocus = () => {
    setIsFocus(true);
    document.addEventListener('paste', onPaste);
  };

  const [prevShow, setPrevShow] = useState(show);
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) setIsShowEmoticons(false);
  }

  useEffect(() => {
    const el = txtRef.current;
    // Vue 的 v-model 以 DOM 属性赋初值，光标落在末尾；React 以子文本渲染，光标在开头，
    // 回复楼层时会把输入写到 “@用户 #楼层 ” 前面
    if (el) el.setSelectionRange(el.value.length, el.value.length);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (el) {
      el.setAttribute('style', 'height:' + el.scrollHeight + 'px;overflow-y:hidden;');
      el.addEventListener('input', checkHeight2);
      if (useType === 'reply-comment') el.focus();
    }
    return () => {
      el?.removeEventListener('input', checkHeight2);
      document.removeEventListener('paste', onPaste);
      if (setCallRef.current) {
        eventBus.offOne(CMD.SET_CALL, setCallRef.current as (value?: unknown) => void);
        eventBus.emit(CMD.SHOW_CALL, { show: false });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrapperClass = [
    styles.wrapper,
    useType === 'reply-post' ? styles.replyPost : styles.replyComment,
    isFocus && styles.isFocus,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const closeEmoticons = (e: MouseEvent) => {
    e.stopPropagation();
    setIsShowEmoticons(false);
  };

  return (
    <div className={wrapperClass} onClick={onClick}>
      <textarea
        className={styles.postEditor}
        ref={txtRef}
        value={content}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="请尽量让自己的回复能够对别人有帮助"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onDrop={drop}
      />
      <div className={styles.getCursor}>
        <span dangerouslySetInnerHTML={{ __html: cursorHtml }} />
        <span className="cursor" ref={cursorRef}>
          |
        </span>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.left}>
          <Icon onClick={showEmoticons} {...clickable('插入表情')} icon="ph:smiley" />
          <div className={styles.upload}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => upload(e.currentTarget.files?.[0])}
            />
            <Icon icon="ph:image" />
          </div>
          {uploadLoading && <span>上传中.....</span>}
        </div>
        <div>
          {useType === 'reply-comment' && (
            <BaseButton
              type="link"
              size="small"
              style={{ marginRight: '1rem', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
            >
              关闭
            </BaseButton>
          )}
          <BaseButton
            size="small"
            disabled={disabled}
            loading={loading}
            onClick={(e) => {
              e.stopPropagation();
              submit();
            }}
          >
            回复
          </BaseButton>
        </div>
      </div>
      <div
        className={styles.emoticonPack}
        style={{ display: isShowEmoticons ? undefined : 'none', ...emoticonPos }}
      >
        <Icon icon="ph:x" onClick={closeEmoticons} {...clickable('关闭表情面板')} />
        <div className="title">经典</div>
        <div className={styles.list}>
          {classicsEmoticons.map((item) => (
            <img
              key={item.name}
              src={getEmojiSrc(item.high)}
              referrerPolicy="no-referrer"
              onClick={(e) => {
                e.stopPropagation();
                insert(item.name);
                setIsShowEmoticons(false);
              }}
            />
          ))}
        </div>
        <div className="emoji">
          {emojiEmoticons.map((item) => (
            <Fragment key={item.title}>
              <div className="title">{item.title}</div>
              <div className={styles.list}>
                {item.list.map((emoji, i) => (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      insert(emoji);
                      setIsShowEmoticons(false);
                    }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
