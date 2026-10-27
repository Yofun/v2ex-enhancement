import { sendHostMessage } from '../host-bus';
import type { Member, Post, Reply } from '../types';
import { fetchBody, getInnerText } from '../utils/dom';
import type { ReplyPage } from '../utils/functions';
import { functions } from '../utils/functions';

const MODERATORS = [
  'Livid',
  'Kai',
  'Olivia',
  'GordianZ',
  'sparanoid',
  'drymonfidelia',
  'GordianZ',
  'sillydaddy',
];

export interface ReplyContentInfo {
  users: string[];
  floor: number;
}

/** 在若干个 .box 中找到回复区域 */
export function findReplyBox(boxs: ArrayLike<Element>): Element | undefined {
  for (let i = 1; i < boxs.length; i++) {
    const box = boxs[i];
    const cells = box.querySelectorAll('.cell');
    if (cells.length > 0) {
      const firstCell = cells[0];
      if (firstCell.querySelector('.snow')) return box;
      if (firstCell.querySelector('.fa-tag')) return box;
    }
  }
  console.warn('[V2Next] 无法智能检测回复区域，使用默认位置');
  return boxs[1];
}

/** 解析主题内容（标题、节点、作者、收藏/忽略/感谢状态、统计数、正文头部模板） */
export async function parsePostContent(
  post: Post,
  body: ParentNode,
  htmlText: string,
): Promise<Post> {
  const once = htmlText.match(/var once = "([\d]+)";/);
  if (once && once[1]) {
    post.once = once[1];
  }
  post.isReport = htmlText.includes('你已对本主题进行了报告');
  const wrapper = body.querySelector('#Main');
  if (wrapper) {
    if (!post.title || !post.content_rendered) {
      const h1 = wrapper.querySelector('h1');
      if (h1) post.title = getInnerText(h1);
    }
    const as = wrapper.querySelectorAll<HTMLAnchorElement>('.header > a');
    // 新版 V2EX 的面包屑不再是 .header 的直接子元素，退回按 /go/ 链接查找
    const nodeLink =
      as.length > 1 ? as[1] : wrapper.querySelector<HTMLAnchorElement>('.header a[href^="/go/"]');
    if (nodeLink) {
      post.node.title = getInnerText(nodeLink);
      post.node.url = nodeLink.href;
    }
    const aName = wrapper.querySelector('.header small.gray a:nth-child(1)');
    if (aName) {
      post.member.username = getInnerText(aName);
    }
    const spanEl = wrapper.querySelector<HTMLElement>('.header small.gray span');
    if (spanEl) {
      post.createDateAgo = getInnerText(spanEl);
      post.createDate = spanEl.title;
    }
    const avatarEl = wrapper.querySelector<HTMLImageElement>('.header .avatar');
    if (avatarEl) {
      post.member.avatar_large = avatarEl.src;
    }
  }

  const topicButtons = body.querySelector('.topic_buttons');
  if (topicButtons) {
    // jQuery 的 .tb:first 即文档顺序第一个
    const favoriteNode = topicButtons.querySelector('.tb');
    if (favoriteNode) {
      post.isFavorite = getInnerText(favoriteNode) === '取消收藏';
    }
    const ignoreNode = topicButtons.querySelector('.tb:nth-child(3)');
    if (ignoreNode) {
      post.isIgnore = getInnerText(ignoreNode) === '取消忽略';
    }
    if (!topicButtons.querySelector('#topic_thank .tb')) {
      post.isThanked = true;
    }
    const topicStats = topicButtons.querySelector('.topic_stats');
    if (topicStats) {
      const text = getInnerText(topicStats);
      const pick = (reg: RegExp): number | undefined => {
        const res = [...text.matchAll(reg)];
        return res.length ? Number(res[0][1]) : undefined;
      };
      post.collectCount = pick(/([\d]+)[\s]*人收藏/g) ?? post.collectCount;
      post.collectCount = pick(/([\d]+)[\s]*likes/g) ?? post.collectCount;
      post.thankCount = pick(/([\d]+)[\s]*人感谢/g) ?? post.thankCount;
      post.clickCount = pick(/([\d]+)[\s]*次点击/g) ?? post.clickCount;
      post.clickCount = pick(/([\d]+)[\s]*views/g) ?? post.clickCount;
    }
  }

  const header = body.querySelector('#Main .box');
  if (header) {
    const temp = header.cloneNode(true) as HTMLElement;
    temp.querySelectorAll('.topic_buttons, .inner, .header').forEach((el) => el.remove());
    functions.checkPhotoLink2Img(temp);
    post.headerTemplate = temp.innerHTML;
  }
  return post;
}

/** 解析 OP 信息：注册日期、是否新用户 */
export async function parseOp(post: Post): Promise<Post> {
  if (!post.member.id) {
    const userRes = await fetch(
      location.origin + '/api/members/show.json?username=' + post.member.username,
    );
    if (userRes.status === 200) {
      post.member = (await userRes.json()) as Member;
    }
  }
  if (post.member.id) {
    const date = new Date(Number(post.member.created) * 1e3);
    const createStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    date.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    post.member.createDate = createStr + ' 注册';
    post.member.isNew = now.getTime() - date.getTime() <= 1e3 * 60 * 60 * 24 * 15;
  } else {
    post.member.createDate = '用户已被注销/封禁';
    post.member.isNew = true;
  }
  return post;
}

