import { DefaultUser, getDefaultConfig } from '@/core/constants';
import type { Session } from '@/core/session';
import { session } from '@/core/session';

/** 对应原 run() 开头对 window.* 的初始化 */
export function createSession(): Session {
  return {
    user: JSON.parse(JSON.stringify(DefaultUser)) as Session['user'],
    config: getDefaultConfig(),
    targetUserName: '',
    pageType: undefined,
    pageData: { pageNo: 1 },
    isNight: document.querySelectorAll('.Night').length === 1,
    isLogin: false,
    stopMe: false,
    canParseV2exPage: true,
  };
}

/** 用全新状态填充共享的 session 对象（保持引用不变） */
export function initSession(): Session {
  return Object.assign(session, createSession());
}
