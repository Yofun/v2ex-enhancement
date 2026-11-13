const BODY_REG = /<body[^>]*>([\s\S]+?)<\/body>/g;

/** jsdom 等环境没有 innerText，退回 textContent（未渲染的节点两者一致） */
export function getInnerText(el: Element): string {
  return (el as HTMLElement).innerText ?? el.textContent ?? '';
}

/** 从 HTML 字符串里取出 <body> 并生成 DOM（原 functions.genDomFromHtmlString） */
export function genDomFromHtmlString(htmlText: string): HTMLElement {
  const bodyText = htmlText.match(BODY_REG);
  if (!bodyText) throw new Error('[V2EX enhancement] 无法从 HTML 中解析 body');
  const body = document.createElement('html');
  body.innerHTML = bodyText[0];
  return body;
}

/** 请求页面并解析成 DOM，替代原来的 `$.get(url).then(r => $(r.match(body)[0]))` */
export async function fetchBody(url: string): Promise<HTMLElement> {
  const res = await fetch(url);
  if (!res.ok)
    throw Object.assign(new Error(`[V2EX enhancement] 请求失败 ${res.status}`), {
      status: res.status,
    });
  return genDomFromHtmlString(await res.text());
}

export function htmlToElement(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

/**
 * 显示 / 隐藏 V2EX 原生的主题内容区，由脚本自己的楼中楼详情取代。
 * 原生的主题、回复列表、回复框依次是 #Main 下前三个 .box，但页面偶尔会多出别的 .box，
 * 把回复框挤到第四个以后，只按位置取前三个就会漏掉它，页面上出现两个回复输入框。
 * 所以除了前三个，还要处理含 textarea 的 .box（原生回复框）。脚本自己的 #app 不动。
 */
export function setNativeBoxesDisplay(display: '' | 'none'): void {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('#Wrapper #Main .box')).filter(
    (box) => !box.closest('#app'),
  );
  boxes.forEach((box, i) => {
    if (i < 3 || box.querySelector('textarea')) box.style.display = display;
  });
}
