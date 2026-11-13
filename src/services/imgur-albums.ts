import { session } from '@/core/session';
import { getInnerText } from '@/utils/dom';
import { gmGetText } from '@/utils/gm';
import { createLogger } from '@/utils/logger';
import { watchDom } from '@/utils/watch-dom';

const log = createLogger('imgur');

// 帖子正文 / 回复在 #app 里，列表预览在 .post-content 里
const SELECTOR = '#app a, .post-content a';

// imgur.com/a/<id>、imgur.com/gallery/<id>，带标题的相册形如 /a/Some-Title-<id>
const ALBUM_RE =
  /^https?:\/\/(?:www\.|m\.)?imgur\.com\/(?:a|gallery)\/(?:[^/?#]*-)?([A-Za-z0-9]{5,8})\/?(?:[?#].*)?$/;

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

/** 相册最多直接展开这么多张，超出的点链接去相册里看，免得一个长相册把页面撑爆 */
const MAX_IMAGES = 12;

export function parseAlbumId(href: string): string | null {
  return ALBUM_RE.exec(href)?.[1] ?? null;
}

/**
 * 解析相册接口的返回，得到每张图的直链。
 * 不是相册（接口此时返回空数组）、格式不对、或是视频之类 <img> 显示不了的，都不收。
 * hash 和后缀会拼进图片地址，所以逐个校验，不信任接口原样返回的内容。
 */
export function parseAlbumImages(text: string): string[] {
  let data: unknown;
  try {
    data = (JSON.parse(text) as { data?: { images?: unknown } }).data;
  } catch {
    return [];
  }
  const images = (data as { images?: unknown } | undefined)?.images;
  if (!Array.isArray(images)) return [];
  return images.flatMap((item: { hash?: unknown; ext?: unknown }) =>
    typeof item?.hash === 'string' &&
    /^[A-Za-z0-9]+$/.test(item.hash) &&
    typeof item.ext === 'string' &&
    IMAGE_EXTS.has(item.ext.toLowerCase())
      ? [`https://i.imgur.com/${item.hash}${item.ext}`]
      : [],
  );
}

// 同一个相册在页面里可能出现很多次；失败也缓存，免得一个连不上的相册被反复请求
const cache = new Map<string, Promise<string[]>>();

function resolveAlbum(id: string): Promise<string[]> {
  let p = cache.get(id);
  if (!p) {
    // 相册页本身只在 HTML 里带封面图，完整图片列表要走这个老接口
    log.info(`发现相册 ${id}，开始解析`);
    p = gmGetText(`https://imgur.com/ajaxalbums/getimages/${id}/hit.json`)
      .then((text) => {
        const urls = parseAlbumImages(text);
        // 接口对“不是相册”返回空数组，对被拦截的页面返回 HTML；两种都解析不出图，在这里说清楚
        if (!urls.length) {
          log.warn(`相册 ${id} 没有解析出图片，接口返回开头：`, text.slice(0, 120));
        }
        return urls;
      })
      .catch((e) => {
        // 常见原因：脚本管理器没有提供 GM_xmlhttpRequest，或这个浏览器访问不了 imgur.com
        log.warn(`相册 ${id} 请求失败，保持原链接：`, e);
        return [];
      });
    cache.set(id, p);
  }
  return p;
}

async function expand(a: HTMLAnchorElement, id: string): Promise<void> {
  const urls = await resolveAlbum(id);
  if (!urls.length || !a.isConnected) return;
  a.textContent = '';
  for (const url of urls.slice(0, MAX_IMAGES)) {
    const img = document.createElement('img');
    img.setAttribute('originUrl', url);
    img.setAttribute('notice', '此img标签由v2ex超级增强脚本解析Imgur相册');
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.style.display = 'block';
    img.style.margin = '4px 0';
    img.src = url;
    a.append(img);
  }
  log.info(`相册 ${id} 已展开 ${Math.min(urls.length, MAX_IMAGES)}/${urls.length} 张图片`);
  if (urls.length > MAX_IMAGES) {
    const more = document.createElement('span');
    more.className = 'v2n-album-more';
    more.textContent = `共 ${urls.length} 张，点击查看全部`;
    a.append(more);
  }
}

/** 找出范围内“文字就是相册地址”的链接，展开成图片。返回所有展开任务，便于等待 */
export function processAlbumLinks(
  root: ParentNode = document,
  seen: WeakSet<Element> = new WeakSet(),
): Promise<void[]> {
  if (!session.config.parseImgur) return Promise.resolve([]);
  const jobs: Promise<void>[] = [];
  root.querySelectorAll<HTMLAnchorElement>(SELECTOR).forEach((a) => {
    if (seen.has(a) || a.children.length > 0) return;
    const id = parseAlbumId(a.href);
    if (!id || getInnerText(a).trim() !== a.href) return;
    seen.add(a);
    jobs.push(expand(a, id).catch((e) => log.error(`相册 ${id} 展开失败`, e)));
  });
  return Promise.all(jobs);
}

/** 监听页面里新出现的链接，按 parseImgur 开关展开 Imgur 相册。返回清理函数 */
export function startImgurAlbums(): () => void {
  log.debug('开始监听 Imgur 相册链接，开关', session.config.parseImgur);
  return watchDom((seen) => void processAlbumLinks(document, seen));
}
