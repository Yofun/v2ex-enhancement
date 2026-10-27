import { createContext, useContext } from 'react';

import type { Config, PageType, Post } from './types';

/** 对应原脚本 App.vue 的 provide() */
export interface AppContextValue {
  isLogin: boolean;
  isNight: boolean;
  pageType: PageType | undefined;
  tags: Record<string, string[]>;
  /** 详情弹层是否显示 */
  show: boolean;
  /** 当前打开的主题 */
  post: Post;
  config: Config;
  allReplyUsers: string[];
  showConfig: () => void;
  setConfig: (updater: Partial<Config> | ((prev: Config) => Config)) => void;
  setTags: (tags: Record<string, string[]>) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp must be used inside <AppContext.Provider>');
  }
  return value;
}
