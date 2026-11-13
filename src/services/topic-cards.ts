import { session } from '@/core/session';
import { getInnerText } from '@/utils/dom';
import type { ApiTopic } from '@/utils/functions';
import { functions } from '@/utils/functions';
import { createLogger } from '@/utils/logger';
import { watchDom } from '@/utils/watch-dom';

const log = createLogger('topic-card');

// 帖子正文 / 回复在 #app 里，列表预览在 .post-content 里
const SELECTOR = '#app a, .post-content a';

/** 摘要只取正文开头这么多字，卡片里再由 CSS 截成几行 */
const MAX_SNIPPET = 200;

/** 只认指向主题本身的地址：/t/<id>。带 #reply 锚点的指向某条回复，卡片展示主题会误导，不处理 */
export function parseTopicId(
  a: Pick<HTMLAnchorElement, 'hostname' | 'pathname' | 'hash'>,
): string | null {
  if (a.hash) return null;
  if (
    a.hostname !== 'v2ex.com' &&
    !a.hostname.endsWith('.v2ex.com') &&
    a.hostname !== location.hostname
  ) {
    return null;
  }
  return /^\/t\/(\d+)\/?$/.exec(a.pathname)?.[1] ?? null;
}

/**
 * 链接文字就是地址本身（完整地址或 /t/123 这样的站内路径）才算“裸链接”，有自定义文字的不动。
 * href 和文字都必须非空：弹框加载中，React 渲染的节点链接是 <a href="">，空 href 会被解析成
 * 当前页面地址，不拦掉的话在主题页里会被当成这个主题的链接。
 */
function isBareLink(a: HTMLAnchorElement): boolean {
  const raw = a.getAttribute('href');
  const text = getInnerText(a).trim();
  return !!raw && !!text && (text === a.href || text === a.pathname || text === raw);
}

/** content_rendered 是 HTML；DOMParser 不执行脚本、不加载图片，只拿纯文本 */
export function toSnippet(html: string): string {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  body.querySelectorAll('script, style').forEach((el) => el.remove());
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SNIPPET);
}

// 同一个主题在页面里可能出现很多次；失败也缓存，免得一个取不到的主题被反复请求
const cache = new Map<string, Promise<ApiTopic | undefined>>();

function resolveTopic(id: string): Promise<ApiTopic | undefined> {
  let p = cache.get(id);
  if (!p) {
    log.info(`发现主题链接 ${id}，开始获取`);
    p = functions.getPostDetailByApi(id).then((topic) => {
      if (!topic) log.warn(`主题 ${id} 没有取到内容，保持原链接`);
      return topic;
    });
    cache.set(id, p);
  }
  return p;
}

function span(className: string, text: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

async function expand(a: HTMLAnchorElement, id: string): Promise<void> {
  const topic = await resolveTopic(id);
  if (!topic || !a.isConnected) return;
  const snippet = toSnippet(topic.content_rendered ?? '');

  a.textContent = '';
  a.classList.add('v2n-topic-card');
  // script 属性让脚本自己的点击拦截（app.tsx 的 clickA）放过它；卡片点击一律新标签页打开
  a.setAttribute('script', '1');
  a.target = '_blank';
  a.rel = 'noopener';
  a.addEventListener('click', (e) => e.stopPropagation());

  // 仿 Atlassian 的链接预览：头像 + 标题 / 摘要 / 底部元信息
  const head = span('v2n-topic-card-head', '');
  const avatar = topic.member?.avatar_normal;
  if (avatar) {
    const img = document.createElement('img');
    img.className = 'v2n-topic-card-avatar';
    img.alt = '';
    img.src = avatar;
    head.append(img);
  }
  head.append(span('v2n-topic-card-title', topic.title));
  a.append(head);
  if (snippet) a.append(span('v2n-topic-card-body', snippet));

  const foot = span('v2n-topic-card-foot', '');
  if (topic.node?.title) foot.append(span('v2n-topic-card-node', topic.node.title));
  foot.append(
    span('', [topic.member?.username, `${topic.replies} 回复`].filter(Boolean).join(' · ')),
  );
  a.append(foot);
  log.info(`主题 ${id} 已展开为卡片`);
}

/** 找出范围内“文字就是主题地址”的链接，展开成卡片。返回所有展开任务，便于等待 */
export function processTopicLinks(
  root: ParentNode = document,
  seen: WeakSet<Element> = new WeakSet(),
): Promise<void[]> {
  if (!session.config.topicCard) return Promise.resolve([]);
  const jobs: Promise<void>[] = [];
  root.querySelectorAll<HTMLAnchorElement>(SELECTOR).forEach((a) => {
    if (seen.has(a) || a.children.length > 0) return;
    const id = parseTopicId(a);
    // 自己这篇的链接（比如回复里引用本帖）展开成卡片没有意义
    if (!id || id === session.pageData.id || !isBareLink(a)) return;
    seen.add(a);
    jobs.push(expand(a, id).catch((e) => log.error(`主题 ${id} 展开失败`, e)));
  });
  return Promise.all(jobs);
}

/** 监听页面里新出现的链接，按 topicCard 开关把帖子链接展开成卡片。返回清理函数 */
export function startTopicCards(): () => void {
  log.debug('开始监听主题链接，开关', session.config.topicCard);
  return watchDom((seen) => void processTopicLinks(document, seen));
}
