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
  /** script 模式：函数体，参数 (url, match)，返回新 URL；返回空值表示不处理 */
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

/** 对单条规则求值，不抛异常：出错时 error 有值、url 保持原样 */
export function runImageRule(rule: ImageRule, url: string): RuleResult {
  try {
    const m = rule.match ? compile(rule.match).exec(url) : null;
    if (rule.match && !m) return { url };
    if (rule.mode === 'replace') {
      return { url: url.replace(compile(rule.match), rule.replacement), ruleId: rule.id };
    }
    const fn = new Function('url', 'match', rule.script) as (
      url: string,
      match: RegExpExecArray | null,
    ) => unknown;
    const out = fn(url, m);
    if (typeof out === 'string' && out && out !== url) return { url: out, ruleId: rule.id };
    return { url };
  } catch (e) {
    return { url, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 按顺序执行已启用的规则，命中第一条即停止；没有命中返回 null */
export function applyImageRules(url: string, rules: ImageRule[] = loadImageRules()): string | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const res = runImageRule(rule, url);
    if (res.ruleId && !res.error) return res.url;
  }
  return null;
}
