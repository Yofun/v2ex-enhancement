export interface HotItem {
  id: number | string;
  username: string;
  avatar: string;
  title: string;
  nodeUrl: string;
  nodeTitle: string;
  replyCount: number;
  lastReplyDate: string;
  lastReplyDateAgo: string;
  lastReplyUsername: string;
}

// 数据来自 DefaultVal.hotUrl 的静态 json；与原脚本一致，按原样拼接成 V2EX 列表项
function hotItemHtml(v: HotItem): string {
  return `
<div class="cell item post-item id_${v.id}" style="" data-href="https://www.v2ex.com/t/${v.id}#reply${v.replyCount}">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tbody>
      <tr>
        <td width="48" valign="top" align="center">
          <a href="/member/${v.username}">
            <img src="${v.avatar}" class="avatar"
                 border="0" align="default"
                 width="48"
                 style="width: 48px; max-height: 48px;"
                 alt="ice9191">
          </a>
        </td>
        <td width="10"></td>
        <td width="auto" valign="middle">
          <span class="item_title">
            <a href="https://www.v2ex.com/t/${v.id}#reply${v.replyCount}" class="topic-link" id="topic-link-${v.id}">${v.title}</a>
          </span>
          <div class="sep5"></div>
          <span class="topic_info">
            <div class="votes"></div>
            <a class="node" href="/go/${v.nodeUrl}">${v.nodeTitle}</a> &nbsp;•&nbsp;
            <strong><a href="/member/${v.username}">${v.username}</a></strong> &nbsp;•&nbsp;
            <span title="${v.lastReplyDate}">${v.lastReplyDateAgo}</span> &nbsp;•&nbsp; 最后回复来自
            <strong><a href="/member/${v.lastReplyUsername}">${v.lastReplyUsername}</a></strong>
          </span>
        </td>
        <td width="70" align="right" valign="middle" style="position: relative;">
          <a href="/t/${v.id}#reply${v.replyCount}" class="count_livid">${v.replyCount}</a>
          <div data-id="${v.id}" class="toggle">预览</div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
`.trim();
}

/** 用历史最热数据替换页面上的主题列表（插在 #app 之后，保持原顺序） */
export function renderHotList(list: HotItem[]): void {
  document.querySelectorAll('.cell.item.post-item').forEach((el) => el.remove());
  const anchor = document.querySelector('#app');
  if (!anchor) return;
  list.reverse().forEach((v) => {
    anchor.insertAdjacentHTML('afterend', hotItemHtml(v));
  });
}
