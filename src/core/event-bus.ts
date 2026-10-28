export const CMD = {
  SHOW_TOOLTIP: 'SHOW_TOOLTIP',
  SHOW_MSG: 'SHOW_MSG',
  SET_CALL: 'SET_CALL',
  SHOW_CALL: 'SHOW_CALL',
  REFRESH_ONCE: 'REFRESH_ONCE',
  ADD_REPLY: 'ADD_REPLY',
  IGNORE: 'IGNORE',
  MERGE: 'MERGE',
  REMOVE: 'REMOVE',
  CHANGE_COMMENT_THANK: 'CHANGE_COMMENT_THANK',
  CHANGE_POST_THANK: 'CHANGE_POST_THANK',
  ADD_TAG: 'ADD_TAG',
  REMOVE_TAG: 'REMOVE_TAG',
  RELATION_REPLY: 'RELATION_REPLY',
  JUMP: 'JUMP',
  REFRESH_POST: 'REFRESH_POST',
  SHOW_CONFIRM_MODAL: 'SHOW_CONFIRM_MODAL',
  SHOW_CONFIRM_MODAL_CONFIRM: 'SHOW_CONFIRM_MODAL_CONFIRM',
} as const;

export type CmdType = (typeof CMD)[keyof typeof CMD];
export type Handler = (value?: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

const handlers = new Map<string, Handler[]>();

export const eventBus = {
  on(type: CmdType, cb: Handler): void {
    handlers.set(type, [...(handlers.get(type) ?? []), cb]);
  },
  offOne(type: CmdType, cb: Handler): void {
    const list = handlers.get(type);
    if (list)
      handlers.set(
        type,
        list.filter((c) => c !== cb),
      );
  },
  emit(type: CmdType, value?: unknown): void {
    handlers.get(type)?.forEach((cb) => cb(value));
  },
  off(type: CmdType): void {
    handlers.delete(type);
  },
  clear(): void {
    handlers.clear();
  },
};
