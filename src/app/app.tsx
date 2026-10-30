import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import dayjs from 'dayjs';
import { createPortal } from 'react-dom';

import { BaseButton } from '@/components/base/base-button';
import { BaseLoading } from '@/components/base/base-loading';
import { Base64Tooltip } from '@/components/base/base64-tooltip';
import { MsgModal } from '@/components/base/msg-modal';
import { NotificationModal } from '@/components/base/notification-modal';
import { TagModal } from '@/components/base/tag-modal';
import { PostDetail } from '@/components/post-detail/post-detail';
import { Setting } from '@/components/setting/setting';
import { DefaultVal, getDefaultPost } from '@/core/constants';
import { CMD, eventBus } from '@/core/event-bus';
import { type HostMessage, setHostHandler } from '@/core/host-bus';
import { session } from '@/core/session';
import { type Config, PageType, type Post } from '@/core/types';
import { useSyncState, useUpdateEffect } from '@/hooks/state';
import { useFade } from '@/hooks/use-fade';
import { useLatest } from '@/hooks/use-latest';
import { parse } from '@/parsers';
import { applyDynamicStyle } from '@/styles/dynamic-style';
import { decodeEmail } from '@/utils/decode-email';
import { genDomFromHtmlString } from '@/utils/dom';
import { functions } from '@/utils/functions';
import { gmPostJson } from '@/utils/gm';

import styles from './app.module.scss';
import { AppContext, type AppContextValue } from './app-context';
import { Calendar, type CalendarState } from './calendar';
import { HOME_THEME_KEY } from './early';
import { type HotItem, renderHotList } from './hot-list';
import { deleteNotification, fetchNotificationPage, replaceNoticeEntry } from './notifications';

interface NotificationModalState {
  show: boolean;
  loading: boolean;
  list: string;
  total: number | string;
  pages: string;
}

interface PopConfirmState {
  show: boolean;
  title: string;
  id: string;
  top: number;
  left: number;
}

type CommentThankEvent = { id: string; type: 'add' | 'recall' };

const isDeadline = dayjs().isAfter(dayjs('2024-11-26'));

function setFirstBoxesDisplay(display: '' | 'none'): void {
  Array.from(document.querySelectorAll<HTMLElement>('#Wrapper #Main .box'))
    .slice(0, 3)
    .forEach((box) => {
      box.style.display = display;
    });
}

function createCalendarState(): CalendarState {
  return { show: false, year: '', month: '', dayCount: 0, firstDayWeek: 0, select: '' };
}

