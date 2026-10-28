import { getInnerText } from '@/utils/dom';
import { loadImageRules, resolveImageUrls } from '@/utils/image-rules';

const SELECTOR = '#app a, .post-content a';
const cache = new Map<string, Promise<string[] | null>>();

function resolveCached(url: string): Promise<string[] | null> {
  let p = cache.get(url);
  if (!p) {
    p = resolveImageUrls(url);
    cache.set(url, p);
  }
  return p;
}

/** 纯文本链接（文字就是地址）：命中图片规则后请求并替换为图片 */
async function process(a: HTMLAnchorElement): Promise<void> {
  const urls = await resolveCached(a.href);
  if (!urls?.length || !a.isConnected) return;
  a.textContent = '';
  for (const url of urls) {
    const img = document.createElement('img');
    img.setAttribute('originUrl', url);
    img.setAttribute('notice', '此img标签由用户图片规则解析');
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.src = url;
    a.append(img);
  }
}

/** 监听页面里新出现的链接并按图片规则异步替换。返回清理函数 */
export function startImageLinks(): () => void {
  const seen = new WeakSet<Element>();
  let raf = 0;

  const scan = () => {
    raf = 0;
    if (!loadImageRules().some((r) => r.enabled)) return;
    document.querySelectorAll<HTMLAnchorElement>(SELECTOR).forEach((a) => {
      if (seen.has(a) || a.children.length > 0) return;
      if (!/^https?:/.test(a.href) || getInnerText(a).trim() !== a.href) return;
      seen.add(a);
      process(a).catch((e) => console.warn('[v2ex-enhancement] 图片链接替换失败', e));
    });
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(scan);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
  return () => {
    observer.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}
