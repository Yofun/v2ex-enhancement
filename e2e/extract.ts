import type { Page } from '@playwright/test';

export interface CommentNode {
  floor: number;
  username: string;
  /** 最近的、带 data-floor 的祖先（楼中楼父级）；顶层为 null */
  parent: number | null;
  text: string;
  /** 头部整体文本（用户名、时间、OP/MOD 徽标、感谢数、楼层） */
  authorText: string;
  avatar: string;
  /** reply_content 的 HTML（去掉注释、data-v-* 属性、空白折叠） */
  html: string;
  /** 规范化后的 class（去掉 CSS Modules 哈希） */
  cls: string[];
  /** 所在区域：热门回复 / 普通 */
  area: 'top' | 'list';
}

/**
 * 把渲染出的评论抽成规范化的平铺列表（文档顺序）。
 * 原脚本用 data-v 作用域样式、还原版用 CSS Modules，选择器只能依赖 data-floor、
 * reply_content 与（含 username 子串的）class 这类两边共有的语义锚点。
 */
export async function extractComments(page: Page): Promise<CommentNode[]> {
  return page.evaluate(() => {
    const norm = (c: string) =>
      c
        .replace(/^_(.+?)_[a-z0-9]{5,}(?:_\d+)?$/, '$1')
        .replace(/-/g, '')
        .toLowerCase();
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('#app [data-floor]'));
    const own = (root: HTMLElement, sel: string): HTMLElement | undefined =>
      Array.from(root.querySelectorAll<HTMLElement>(sel)).find(
        (el) => el.closest('[data-floor]') === root,
      );
    return nodes.map((el) => {
      const parentEl = el.parentElement?.closest<HTMLElement>('[data-floor]') ?? null;
      const user = own(el, '[class*="username"]');
      const content = own(el, '.reply_content');
      const author = own(el, '.Author, [class*="_author_"]');
      const avatarImg = author?.querySelector('img');
      const html = (content?.innerHTML ?? '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/ data-v-[0-9a-f]+=""/g, '')
        .replace(/ class=""/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        authorText: (author?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        avatar: avatarImg?.getAttribute('src') ?? '',
        html,
        floor: Number(el.dataset.floor),
        username: user?.textContent?.trim() ?? '',
        parent: parentEl ? Number(parentEl.dataset.floor) : null,
        text: (content?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        cls: Array.from(el.classList).map(norm).sort(),
        area: content?.classList.contains('top-reply_content')
          ? ('top' as const)
          : ('list' as const),
      };
    });
  });
}

/** 等到评论渲染稳定（数量连续两次不变且 > 0） */
export async function waitCommentsStable(page: Page, min = 1): Promise<void> {
  await page.waitForFunction(
    (m) => document.querySelectorAll('#app [data-floor]').length >= m,
    min,
    {
      timeout: 15_000,
    },
  );
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const n = await page.locator('#app [data-floor]').count();
    if (n === last) return;
    last = n;
    await page.waitForTimeout(300);
  }
}

/**
 * 把页面（去掉脚本自己的 #app 与 <style>/<script>）序列化为规范化文本：
 * 属性排序、去 data-v-*、去 HTML 注释、CSS Modules 哈希还原、空白折叠。
 * 每个元素一行，便于 diff。
 */
export async function snapshotDom(
  page: Page,
  selector = 'body',
  includeApp = false,
  withStyle = false,
): Promise<string[]> {
  return page.evaluate(
    ([sel, withApp, styled]) => {
      const lines: string[] = [];
      const styleProps = [
        'display',
        'position',
        'visibility',
        'opacity',
        'color',
        'background-color',
        'background-image',
        'font-size',
        'font-weight',
        'font-family',
        'line-height',
        'text-align',
        'text-decoration-line',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'border-top-width',
        'border-top-style',
        'border-top-color',
        'border-bottom-width',
        'border-bottom-style',
        'border-bottom-color',
        'border-left-width',
        'border-left-color',
        'border-right-width',
        'border-right-color',
        'border-top-left-radius',
        'width',
        'height',
        'min-width',
        'max-width',
        'min-height',
        'overflow-x',
        'overflow-y',
        'z-index',
        'flex-direction',
        'flex-wrap',
        'flex-grow',
        'justify-content',
        'align-items',
        'gap',
        'cursor',
        'box-shadow',
        'transform',
        'white-space',
        'top',
        'left',
        'right',
        'bottom',
        'box-sizing',
        'word-break',
      ];
      // 已核对为等价的有意差异：isPostPage 是原 .Post 全局样式的 CSS Modules 对应物；
      // expand-line 上的 left、BaseButton 的 normal、label 的 item-title 在原样式里无任何规则；
      // fade 是还原版 <Transition> 等效实现的常驻基类（淡出由 hidden 控制）
      // 受控说明见 ignoredClasses；原脚本编辑器根节点 class 是 post-editor-wrapper，还原版是 CSS Modules 的 wrapper
      const aliasClass: Record<string, string> = { posteditorwrapper: 'wrapper' };
      const ignoredClasses = new Set([
        'ispostpage',
        'left',
        'v2nextscrolltop',
        'scrolltop',
        'itemtitle',
        'fade',
        'normal',
        'editor',
        'nocomments',
        'input',
      ]);
      const normClass = (c: string) =>
        c
          .replace(/^_(.+?)_[a-z0-9]{5,}(?:_\d+)?$/, '$1')
          .replace(/[-_]/g, '')
          .toLowerCase();
      const walkChildren = (el: Node, depth: number) => {
        // 相邻文本节点合并（React 会把 `共有{n} 条回复` 拆成多个文本节点）
        let buf = '';
        const flush = () => {
          const t = buf
            .replace(/[ \t\r\n\f]+/g, ' ')
            .trim()
            .replace(/^V2EX Enhancement$/, 'V2EX Next');
          if (t) lines.push(`${' '.repeat(depth)}"${t}"`);
          buf = '';
        };
        el.childNodes.forEach((c) => {
          if (c.nodeType === Node.TEXT_NODE) {
            buf += c.textContent ?? '';
          } else if (c.nodeType === Node.COMMENT_NODE) {
            // Vue 的 v-if 占位注释，不影响文本相邻关系
          } else {
            flush();
            walk(c, depth);
          }
        });
        flush();
      };
      const walk = (node: Node, depth: number) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'noscript' ||
          (el.id === 'app' && !withApp)
        )
          return;
        // toast 容器内容随时间消失，由 harness 记录弹出过的文案另行比较
        if (/^(_msgs_|msgs$)/.test((el.getAttribute('class') ?? '').split(/\s+/)[0])) {
          lines.push(`${' '.repeat(depth)}<${tag} class="msgs">`);
          return;
        }
        // 有意的品牌改动：去掉安卓 App 入口、官网链接；“关于”页的链接/说明/标题改为本仓库
        if (tag === 'a' && el.querySelector(':scope > i.fa-android')) return;
        if (tag === 'a' && /vtonext\.vercel\.app/.test(el.getAttribute('href') ?? '')) return;
        if (/project-?desc|tips2/i.test(el.getAttribute('class') ?? '')) {
          lines.push(`${' '.repeat(depth)}<${tag} class="about-branding">`);
          return;
        }
        // 有意差异：还原版新增“图片”tab（用户图片规则）；省略“插件”tab 只剩“v2新帖挂件”（依赖 loadAndRunScript 远程执行，未移植）和两个重复项
        if (
          /tab/i.test(el.getAttribute('class') ?? '') &&
          ['插件', '图片'].includes(el.textContent?.trim() ?? '')
        )
          return;
        // 仅用于 display: contents 的纯包装 span（Tooltip 等）不参与布局，拍平
        if (
          tag === 'span' &&
          el.getAttribute('style')?.replace(/\s/g, '') === 'display:contents;' &&
          el.attributes.length === 1
        ) {
          walkChildren(el, depth);
          return;
        }
        // PopConfirm：原脚本把 v-show 落在其根 span 上，还原版在外面多包了一层 display:none 的 span
        if (
          tag === 'span' &&
          el.getAttribute('style')?.replace(/\s/g, '') === 'display:none;' &&
          el.attributes.length === 1
        ) {
          const kids = Array.from(el.children);
          const inner = kids[0];
          if (kids.length === 1 && inner.tagName === 'SPAN' && inner.attributes.length === 0) {
            lines.push(`${' '.repeat(depth)}<span style="display: none;">`);
            walkChildren(inner, depth + 1);
            return;
          }
        }
        // 图标：原脚本用 iconify 内联 SVG，还原版用另一套实现，只比较存在与否
        if (tag === 'svg') {
          lines.push(`${' '.repeat(depth)}<svg>`);
          return;
        }
        const attrs = Array.from(el.attributes)
          .filter((a) => !a.name.startsWith('data-v-'))
          // textarea 高度由 autosize 之类的运行时逻辑得出，两边实现不同，不比较
          .filter((a) => !(tag === 'textarea' && a.name === 'style'))
          // sticky 条的 stuck 由 IntersectionObserver 随滚动位置切换，与布局时机有关
          .filter((a) => a.name !== 'stuck')
          // 原脚本把 replyInfo prop 透传成了根节点的 replyinfo 属性
          .filter((a) => a.name !== 'replyinfo')
          // 还原版给 target=_blank 链接补了 rel=noreferrer
          .filter((a) => !(tag === 'a' && a.name === 'rel' && a.value === 'noreferrer'))
          // React 受控 input 会把 value 反映为属性，Vue 只设 DOM 属性
          .filter((a) => !(tag === 'input' && a.name === 'value'))
          // img 的展示型旧属性在还原版的 JSX 里不再保留（CSS 已覆盖）
          .filter((a) => !(tag === 'img' && (a.name === 'align' || a.name === 'border')))
          .map((a) => {
            let v = a.value;
            // 表情包 src：原脚本读取非响应式的 window.config，切换“imgur 换源”后不会立刻重渲；
            // 还原版随渲染读取最新值（属于更合理的行为），这里抹平代理前缀
            if (tag === 'img' && a.name === 'src') {
              v = v.replace('https://img.noobzone.ru/getimg.php?url=', '');
            }
            if (a.name === 'class')
              v = Array.from(
                new Set(
                  v
                    .split(/\s+/)
                    .filter(Boolean)
                    .map(normClass)
                    .map((c) => aliasClass[c] ?? c)
                    .filter((c) => !ignoredClasses.has(c) && !/^editorid\d+$/.test(c))
                    // 原脚本给编辑器根节点加了 isNight，但没有任何样式规则引用它
                    .filter(
                      (c) =>
                        !(
                          c === 'isnight' &&
                          /reply-?(post|comment)/i.test(el.getAttribute('class') ?? '')
                        ),
                    )
                    // 编辑器工具栏里的 .right 在原样式中没有规则
                    .filter((c) => !(c === 'right' && el.closest('[class*="toolbar"]'))),
                ),
              )
                .sort()
                .join(' ');
            v = v.replace(
              'https://github.com/zyronon/V2Next',
              'https://github.com/Yofun/v2ex-enhancement',
            );
            if (a.name === 'style') v = v.replace(/\s+/g, ' ').trim();
            // @ 提示框的 left 取自输入事件当下（DOM 尚未重渲）的光标位置，Vue/React 的刷新时机不同，差一个字符宽
            if (a.name === 'style' && /call-?list/i.test(el.getAttribute('class') ?? ''))
              v = v.replace(/left:[^;]+;?/, '');
            return `${a.name}=${JSON.stringify(v.replace(/\s+/g, ' ').trim())}`;
          })
          .filter((a) => a !== 'class=""' && a !== 'style=""')
          .sort();
        // 表单控件比较真实的 value 属性，而不是 HTML 属性/文本子节点（React 会把 textarea 初始值写成子节点）
        if (tag === 'textarea')
          attrs.push(`value=${JSON.stringify((el as HTMLTextAreaElement).value)}`);
        let styleText = '';
        if (styled) {
          const cs = getComputedStyle(el);
          styleText =
            ' {' +
            styleProps
              .map((k) => `${k}:${cs.getPropertyValue(k)}`)
              .filter((x) => !x.endsWith(':'))
              .join(';') +
            '}';
        }
        lines.push(
          `${' '.repeat(depth)}<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${styleText}`,
        );
        if (tag !== 'textarea') walkChildren(el, depth + 1);
      };
      const root = document.querySelector(sel);
      if (root) walk(root, 0);
      return lines;
    },
    [selector, includeApp, withStyle] as const,
  );
}

