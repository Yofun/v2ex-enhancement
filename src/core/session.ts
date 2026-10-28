import type { Config, PageType, Post, UserData } from './types';

/** 替代原脚本 window.user / window.config / window.pageType 等全局状态。非响应式；React 内的响应式数据走 AppContext。 */
export interface Session {
  user: UserData;
  config: Config;
  targetUserName: string;
  pageType: PageType | undefined;
  pageData: { id?: string; pageNo: number | null };
  isNight: boolean;
  isLogin: boolean;
  /** 停止解析/接管页面（回复过多、无法解析等） */
  stopMe: boolean;
  /** URL 带 script 参数时不解析页面 */
  canParseV2exPage: boolean;
  postList: Post[];
}

// 由 bootstrap 在启动时用 createSession() 初始化
export const session = {} as Session;
