import { createContext, useContext } from 'react';

/** 对应原版 PostDetail provide 的 postDetailWidth（详情主体宽度，0 表示未测量）；由 PostDetail 提供 */
export const PostDetailWidthContext = createContext(0);

export const usePostDetailWidth = () => useContext(PostDetailWidthContext);
