import { genDomFromHtmlString } from '../../utils/dom';
import { slideDown, slideUp } from '../post-detail/slide';

/** 对应 V2EX 页面脚本里的 notificationBottom，仅在接管提醒页时用于"删除后补一条" */
let notificationBottom: number | string | null = null;

/** 原 checkReplyItemType：根据首个节点的内容给整组节点打上 reply / star / collect 标记 */
export function markReplyItemType(nodes: Element[]): void {
  const str = nodes[0]?.innerHTML ?? '';
  if (str.includes('提到了你') || str.includes('回复了你')) {
    nodes.forEach((n) => n.classList.add('reply'));
  }
  if (str.includes('感谢了你')) {
    nodes.forEach((n) => n.classList.add('star'));
  }
  if (str.includes('收藏了你')) {
    nodes.forEach((n) => n.classList.add('collect'));
  }
}

export interface NotificationPage {
  list: string;
  total?: string;
  pages: string;
}

/** 抓取提醒页并抽出列表 / 总数 / 分页（原 clickA 里 /notifications 分支） */
export async function fetchNotificationPage(href: string): Promise<NotificationPage> {
  const res = await fetch(href);
  const htmlText = await res.text();
  const bottom = htmlText.match(/var notificationBottom = ([\d]+);/);
  if (bottom && bottom[1]) {
    notificationBottom = Number(bottom[1]);
  }
  const body = genDomFromHtmlString(htmlText);
  const list = body.querySelector('#notifications');
  if (!list) throw new Error('[V2Next] 未找到提醒列表');
  Array.from(list.children).forEach((child) => markReplyItemType([child]));
  const result: NotificationPage = { list: list.innerHTML, pages: '' };
  const totalEls = body.querySelectorAll('#Main > .box > .header .fr .gray');
  if (totalEls.length) {
    result.total = Array.from(totalEls)
      .map((el) => el.textContent ?? '')
      .join('');
  }
  const pager = list.nextElementSibling;
  if (pager) {
    pager.querySelectorAll('.button').forEach((td) => {
      const onclick = td.getAttribute('onclick');
      if (onclick) {
        td.innerHTML = `<a href=${onclick.replace('location.href=', '')}>${td.innerHTML}</a>`;
        td.setAttribute('onclick', '');
      }
    });
    result.pages = pager.innerHTML;
  }
  return result;
}

/** 原 window.deleteNotification，由 NotificationModal 里 V2EX 原生的 onclick 调用 */
export function deleteNotification(nId: string, token: string): void {
  const item = document.getElementById(`n_${nId}`);
  if (item) slideUp(item);
  const restore = () => {
    if (item) slideDown(item);
  };
  fetch(`/delete/notification/${nId}?once=${token}`, { method: 'POST' })
    .then(async (res) => {
      if (!res.ok) throw new Error('delete failed');
      const below = await fetch(`/notifications/below/${notificationBottom}`);
      if (!below.ok) throw new Error('below failed');
      const data = await below.text();
      item?.remove();
      const holder = document.createElement('div');
      holder.innerHTML = data.trim();
      const nodes = Array.from(holder.children);
      markReplyItemType(nodes);
      document.querySelector('#notifications')?.append(...nodes);
      notificationBottom = below.headers.get('X-V2EX-New-Notification-Bottom');
    })
    .catch(restore);
}

/** 原 `$("#money").parent().prev().replaceWith(html)`：刷新右上角的未读提醒入口 */
export function replaceNoticeEntry(html: string): void {
  const prev = document.querySelector('#money')?.parentElement?.previousElementSibling;
  if (!prev) return;
  prev.insertAdjacentHTML('beforebegin', html);
  prev.remove();
}
