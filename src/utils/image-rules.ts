import { gmGetText } from './gm';

export type ImageRuleMode = 'replace' | 'script';

export interface ImageRule {
  id: string;
  name: string;
  enabled: boolean;
  /** 正则源码，对完整 URL 做不区分大小写匹配；script 模式下留空表示匹配所有 */
  match: string;
  mode: ImageRuleMode;
  /** replace 模式：String.replace 的替换串，支持 $1 等 */
  replacement: string;
  /**
   * script 模式：函数体，参数 (url, match, ctx)。可使用 await 和 ctx.fetchText(url)。
   * 返回新 URL（字符串）或多个 URL（字符串数组）；返回空值表示不处理。
   * 不含 await 的脚本也会对 <img> 和带扩展名的链接即时生效；用到 await 的只对纯文本链接生效。
   */
  script: string;
}

export interface RuleResult {
  url: string;
  ruleId?: string;
  error?: string;
}

const STORAGE_KEY = 'v2next-image-rules';

let cache: ImageRule[] | null = null;

export function loadImageRules(): ImageRule[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as ImageRule[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function saveImageRules(rules: ImageRule[]): void {
  cache = rules;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function createImageRule(): ImageRule {
  return {
    id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: '新规则',
    enabled: false,
    match: '^https?://i\\.imgur\\.com/(.+)$',
    mode: 'replace',
    replacement: 'https://example.com/$1',
    script: "return url.replace('i.imgur.com', 'example.com');",
  };
}

function compile(match: string): RegExp {
  return new RegExp(match, 'i');
}

export interface RuleContext {
  fetchText: (url: string) => Promise<string>;
}

const ctx: RuleContext = { fetchText: gmGetText };

type ScriptFn = (url: string, match: RegExpExecArray | null, ctx: RuleContext) => unknown;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => ScriptFn;

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  !!v && typeof (v as PromiseLike<unknown>).then === 'function';

function normalize(out: unknown, url: string): string[] {
  const list = (Array.isArray(out) ? out : [out]).filter(
    (v): v is string => typeof v === 'string' && !!v && v !== url,
  );
  return list;
}

function matchOf(rule: ImageRule, url: string): RegExpExecArray | null | false {
  const m = rule.match ? compile(rule.match).exec(url) : null;
  return rule.match && !m ? false : m;
}

/** 对单条规则同步求值，不抛异常：出错时 error 有值、url 保持原样。用到 await 的脚本在这里视为未命中 */
export function runImageRule(rule: ImageRule, url: string): RuleResult {
  try {
    const m = matchOf(rule, url);
    if (m === false) return { url };
    if (rule.mode === 'replace') {
      return { url: url.replace(compile(rule.match), rule.replacement), ruleId: rule.id };
    }
    let fn: ScriptFn;
    try {
      fn = new Function('url', 'match', 'ctx', rule.script) as ScriptFn;
    } catch (e) {
      if (e instanceof SyntaxError && /await/.test(rule.script)) return { url };
      throw e;
    }
    const out = fn(url, m, ctx);
    if (isThenable(out)) return { url };
    const [first] = normalize(out, url);
    return first ? { url: first, ruleId: rule.id } : { url };
  } catch (e) {
    return { url, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 对单条规则异步求值：脚本可 await，可返回多个 URL */
export async function runImageRuleAsync(
  rule: ImageRule,
  url: string,
): Promise<{ urls: string[]; ruleId?: string; error?: string }> {
  try {
    const m = matchOf(rule, url);
    if (m === false) return { urls: [] };
    if (rule.mode === 'replace') {
      return { urls: [url.replace(compile(rule.match), rule.replacement)], ruleId: rule.id };
    }
    const fn = new AsyncFunction('url', 'match', 'ctx', rule.script);
    const urls = normalize(await fn(url, m, ctx), url);
    return urls.length ? { urls, ruleId: rule.id } : { urls: [] };
  } catch (e) {
    return { urls: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** 按顺序同步执行已启用的规则，命中第一条即停止；没有命中返回 null */
export function applyImageRules(url: string, rules: ImageRule[] = loadImageRules()): string | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const res = runImageRule(rule, url);
    if (res.ruleId && !res.error) return res.url;
  }
  return null;
}

/** 按顺序异步执行已启用的规则，命中第一条即停止；没有命中返回 null */
export async function resolveImageUrls(
  url: string,
  rules: ImageRule[] = loadImageRules(),
): Promise<string[] | null> {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const res = await runImageRuleAsync(rule, url);
    if (res.error) console.warn(`[v2ex-enhancement] 图片规则「${rule.name}」出错：${res.error}`);
    if (res.urls.length) return res.urls;
  }
  return null;
}
