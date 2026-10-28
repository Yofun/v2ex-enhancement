import { getDefaultPost } from '@/core/constants';
import { sendHostMessage } from '@/core/host-bus';
import { session } from '@/core/session';
import type { Post } from '@/core/types';
import { functions } from '@/utils/functions';

const CACHE_KEY = 'cacheData';
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 3;

/** 解析列表页的主题：加上 post-item 标记与「预览」按钮；卡片视图下抓取并预览正文 */
export function parsePagePostList(list: ArrayLike<Element>, box: ParentNode): void {
  Array.from(list).forEach((el) => {
    const itemDom = el as HTMLElement;
    const itemTitle = itemDom.querySelector('.item_title');
    if (!itemTitle) return;
    const item = getDefaultPost();
    itemDom.classList.add('post-item');
    const a = itemTitle.querySelector('a');
    if (!a) return;
    const { href, id } = functions.parseA(a);
    item.id = String(Number(id));
    a.href = item.href = href;
    item.url = location.origin + '/api/topics/show.json?id=' + item.id;
    itemDom.classList.add(`id_${id}`);
    itemDom.dataset['href'] = href;
    const td =
      itemDom.querySelector<HTMLElement>('td:nth-child(4)') ??
      itemDom.querySelector<HTMLElement>('td:nth-child(2)');
    if (td) {
      td.style.position = 'relative';
      const toggle = document.createElement('div');
      toggle.dataset['id'] = item.id;
      toggle.classList.add('toggle');
      toggle.textContent = '预览';
      td.append(toggle);
    }
    if (session.config.viewType === 'card') {
      session.postList.push(item);
    }
  });

  // 原脚本用它记录"检测到其它脚本"的标记；检测已移除，这里只清掉旧版本遗留的值
  localStorage.setItem('d', '');

  const setF = (res: Post): void => {
    const rIndex = session.postList.findIndex((w) => w.id == res.id);
    if (rIndex > -1) {
      session.postList[rIndex] = Object.assign(session.postList[rIndex], res);
      void sendHostMessage({ type: 'syncList' });
    }
    const itemDom = box.querySelector(`.id_${res.id}`);
    if (!itemDom) return;
    itemDom.classList.add('preview');
    if (res.content_rendered) {
      functions.appendPostContent(res, itemDom);
    }
  };

  if (session.config.viewType === 'card' && !session.stopMe) {
    let cacheData: Post[] = [];
    const cacheDataStr = localStorage.getItem(CACHE_KEY);
    if (cacheDataStr) {
      try {
        cacheData = JSON.parse(cacheDataStr) as Post[];
      } catch {
        cacheData = [];
      }
      const now = Date.now();
      cacheData = cacheData.filter((v) => (v.created ?? 0) > now / 1e3 - CACHE_TTL_SECONDS);
    }
    let fetchIndex = 0;
    for (const item of session.postList) {
      const rItem = cacheData.find((w) => w.id == item.id);
      if (rItem) {
        rItem.href = item.href;
        setF(rItem);
      } else {
        fetchIndex++;
        setTimeout(
          () => {
            fetch(item.url)
              .then((r) => r.json() as Promise<Partial<Post>[]>)
              .then((v) => {
                if (v && v.length) {
                  const res = getDefaultPost(v[0]);
                  res.href = item.href;
                  cacheData.push(res);
                  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                  setF(res);
                }
              })
              .catch((e) => console.error('[V2Next] 获取主题预览失败', e));
          },
          fetchIndex < 4 ? 0 : (fetchIndex - 4) * 1e3,
        );
      }
    }
  }
}
