import { sendHostMessage } from '../host-bus';
import { parse } from '../parsers';
import { session } from '../session';
import { fetchBody } from '../utils/dom';
import { functions } from '../utils/functions';

/** 读取记事本子条目里 prefix 之后的 JSON */
async function getNoteItemContent<T>(
  id: string,
  prefix: string,
): Promise<T | Record<string, never>> {
  try {
    const body = await fetchBody(`${location.origin}/notes/edit/${id}`);
    const text = body.querySelector('.note_editor')?.textContent ?? '';
    if (text === prefix) return {};
    return JSON.parse(text.substring(prefix.length)) as T;
  } catch {
    return {};
  }
}

/** 从 V2EX 记事本读取 用户标签 / 配置 条目（不存在则创建），完成后通知 App */
export async function initNoteData(): Promise<void> {
  const body = await fetchBody(`${location.origin}/notes`);
  const items = Array.from(
    body.querySelectorAll<HTMLAnchorElement>('#Main .box .note_item_title a'),
  );
  const findItem = (prefix: string): HTMLAnchorElement | undefined =>
    items.find((v) => (v.innerText ?? v.textContent ?? '').includes(prefix));
  const { user, config } = session;

  if (config.openTag) {
    const tagItem = findItem(user.tagPrefix);
    if (tagItem) {
      user.tagsId = tagItem.href.slice(-5);
      user.tags = await getNoteItemContent<Record<string, string[]>>(user.tagsId, user.tagPrefix);
    } else {
      const id = await parse.createNoteItem(user.tagPrefix);
      if (id) user.tagsId = id;
    }
  }

  const configItem = findItem(user.configPrefix);
  if (configItem) {
    user.configNoteId = configItem.href.slice(-5);
    const remote = await getNoteItemContent<Partial<typeof config>>(
      user.configNoteId,
      user.configPrefix,
    );
    session.config = functions.deepAssign(session.config, remote);
  } else {
    const id = await parse.createNoteItem(user.configPrefix);
    if (id) user.configNoteId = id;
  }

  void sendHostMessage({ type: 'syncData' });
  void sendHostMessage({ type: 'getConfigSuccess' });
}
