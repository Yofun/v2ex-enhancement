import { describe, expect, it } from 'vitest';

import type { ImageRule } from './image-rules';
import {
  applyImageRules,
  createImageRule,
  resolveImageUrls,
  runImageRule,
  runImageRuleAsync,
} from './image-rules';

const base = (over: Partial<ImageRule>): ImageRule => ({
  ...createImageRule(),
  enabled: true,
  ...over,
});
const URL1 = 'https://i.imgur.com/Uk7Ztv5.jpeg';

describe('image rules', () => {
  it('replace 模式按正则改写', () => {
    const rule = base({ replacement: 'https://proxy.test/$1' });
    expect(applyImageRules(URL1, [rule])).toBe('https://proxy.test/Uk7Ztv5.jpeg');
  });

  it('不匹配或未启用时不处理', () => {
    expect(applyImageRules('https://a.com/x.png', [base({})])).toBeNull();
    expect(applyImageRules(URL1, [base({ enabled: false })])).toBeNull();
  });

  it('script 模式：返回新 URL，空值表示不处理', () => {
    const rule = base({ mode: 'script', script: "return url.replace('i.imgur.com', 'img.test');" });
    expect(applyImageRules(URL1, [rule])).toBe('https://img.test/Uk7Ztv5.jpeg');
    const none = base({ mode: 'script', script: 'return null;' });
    expect(applyImageRules(URL1, [none])).toBeNull();
  });

  it('script 可使用 match 捕获组；match 为空时匹配所有', () => {
    const rule = base({
      mode: 'script',
      match: '',
      script: "return 'https://x.test/' + url.length;",
    });
    expect(applyImageRules('https://a.com/1.png', [rule])).toBe('https://x.test/19');
  });

  it('命中第一条即停止', () => {
    const a = base({ replacement: 'https://a.test/$1' });
    const b = base({ replacement: 'https://b.test/$1' });
    expect(applyImageRules(URL1, [a, b])).toBe('https://a.test/Uk7Ztv5.jpeg');
  });

  it('错误规则不抛异常，且被跳过', () => {
    const bad = base({ mode: 'script', script: 'throw new Error("boom")' });
    expect(runImageRule(bad, URL1).error).toBe('boom');
    const badRe = base({ match: '(' });
    expect(runImageRule(badRe, URL1).error).toBeTruthy();
    const good = base({ replacement: 'https://ok.test/$1' });
    expect(applyImageRules(URL1, [bad, badRe, good])).toBe('https://ok.test/Uk7Ztv5.jpeg');
  });

  it('含 await 的脚本：同步路径跳过，异步路径可用，并支持返回多个 URL', async () => {
    const rule = base({
      mode: 'script',
      match: '^https://imgur\\.com/a/',
      script:
        "const x = await Promise.resolve(['a', 'b']); return x.map((i) => 'https://i.test/' + i);",
    });
    const album = 'https://imgur.com/a/abc';
    expect(applyImageRules(album, [rule])).toBeNull();
    expect(runImageRule(rule, album).error).toBeUndefined();
    expect((await runImageRuleAsync(rule, album)).urls).toEqual([
      'https://i.test/a',
      'https://i.test/b',
    ]);
    expect(await resolveImageUrls(album, [rule])).toEqual(['https://i.test/a', 'https://i.test/b']);
    expect(await resolveImageUrls('https://other.test/x', [rule])).toBeNull();
  });

  it('脚本可通过 ctx.fetchText 读取页面；出错时 resolveImageUrls 跳过该规则', async () => {
    const bad = base({ mode: 'script', match: '', script: 'throw new Error("x")' });
    const ok = base({
      mode: 'script',
      match: '',
      script: "return typeof ctx.fetchText === 'function' ? 'https://ok.test/1.png' : null;",
    });
    expect(await resolveImageUrls('https://a.test/p', [bad, ok])).toEqual([
      'https://ok.test/1.png',
    ]);
  });
});
