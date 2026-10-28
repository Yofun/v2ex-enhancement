const BODY_REG = /<body[^>]*>([\s\S]+?)<\/body>/g;

/** jsdom 等环境没有 innerText，退回 textContent（未渲染的节点两者一致） */
export function getInnerText(el: Element): string {
  return (el as HTMLElement).innerText ?? el.textContent ?? '';
}

/** 从 HTML 字符串里取出 <body> 并生成 DOM（原 functions.genDomFromHtmlString） */
export function genDomFromHtmlString(htmlText: string): HTMLElement {
  const bodyText = htmlText.match(BODY_REG);
  if (!bodyText) throw new Error('[v2ex-enhancement] 无法从 HTML 中解析 body');
  const body = document.createElement('html');
  body.innerHTML = bodyText[0];
  return body;
}

/** 请求页面并解析成 DOM，替代原来的 `$.get(url).then(r => $(r.match(body)[0]))` */
export async function fetchBody(url: string): Promise<HTMLElement> {
  const res = await fetch(url);
  if (!res.ok)
    throw Object.assign(new Error(`[v2ex-enhancement] 请求失败 ${res.status}`), {
      status: res.status,
    });
  return genDomFromHtmlString(await res.text());
}

export function htmlToElement(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}
