// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { decodeEmail } from './decode-email';

function encode(email: string, key: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return hex(key) + [...email].map((c) => hex(c.charCodeAt(0) ^ key)).join('');
}

describe('decodeEmail', () => {
  it('把混淆的邮箱节点替换为明文文本', () => {
    const root = document.createElement('div');
    root.innerHTML = `<p>联系：<a class="__cf_email__" data-cfemail="${encode('user@example.com', 0x2a)}">[email protected]</a></p>`;
    decodeEmail(root);
    expect(root.querySelector('.__cf_email__')).toBeNull();
    expect(root.textContent).toBe('联系：user@example.com');
  });

  it('忽略没有 data-cfemail 的节点，且不抛错', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="__cf_email__">keep</span>';
    expect(() => decodeEmail(root)).not.toThrow();
    expect(root.textContent).toBe('keep');
  });

  it('转义引号，避免破坏 href 解析', () => {
    const root = document.createElement('div');
    root.innerHTML = `<span class="__cf_email__" data-cfemail="${encode('a"b@c.d', 0x11)}"></span>`;
    decodeEmail(root);
    expect(root.textContent).toBe('a"b@c.d');
  });
});