/**
 * 比较带计算样式的快照，输出去重后的“元素 + 属性: 原值 -> 还原值”清单，空数组表示一致。
 * 结构不一致时返回结构差异（此时样式比较没有意义）。
 */
export function diffStyled(orig: string[], rest: string[]): string[] {
  const split = (line: string) => {
    const m = /^(\s*<[^>]*>)(?: \{(.*)\})?$/.exec(line);
    if (!m) return { head: line, props: new Map<string, string>() };
    const props = new Map<string, string>();
    // 属性值里可能含有 ; 与 :（如 font-family、url），按 `;名字:` 边界切分
    (m[2] ?? '').split(/;(?=[a-z-]+:)/).forEach((kv) => {
      const i = kv.indexOf(':');
      if (i > 0) props.set(kv.slice(0, i), kv.slice(i + 1));
    });
    return { head: m[1], props };
  };
  const out = new Map<string, number>();
  if (orig.length !== rest.length) {
    return [`行数不同: 原 ${orig.length} / 还原 ${rest.length}`];
  }
  // 用缩进还原祖先链，差异清单里带上最近 3 层，便于定位
  const stack: string[] = [];
  const pathOf = (line: string): string => {
    const depth = line.length - line.trimStart().length;
    stack.length = depth;
    const m = /^\s*<(\w+)(?: [^>]*?class="([^"]*)")?/.exec(line);
    stack[depth] = m ? `${m[1]}${m[2] ? '.' + m[2].replace(/ /g, '.') : ''}` : '';
    return stack
      .slice(Math.max(0, depth - 3), depth)
      .filter(Boolean)
      .join(' > ');
  };
  for (let i = 0; i < orig.length; i++) {
    const path = pathOf(orig[i]);
    const a = split(orig[i]);
    const b = split(rest[i]);
    if (a.head !== b.head) return [`结构不同 @${i}: ${a.head.trim()}  vs  ${b.head.trim()}`];
    // PopConfirm 的 display:none 包装只存在于还原版，没有样式文本
    if (!b.props.size || !a.props.size) continue;
    for (const [k, v] of a.props) {
      const w = b.props.get(k);
      // img[border=0] 的呈现属性在还原版里不保留：边框宽度同为 0 时 style 不同没有视觉差别
      if (/^border-.*-style$/.test(k) && a.head.includes('<img')) continue;
      // @ 提示框的位置取自输入事件当下的光标（见 DOM 快照里的说明）
      if (/^(left|right)$/.test(k) && a.head.includes('call')) continue;
      // “关于”页链接行数不同，内容高度随之变化
      if (k === 'height' && path.endsWith('modalcontent > div.scroll')) continue;
      // 有意的品牌改动：设置面板左下角去掉官网图标，图标容器变窄
      if (k === 'width' && a.head.includes('class="icons"')) continue;
      // 去掉安卓入口后，simple 视图下 .top:nth-last-child(5) 的模糊规则不再命中“脚本设置”（未登录时）
      if (a.head.includes('v2nextsetting') || path.includes('v2nextsetting')) continue;
      // 设置面板左侧 tab 栏高度：还原版有意省略“插件”tab（少一行）
      if (k === 'height' && a.head.includes('class="tabs"')) continue;
      // 文本节点切分不同导致的亚像素宽度误差
      if (
        w !== undefined &&
        v !== w &&
        /px$/.test(v) &&
        /px$/.test(w) &&
        Math.abs(parseFloat(v) - parseFloat(w)) < 0.5
      ) {
        continue;
      }
      if (w !== v) {
        const key = `${path} > ${a.head.trim().slice(0, 90)}  ${k}: ${v} -> ${w}`;
        out.set(key, (out.get(key) ?? 0) + 1);
      }
    }
  }
  return [...out].map(([k, n]) => (n > 1 ? `${k}  (x${n})` : k));
}
