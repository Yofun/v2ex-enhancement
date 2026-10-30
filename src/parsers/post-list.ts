import { getDefaultPost } from '@/core/constants';
import { functions } from '@/utils/functions';

/** 解析列表页的主题：加上 post-item 标记与「预览」按钮 */
export function parsePagePostList(list: ArrayLike<Element>): void {
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
  });

  // 清掉旧版本遗留的本地数据（其它脚本检测标记、已移除的卡片视图主题缓存）
  localStorage.setItem('d', '');
  localStorage.removeItem('cacheData');
}
