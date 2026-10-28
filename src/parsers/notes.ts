import { session } from '@/core/session';

/** 创建记事本子条目，返回条目 id（URL 末 5 位） */
export async function createNoteItem(itemName: string): Promise<string | null> {
  if (!session.isLogin) return null;
  const data = new FormData();
  data.append('content', itemName);
  data.append('parent_id', '0');
  data.append('syntax', '0');
  const apiRes = await fetch(`${location.origin}/notes/new`, { method: 'post', body: data });
  if (apiRes.redirected && apiRes.status === 200) {
    return apiRes.url.slice(-5);
  }
  return null;
}

/** 编辑记事本子条目 */
export async function editNoteItem(val: string, id: string): Promise<boolean | undefined> {
  if (!session.isLogin) return undefined;
  if (!id) return undefined;
  const data = new FormData();
  data.append('content', val);
  data.append('syntax', '0');
  const apiRes = await fetch(`${location.origin}/notes/edit/${id}`, { method: 'post', body: data });
  return apiRes.redirected && apiRes.status === 200;
}

/** 保存用户标签（会就地删除空标签数组） */
export async function saveTags(val: Record<string, string[]>): Promise<boolean | undefined> {
  if (!session.isLogin) return undefined;
  for (const [key, value] of Object.entries(val)) {
    if (!value.length) delete val[key];
  }
  return editNoteItem(session.user.tagPrefix + JSON.stringify(val), session.user.tagsId);
}

/** imgur 图片删除 hash 操作：原脚本此处为空实现 */
export async function saveImgurList(val: unknown): Promise<void> {
  void val;
}
