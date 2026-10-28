import type { Post } from './types';

/** 对应原脚本 functions.cbChecker / App.winCb 的消息；解析层 -> App */
export type HostMessage =
  | { type: 'openSetting' }
  | { type: 'syncData' }
  | { type: 'syncList' }
  | { type: 'getConfigSuccess' }
  | { type: 'restorePost'; value?: null }
  | { type: 'warningNotice'; value: string }
  | { type: 'postContent'; value: Post }
  | { type: 'postReplies'; value: Post };

type HostHandler = (message: HostMessage) => void | Promise<void>;

let handler: HostHandler | null = null;

export function setHostHandler(next: HostHandler | null): void {
  handler = next;
}

/** App 挂载前发送的消息最多等待 15 秒（原脚本 30 次 * 500ms） */
export async function sendHostMessage(message: HostMessage): Promise<void> {
  for (let i = 0; !handler && i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await handler?.(message);
}