export function App() {
  const [loading, setLoading] = useState(session.pageType === PageType.Post);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [isLogin] = useState(!!session.user.username);
  const [pageType] = useState(session.pageType);
  const [isNight] = useState(session.isNight);
  const [stopMe, setStopMe, stopMeRef] = useSyncState(session.stopMe);
  const [show, setShow, showRef] = useSyncState(false);
  const [current, setCurrent, currentRef] = useSyncState<Post>(() => getDefaultPost());
  const [config, setConfig, configRef] = useSyncState<Config>(() =>
    functions.clone(session.config),
  );
  const [tags, setTags, tagsRef] = useSyncState<Record<string, string[]>>(() => session.user.tags);
  const [configModalShow, setConfigModalShow] = useState(false);
  const [notificationModal, setNotificationModal] = useState<NotificationModalState>({
    show: false,
    loading: false,
    list: '',
    total: 0,
    pages: '',
  });
  const [popConfirm, setPopConfirm] = useState<PopConfirmState>({
    show: false,
    title: '',
    id: '',
    top: 0,
    left: 0,
  });
  const [pageNumber, setPageNumber] = useState<number | string>(0);
  const [calendar, setCalendar, calendarRef] = useSyncState<CalendarState>(createCalendarState);
  const [calendarHost] = useState(() => document.querySelector('#Rightbar > .sep20'));

  // 非渲染数据：已打开过的主题缓存、通知轮询定时器、标题闪烁定时器、原始标题
  const listRef = useRef<Post[]>([]);
  const noticeTimerRef = useRef<number>();
  const glimmerTimerRef = useRef<number>();
  const titleRef = useRef('');

  const isPost = pageType === PageType.Post;
  const isMember = pageType === PageType.Member;
  const targetUserTags = tags[session.targetUserName] ?? [];

  const allReplyUsers = useMemo(
    () => Array.from(new Set(current.replyList?.map((v) => v.username) ?? [])),
    [current.replyList],
  );

  const showConfig = useCallback(() => setConfigModalShow(true), []);

  const updateConfig = useCallback<AppContextValue['setConfig']>(
    (updater) => {
      setConfig((prev) =>
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater },
      );
    },
    [setConfig],
  );

  const contextValue = useMemo<AppContextValue>(
    () => ({
      isLogin,
      isNight,
      pageType,
      tags,
      show,
      post: current,
      config,
      allReplyUsers,
      showConfig,
      setConfig: updateConfig,
      setTags,
    }),
    [
      isLogin,
      isNight,
      pageType,
      tags,
      show,
      current,
      config,
      allReplyUsers,
      showConfig,
      updateConfig,
      setTags,
    ],
  );

  /** 重新生成楼中楼等派生列表，并同步缓存（原 regenerateReplyList） */
  const regenerateReplyList = (post: Post) => {
    const next: Post = { ...post };
    if (next.replyList.length) {
      functions.createList(next, next.replyList);
    } else {
      next.replyCount = 0;
      next.nestedReplies = [];
      next.nestedRedundReplies = [];
    }
    const list = listRef.current;
    if (list.length) {
      const rIndex = list.findIndex((i) => i.id === next.id);
      if (rIndex > -1) list[rIndex] = functions.clone(next);
    }
    setCurrent(next);
  };

  const showPost = () => {
    setShow(true);
    setFirstBoxesDisplay('none');
  };

  const resetTitle = () => {
    const r = document.title.match(/\s?\(\d+\)\s?/);
    titleRef.current = r && r.length ? document.title.replace(r[0], '') : document.title;
  };

  const getUnreadNoticeText = (body: ParentNode) =>
    Array.from(body.querySelectorAll('a[href="/notifications"]'))
      .map((el) => el.textContent ?? '')
      .join('');

  const getNotice = async (body?: ParentNode) => {
    let root = body;
    if (!root) {
      const res = await fetch('/t');
      if (res.status !== 200) return;
      root = genDomFromHtmlString(await res.text());
    }
    if (!root.querySelector('a[href="/notifications"]')) return;
    resetTitle();
    const text = getUnreadNoticeText(root);
    if (text !== '0 未读提醒') {
      setPageNumber(text.replace(' 未读提醒', ''));
      const notice = configRef.current.notice;
      if (notice.text !== text) {
        replaceNoticeEntry(
          `<div><div class="orange-dot"></div><strong><a href="/notifications">${text}</a></strong></div>`,
        );
        setConfig((prev) => ({ ...prev, notice: { ...prev.notice, text } }));
        if (notice.ddWebhook) {
          const n = new Date();
          const pad = (v: number) => (v < 10 ? '0' + v : String(v));
          gmPostJson(notice.ddWebhook, {
            msgtype: 'text',
            text: {
              content:
                text +
                `，时间：${n.getFullYear()}/${n.getMonth() + 1}/${n.getDate()} ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`,
            },
          });
        }
      }
    } else {
      replaceNoticeEntry(`<a href="/notifications">${text}</a>`);
      setConfig((prev) => ({ ...prev, notice: { ...prev.notice, text: '' } }));
    }
  };

  const getPostDetail = async (post: Post) => {
    const url = `${location.origin}/t/${post.id}`;
    const base: Post = { ...post, url };
    setCurrent(base);
    setShow(true);
    let apiPromise: Promise<void> | undefined;
    if (base.replyList.length) {
      setRefreshLoading(true);
    } else {
      setLoading(true);
      apiPromise = functions.getPostDetailByApi(base.id).then((d2) => {
        if (!d2) return;
        const next: Post = {
          ...currentRef.current,
          ...d2,
          id: String(d2.id),
          replyCount: d2.replies,
        };
        if (next.replyCount > session.config.maxReplyCountLimit) {
          setCurrent(next);
          functions.openNewTab(`${location.origin}/t/${next.id}?p=1&script=1`, true);
          eventBus.emit(CMD.SHOW_MSG, {
            type: 'warning',
            text: '由于回复数量较多，已为您单独打开此主题',
          });
          setLoading(false);
          setShow(false);
          return;
        }
        next.jsonContent = `
            <div class="cell">
              <div class="topic_content">
                <div class="markdown_body">
                 ${d2.content_rendered ?? ''}
                </div>
              </div>
            </div>`;
        setCurrent(next);
      });
    }
    const stopLoading = () => {
      setRefreshLoading(false);
      setLoading(false);
    };
    try {
      const apiRes = await fetch(url + '?p=1');
      if (apiRes.status === 404) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '主题未找到' });
        return stopLoading();
      }
      if (apiRes.status === 403) {
        stopLoading();
        setShow(false);
        functions.openNewTab(`${location.origin}/t/${post.id}?p=1&script=0`, true);
        return;
      }
      if (apiRes.redirected) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '没有权限' });
        return stopLoading();
      }
      const htmlText = await apiRes.text();
      if (htmlText.search('你要查看的页面需要先登录') > -1) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '你要查看的页面需要先登录' });
        return stopLoading();
      }
      const body = genDomFromHtmlString(htmlText);
      decodeEmail(body);
      // parse 会改写传入的主题，先等 API 结果合并完，再基于最新的主题解析
      await apiPromise;
      const res = await parse.getPostDetail(functions.clone(currentRef.current), body, htmlText);
      setCurrent(res);
      const list = listRef.current;
      const index = list.findIndex((v) => v.id == res.id);
      if (index > -1) list[index] = functions.clone(res);
      else list.push(functions.clone(res));
      stopLoading();
      const withOp = await parse.parseOp(functions.clone(res));
      setCurrent((prev) => ({ ...prev, member: withOp.member }));
    } catch (e) {
      console.error('[v2ex-enhancement] 获取主题详情失败', e);
      stopLoading();
    }
  };

  const clickPost = (e: Event, id: string, href: string, title: string | undefined = '') => {
    if (!id) return;
    if (configRef.current.clickPostItemOpenDetail) {
      functions.stopEvent(e);
      const cached = listRef.current.find((v) => v.id == id);
      const postItem: Post = cached ? { ...cached } : getDefaultPost();
      if (!postItem.title) postItem.title = title ?? '加载中';
      postItem.id = id;
      postItem.href = href;
      void getPostDetail(postItem);
      return;
    }
    if (configRef.current.newTabOpen) {
      functions.stopEvent(e);
      functions.openNewTab(`https://www.v2ex.com/t/${id}?p=1`, configRef.current.newTabOpenActive);
    }
  };

  const getMonthDayInfo = (num: number) => {
    setCalendar((prev) => {
      let now = dayjs().year(Number(prev.year)).month(Number(prev.month));
      now = num > 0 ? now.add(1, 'month') : now.subtract(1, 'month');
      return {
        ...prev,
        year: now.year(),
        month: now.month(),
        dayCount: now.daysInMonth(),
        firstDayWeek: now.startOf('month').day(),
      };
    });
  };

  const toggleCalendar = () => {
    const sep = document.querySelector<HTMLElement>('#Rightbar > .sep20');
    if (calendarRef.current.show) {
      if (sep) sep.style.height = 'var(--component-margin)';
      setCalendar((prev) => ({ ...prev, show: false }));
    } else {
      if (sep) sep.style.height = 'unset';
      const now = dayjs();
      setCalendar({
        show: true,
        year: now.year(),
        month: now.month(),
        dayCount: now.daysInMonth(),
        firstDayWeek: now.startOf('month').day(),
        select: `${now.year()}-${now.month() + 1}-${now.date()}`,
      });
    }
  };

  const loadHotList = (day: string) => {
    fetch(DefaultVal.hotUrl + day + '.json')
      .then(async (r) => {
        renderHotList((await r.json()) as HotItem[]);
      })
      .catch(() => {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '暂无点击日期的最热数据！' });
      });
  };

  const openNotificationModal = (href: string) => {
    setNotificationModal((prev) => ({ ...prev, loading: true, show: true }));
    fetchNotificationPage(href)
      .then((res) => {
        setNotificationModal((prev) => ({
          ...prev,
          list: res.list,
          total: res.total ?? prev.total,
          pages: res.pages,
          loading: false,
        }));
      })
      .catch(() => {
        setNotificationModal((prev) => ({ ...prev, loading: false }));
      });
  };

  /** 对应原 $(document).on('click', 'a', clickA) */
  const clickA = (e: MouseEvent, a: HTMLAnchorElement) => {
    if (a.getAttribute('script')) return;
    if (stopMeRef.current) return;
    const { pageType: targetType } = functions.checkPageType(a);
    const { href, id, title } = functions.parseA(a);
    switch (targetType) {
      case PageType.Post:
        if (id) clickPost(e, id, href, title);
        break;
      case PageType.Node:
      case PageType.Home:
      case PageType.Changes:
        return;
      case PageType.Hot: {
        const date = a.search.replace('?', '');
        if (date === 'setting') {
          toggleCalendar();
          functions.stopEvent(e);
          return;
        }
        const now = dayjs();
        let day: string;
        switch (Number(date)) {
          case -1:
            day = now.subtract(1, 'day').format('YYYY-M-D');
            break;
          case -2:
            day = now.subtract(2, 'day').format('YYYY-M-D');
            break;
          case 3:
            day = '3d';
            break;
          case 7:
            day = '7d';
            break;
          case 30:
            day = '30d';
            break;
          default:
            day = date;
            if (dayjs(day).isSame(now, 'day')) {
              functions.stopEvent(e);
              return location.reload();
            }
        }
        if (day) loadHotList(day);
        functions.stopEvent(e);
        return;
      }
      default:
        if (a.href.includes('/settings/night/toggle')) return;
        if (a.href === location.origin + '/#;') return;
        if (a.href.includes('/notifications')) {
          setPageNumber(0);
          replaceNoticeEntry('<a href="/notifications">0 未读提醒</a>');
          if (configRef.current.notice.takeOverNoticePage) {
            openNotificationModal(href);
            functions.stopEvent(e);
            return;
          }
        }
        if (configRef.current.newTabOpen) {
          functions.stopEvent(e);
          functions.openNewTab(a.href, configRef.current.newTabOpenActive);
        }
        return;
    }
  };

  /** 对应原 $(document).on('click', '.post-item', ...) */
  const clickPostItem = (e: MouseEvent, item: HTMLElement) => {
    if (item.getAttribute('script')) return;
    if (stopMeRef.current) return;
    if (!item.classList.contains('preview')) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName !== 'A' &&
      target.tagName !== 'IMG' &&
      !target.classList.contains('toggle')
    ) {
      const id = item.dataset['id'];
      const href = item.dataset['href'];
      if (id) {
        clickPost(e, id, href ?? '');
      } else if (href) {
        location.href = href;
      }
    }
  };

  /** 对应原 $(document).on('click', '.toggle', ...) */
  const clickToggle = (toggle: HTMLElement) => {
    if (stopMeRef.current) return;
    const id = toggle.dataset['id'];
    const itemDom = document.querySelector<HTMLElement>(`.id_${id}`);
    if (!itemDom) return;
    if (itemDom.classList.contains('preview')) {
      toggle.innerText = '预览';
      itemDom.classList.remove('preview');
    } else {
      const index = listRef.current.findIndex((v) => v.id == id);
      if (index > -1) {
        toggle.innerText = '收起';
        itemDom.classList.add('preview');
      } else {
        toggle.innerText = '加载中';
        void functions.getPostDetailByApi(id ?? '').then((res) => {
          if (res?.content_rendered) {
            const href = itemDom.dataset['href'] ?? '';
            listRef.current.push(getDefaultPost({ ...res, id: String(res.id), href }));
            itemDom.classList.add('preview');
            toggle.innerText = '收起';
            functions.appendPostContent({ content_rendered: res.content_rendered, href }, itemDom);
          } else {
            toggle.innerText = '预览';
            eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '主题暂无正文！' });
          }
        });
      }
    }
  };

  /** 对应原 winCb（解析层 -> App 的消息） */
  const winCb = async (message: HostMessage) => {
    const { type } = message;
    if (type === 'openSetting') {
      showConfig();
    }
    if (type === 'syncData') {
      setStopMe(session.stopMe);
    }
    if (type === 'getConfigSuccess') {
      if (session.config.version < DefaultVal.currentVersion && isDeadline) {
        document.querySelectorAll('.v2next-setting span').forEach((el) => {
          el.insertAdjacentHTML('afterend', '<div class="new v2next-new">new</div>');
        });
      }
      if (session.isLogin && session.config.notice.loopCheckNotice) {
        void getNotice(document.body);
        window.clearInterval(noticeTimerRef.current);
        noticeTimerRef.current = window.setInterval(
          () => void latest.current.getNotice(),
          1000 * 60 * Number(session.config.notice.loopCheckNoticeInterval),
        );
      }
      setConfig(functions.clone(session.config));
      setTags(session.user.tags);
    }
    if (type === 'warningNotice') {
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: message.value });
    }
    if (stopMeRef.current) return;
    if (type === 'restorePost') {
      setShow(false);
      setLoading(false);
      eventBus.emit(CMD.SHOW_MSG, { type: 'warning', text: '脚本无法查看此页面！' });
      setFirstBoxesDisplay('');
    }
    if (type === 'postContent') {
      setCurrent((prev) => ({ ...prev, ...message.value, inList: true }));
      if (configRef.current.autoOpenDetail) {
        showPost();
      }
    }
    if (type === 'postReplies') {
      setLoading(false);
      const next = { ...currentRef.current, ...message.value };
      setCurrent(next);
      listRef.current.push(functions.clone(next));
    }
  };

  const latest = useLatest({
    winCb,
    getNotice,
    clickA,
    clickPostItem,
    clickToggle,
    regenerateReplyList,
    getPostDetail,
  });

  // 对应原 created()：host-bus 消息、eventBus 订阅
  useEffect(() => {
    setHostHandler((message) => latest.current.winCb(message));

    const onCommentThank = ({ id, type }: CommentThankEvent) => {
      const cur = currentRef.current;
      const index = cur.replyList.findIndex((i) => i.id === id);
      if (index < 0) return;
      const replyList = cur.replyList.map((r, i) =>
        i === index
          ? {
              ...r,
              isThanked: type === 'add',
              thankCount: r.thankCount + (type === 'add' ? 1 : -1),
            }
          : r,
      );
      latest.current.regenerateReplyList({ ...cur, replyList });
    };
    const onPostThank = ({ id, type }: CommentThankEvent) => {
      const delta = type === 'add' ? 1 : -1;
      setCurrent((prev) => ({
        ...prev,
        isThanked: type === 'add',
        thankCount: prev.thankCount + delta,
      }));
      const list = listRef.current;
      const index = list.findIndex((i) => i.id === id);
      if (index > -1) {
        list[index] = {
          ...list[index],
          isThanked: type === 'add',
          thankCount: list[index].thankCount + delta,
        };
      }
    };
    const onRemove = (floor: number) => {
      const cur = currentRef.current;
      const replyList = cur.replyList.filter((i) => i.floor !== floor);
      latest.current.regenerateReplyList({ ...cur, replyList });
    };
    const onIgnore = () => {
      setShow(false);
      const list = listRef.current;
      const index = list.findIndex((i) => i.id === currentRef.current.id);
      if (index > -1) list.splice(index, 1);
      setCurrent(getDefaultPost());
    };
    const onMerge = (val: Partial<Post>) => {
      const next = { ...currentRef.current, ...val };
      setCurrent(next);
      const list = listRef.current;
      const index = list.findIndex((i) => i.id === next.id);
      if (index > -1) list[index] = functions.clone(next);
    };
    const onAddReply = (item: Post['replyList'][number]) => {
      const cur = currentRef.current;
      latest.current.regenerateReplyList({ ...cur, replyList: [...cur.replyList, item] });
    };
    const onRefreshOnce = (once?: string | number) => {
      functions.refreshOnce(once).then(
        (value) => setCurrent((prev) => ({ ...prev, once: String(value) })),
        () => undefined,
      );
    };
    const onRemoveTag = async ({ username, tag }: { username: string; tag: string }) => {
      const oldTags = functions.clone(tagsRef.current);
      const next = {
        ...tagsRef.current,
        [username]: (tagsRef.current[username] ?? []).filter((v) => v !== tag),
      };
      setTags(next);
      const res = await parse.saveTags(functions.clone(next));
      if (!res) {
        eventBus.emit(CMD.SHOW_MSG, { type: 'error', text: '标签删除失败！' });
        setTags(oldTags);
      }
    };
    const onShowConfirmModal = ({
      rect,
      title,
      id,
    }: {
      rect: DOMRect;
      title: string;
      id: string;
    }) => {
      setPopConfirm({
        show: true,
        title,
        id,
        top: rect.top,
        left: rect.left + rect.width / 2 - 50,
      });
    };

    const subscriptions = [
      [CMD.CHANGE_COMMENT_THANK, onCommentThank],
      [CMD.CHANGE_POST_THANK, onPostThank],
      [CMD.REMOVE, onRemove],
      [CMD.IGNORE, onIgnore],
      [CMD.MERGE, onMerge],
      [CMD.ADD_REPLY, onAddReply],
      [CMD.REFRESH_ONCE, onRefreshOnce],
      [CMD.REMOVE_TAG, onRemoveTag],
      [CMD.SHOW_CONFIRM_MODAL, onShowConfirmModal],
    ] as const;
    subscriptions.forEach(([type, cb]) => eventBus.on(type, cb as (value?: unknown) => void));

    return () => {
      setHostHandler(null);
      subscriptions.forEach(([type, cb]) => eventBus.offOne(type, cb as (value?: unknown) => void));
      window.clearInterval(noticeTimerRef.current);
      window.clearInterval(glimmerTimerRef.current);
    };
    // 订阅只在挂载时建立一次：所有可变数据都通过 ref / 函数式 setState 读取
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 原来用 jQuery 在 document 上委托的点击处理（冒泡阶段，由内向外，stopPropagation 后不再向外层派发）
  useEffect(() => {
    if (!session.canParseV2exPage) return;
    const onClick = (e: MouseEvent) => {
      let el: Element | null = e.target instanceof Element ? e.target : null;
      while (el) {
        if (el.matches('a')) latest.current.clickA(e, el as HTMLAnchorElement);
        if (e.cancelBubble) break;
        if (el.matches('.post-item')) latest.current.clickPostItem(e, el as HTMLElement);
        if (e.cancelBubble) break;
        if (el.matches('.toggle')) latest.current.clickToggle(el as HTMLElement);
        if (e.cancelBubble) break;
        el = el.parentElement;
      }
    };
    const onPopState = (event: PopStateEvent) => {
      if (event.state) {
        if (!showRef.current) setShow(true);
      } else if (showRef.current) {
        setShow(false);
      }
    };
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
    };
  }, [latest, showRef, setShow]);

  // 接管提醒页后，提醒里 V2EX 原生的"删除"按钮会调用全局 deleteNotification
  const takeOverNoticePage = config.notice.takeOverNoticePage;
  useEffect(() => {
    if (!session.canParseV2exPage || !takeOverNoticePage) return;
    (window as unknown as { deleteNotification?: typeof deleteNotification }).deleteNotification =
      deleteNotification;
    return () => {
      delete (window as unknown as { deleteNotification?: typeof deleteNotification })
        .deleteNotification;
    };
  }, [takeOverNoticePage]);

  // watch config（deep）
  useUpdateEffect(() => {
    try {
      const configStr = localStorage.getItem('v2ex-config');
      if (configStr) {
        const configObj = JSON.parse(configStr) as Record<string, Config>;
        configObj[session.user.username || 'default'] = config;
        localStorage.setItem('v2ex-config', JSON.stringify(configObj));
      }
    } catch (e) {
      console.error('[v2ex-enhancement] 写入本地配置失败', e);
    }
    session.config = functions.clone(config);
    applyDynamicStyle(session.config);
    void parse.editNoteItem(
      session.user.configPrefix + JSON.stringify(session.config),
      session.user.configNoteId,
    );
  }, [config]);

  useUpdateEffect(() => {
    session.user.tags = tags;
  }, [tags]);

  useEffect(() => {
    const on = pageType === PageType.Home && config.homeTheme !== false;
    document.documentElement.classList.toggle('v2n-home', on);
    localStorage.setItem(HOME_THEME_KEY, config.homeTheme === false ? '0' : '1');
  }, [pageType, config.homeTheme]);

  // watch pageInfo.number：标题带上未读数，按配置闪烁
  useUpdateEffect(() => {
    window.clearInterval(glimmerTimerRef.current);
    const title = titleRef.current;
    if (!pageNumber) {
      document.title = title;
      return;
    }
    document.title = `(${pageNumber}) ${title}`;
    if (configRef.current.notice.whenNewNoticeGlimmer) {
      let c = 0;
      glimmerTimerRef.current = window.setInterval(() => {
        c++;
        document.title = title;
        if (c % 2 === 0) {
          document.title = `(${pageNumber}) ${title}`;
        }
      }, 1000);
    }
    return () => window.clearInterval(glimmerTimerRef.current);
  }, [pageNumber]);

  // watch show：详情弹层的滚动锁定、history 与标题
  useUpdateEffect(() => {
    if (session.pageType === PageType.Post) return;
    if (show) {
      document.body.style.overflow = 'hidden';
      if (!window.history.state) {
        window.history.pushState({}, '', currentRef.current.href);
      }
      titleRef.current = document.title = currentRef.current.title ?? 'V2EX';
    } else {
      document.body.style.overflow = 'unset';
      titleRef.current = document.title = 'V2EX';
      if (window.history.state) {
        window.history.back();
      }
    }
  }, [show]);

  const popFade = useFade(popConfirm.show);
  const cancelPopConfirm = () => setPopConfirm((prev) => ({ ...prev, show: false }));
  const confirmPopConfirm = () => {
    cancelPopConfirm();
    eventBus.emit(CMD.SHOW_CONFIRM_MODAL_CONFIRM, popConfirm.id);
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Setting show={configModalShow} onUpdateShow={setConfigModalShow} />
      <TagModal tags={tags} onUpdateTags={setTags} />
      <PostDetail
        modelValue={show}
        onUpdateModelValue={setShow}
        displayType={config.commentDisplayType}
        onUpdateDisplayType={(commentDisplayType) => updateConfig({ commentDisplayType })}
        onRefresh={() => void getPostDetail(current)}
        loading={loading}
        refreshLoading={refreshLoading}
      />
      <Base64Tooltip />
      <MsgModal />
      {calendar.show && calendarHost
        ? createPortal(
            <Calendar
              calendar={calendar}
              onMonthChange={getMonthDayInfo}
              onSelect={(select) => setCalendar((prev) => ({ ...prev, select }))}
            />,
            calendarHost,
          )
        : null}
      <NotificationModal
        modelValue={notificationModal.show}
        onUpdateModelValue={(value) => setNotificationModal((prev) => ({ ...prev, show: value }))}
        list={notificationModal.list}
        loading={notificationModal.loading}
        total={notificationModal.total}
        pages={notificationModal.pages}
      />
      {!stopMe ? (
        <>
          {isMember && isLogin && config.openTag ? (
            <div className={`${styles.targetUserTags} ${styles.p1}`}>
              <span>标签：</span>
              {targetUserTags.map((tag) => (
                <span className={styles.myTag} key={tag}>
                  <i className="fa fa-tag" />
                  <span>{tag}</span>
                  <i
                    className={`fa fa-trash-o ${styles.remove}`}
                    onClick={() =>
                      eventBus.emit(CMD.REMOVE_TAG, { username: session.targetUserName, tag })
                    }
                  />
                </span>
              ))}
              <span
                className={`${styles.addTag} ago`}
                title="添加标签"
                onClick={() => eventBus.emit(CMD.ADD_TAG, session.targetUserName)}
              >
                +
              </span>
            </div>
          ) : null}
          {isPost && !show ? (
            <div
              className={`${styles.myBox} ${styles.p2}`}
              style={{ marginTop: '2rem', marginBottom: 0 }}
            >
              {loading ? (
                <div className={styles.flexCenter}>
                  <BaseLoading />
                </div>
              ) : (
                <div className={styles.loaded}>
                  <span>楼中楼解析完成</span>
                  <BaseButton size="small" onClick={showPost}>
                    点击显示
                  </BaseButton>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
      {popFade.mounted
        ? createPortal(
            <div
              className={`${styles.popConfirmContent} ${popFade.className}`}
              style={{ top: popConfirm.top, left: popConfirm.left }}
            >
              <div className={styles.text}>{popConfirm.title}</div>
              <div className={styles.options}>
                <BaseButton
                  type="link"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelPopConfirm();
                  }}
                >
                  取消
                </BaseButton>
                <BaseButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmPopConfirm();
                  }}
                >
                  确认
                </BaseButton>
              </div>
            </div>,
            document.body,
          )
        : null}
    </AppContext.Provider>
  );
}