/** 解析回复内容，得到 @ 的用户与回复的楼层，用于后续生成嵌套楼层 */
export function parseReplyContent(str: string): ReplyContentInfo | undefined {
  if (!str) return undefined;
  const users: string[] = [];
  const res = [...str.matchAll(/@<a href="\/member\/([^'" ]+)/g)];
  res.forEach((item) => users.push(item[1]));
  let floor = -1;
  if (users.length === 1) {
    const hasFloor = [
      ...str.matchAll(/@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?[\s]+#([\d]+)/g),
    ];
    if (hasFloor.length) {
      floor = Number(hasFloor[0][1]);
    }
  }
  return { users, floor };
}

/** 解析页面上的回复节点（.cell#r_xxx） */
export function parsePageReplies(nodes: Element[]): Reply[] {
  const replyList: Reply[] = [];
  nodes.forEach((node) => {
    if (!node.id) return;
    const replyContent = node.querySelector('.reply_content');
    const no = node.querySelector('.no');
    if (!replyContent || !no) return;
    functions.checkPhotoLink2Img(replyContent);
    const content = replyContent.innerHTML;
    const { users, floor } = parseReplyContent(content) ?? { users: [], floor: -1 };
    const username = node.querySelector('strong a')?.textContent ?? '';
    const small = node.querySelector('.small');
    const thankArea = node.querySelector('.thank_area');
    const item: Reply = {
      id: node.id.replace('r_', ''),
      level: 0,
      thankCount: small ? Number(small.textContent) : 0,
      replyCount: 0,
      isThanked: thankArea ? thankArea.classList.contains('thanked') : false,
      isOp: !!node.querySelector('.op'),
      isDup: false,
      reply_content: content,
      reply_text: replyContent.textContent ?? '',
      hideCallUserReplyContent:
        users.length === 1
          ? content.replace(
              /@<a href="\/member\/[\s\S]+?<\/a>(?:<ul [\s\S]+<\/ul>)?(\s#[\d]+)?\s(<br>)?/,
              () => '',
            )
          : content,
      replyUsers: users,
      replyFloor: floor,
      date: node.querySelector('.ago')?.textContent ?? '',
      username,
      avatar: node.querySelector<HTMLImageElement>('td img')?.src ?? '',
      floor: Number(no.textContent),
      isMod: node.querySelector('.mod') ? true : MODERATORS.includes(username),
      children: [],
    };
    replyList.push(item);
  });
  return replyList;
}

/** 请求主题的其他页并解析回复 */
export function fetchPostOtherPageReplies(href: string, pageNo: number): Promise<ReplyPage> {
  return new Promise((resolve, reject) => {
    fetchBody(href)
      .then((body) => {
        const box = findReplyBox(body.querySelectorAll('#Main .box'));
        const cells = Array.from(box?.querySelectorAll('.cell') ?? []);
        resolve({ i: pageNo, replyList: parsePageReplies(cells.slice(2, cells.length - 1)) });
      })
      .catch((e: { status?: number }) => {
        if (e?.status === 403) {
          // 与原实现一致：403 时让 promise 一直挂起，由 App 还原原生页面
          void sendHostMessage({ type: 'restorePost', value: null });
        } else {
          reject(e);
        }
      });
  });
}

/** 获取主题所有回复（含其他分页），并生成回复列表/热门/楼中楼 */
export async function getPostAllReplies(
  post: Post,
  body: ParentNode,
  htmlText: string,
  pageNo = 1,
): Promise<Post> {
  void htmlText;
  if (body.querySelector('#no-comments-yet')) {
    return post;
  }
  const box = findReplyBox(body.querySelectorAll('#Main .box'));
  const cells = Array.from(box?.querySelectorAll('.cell') ?? []);
  if (cells.length < 2) return post;

  post.fr = cells[0].querySelector('.cell .fr')?.innerHTML ?? '';
  const snow = cells[0].querySelector('.snow');
  post.lastReplyDate = snow?.nextSibling?.nodeValue?.trim() || '';
  const repliesMap: ReplyPage[] = [];
  if (cells[1].id) {
    repliesMap.push({ i: pageNo, replyList: parsePageReplies(cells.slice(1)) });
    functions.createList(post, functions.getAllReply(repliesMap));
    return post;
  }
  repliesMap.push({ i: pageNo, replyList: parsePageReplies(cells.slice(2, cells.length - 1)) });
  const pages = Array.from(cells[1].querySelectorAll<HTMLElement>('a.page_normal'));
  const url = location.origin + '/t/' + post.id;
  const results = await Promise.allSettled(
    pages.map((page) => {
      const currentPageNo = Number(getInnerText(page));
      return fetchPostOtherPageReplies(url + '?p=' + currentPageNo, currentPageNo);
    }),
  );
  results.forEach((result) => {
    if (result.status === 'fulfilled') repliesMap.push(result.value);
  });
  functions.createList(post, functions.getAllReply(repliesMap));
  return post;
}

/** 获取主题详情：内容 + 所有回复 */
export async function getPostDetail(
  post: Post,
  body: ParentNode,
  htmlText: string,
  pageNo = 1,
): Promise<Post> {
  const res = await parsePostContent(post, body, htmlText);
  return getPostAllReplies(res, body, htmlText, pageNo);
}
