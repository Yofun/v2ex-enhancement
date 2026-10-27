const EMAIL_SELECTOR = '.__cf_email__';
const EMAIL_ATTR = 'data-cfemail';

function parseHexByte(hex: string, index: number): number {
  return parseInt(hex.substring(index, index + 2), 16);
}

// Cloudflare 邮箱保护：首字节为异或密钥，其余字节逐个异或还原
function decodeHref(encoded: string): string {
  const key = parseHexByte(encoded, 0);
  let result = '';
  for (let i = 2; i < encoded.length; i += 2) {
    result += String.fromCharCode(parseHexByte(encoded, i) ^ key);
  }
  try {
    result = decodeURIComponent(escape(result));
  } catch (e) {
    console.error(e);
  }
  const holder = document.createElement('div');
  holder.innerHTML = '<a href="' + result.replace(/"/g, '&quot;') + '"></a>';
  return (holder.childNodes[0] as Element).getAttribute('href') || '';
}

/** 把 body 内被 Cloudflare 混淆的邮箱节点替换为解码后的文本 */
export function decodeEmail(body: ParentNode): void {
  try {
    body.querySelectorAll(EMAIL_SELECTOR).forEach((el) => {
      try {
        const encoded = el.getAttribute(EMAIL_ATTR);
        if (encoded) {
          el.parentNode?.replaceChild(document.createTextNode(decodeHref(encoded)), el);
        }
      } catch (e) {
        console.error(e);
      }
    });
  } catch (e) {
    console.error(e);
  }
}
