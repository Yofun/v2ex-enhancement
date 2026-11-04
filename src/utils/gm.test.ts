import { afterEach, describe, expect, it, vi } from 'vitest';

import { gmGetText } from './gm';

// 测试环境的 `$` 桩模拟的是“没有任何 GM_* 授权”
describe('gmGetText 没有 GM_xmlhttpRequest 时', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('跨域请求直接说明原因，不发注定失败的 fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(gmGetText('https://imgur.com/x.json')).rejects.toThrow(/GM_xmlhttpRequest 不可用/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('同源请求仍然可以走 fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') }),
    );
    await expect(gmGetText(`${location.origin}/x`)).resolves.toBe('ok');
  });
});
