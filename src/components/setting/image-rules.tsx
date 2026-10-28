import { useMemo, useState } from 'react';

import { BaseButton } from '@/components/base/base-button';
import { BaseSwitch } from '@/components/base/base-switch';
import { Icon } from '@/components/base/icon';
import type { ImageRule } from '@/utils/image-rules';
import { createImageRule, loadImageRules, runImageRule, saveImageRules } from '@/utils/image-rules';

import styles from './image-rules.module.scss';

const SAMPLE_URL = 'https://i.imgur.com/Uk7Ztv5.jpeg';

export function ImageRules() {
  const [rules, setRules] = useState<ImageRule[]>(() => loadImageRules());
  const [testUrl, setTestUrl] = useState(SAMPLE_URL);

  const commit = (next: ImageRule[]) => {
    setRules(next);
    saveImageRules(next);
  };
  const update = (id: string, patch: Partial<ImageRule>) =>
    commit(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => commit(rules.filter((r) => r.id !== id));

  const results = useMemo(() => {
    const out = new Map<string, { url: string; hit: boolean; error?: string }>();
    let settled = false;
    for (const rule of rules) {
      const res = runImageRule(rule, testUrl);
      const hit = rule.enabled && !!res.ruleId && !res.error && !settled;
      if (hit) settled = true;
      out.set(rule.id, { url: res.url, hit, error: res.error });
    }
    return out;
  }, [rules, testUrl]);

  return (
    <div className={styles.root}>
      <div className={styles.desc}>
        在图片加载前改写地址，用于换成可访问的代理或镜像；改写后仍加载失败时会还原为原始链接。规则按顺序执行，命中第一条即停止。规则保存在本地浏览器，不会同步到
        V2EX。修改后需刷新页面生效。
      </div>

      <div className={styles.tester}>
        <label>测试地址</label>
        <input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} />
      </div>

      {rules.map((rule, index) => {
        const res = results.get(rule.id);
        return (
          <div key={rule.id} className={styles.card}>
            <div className={styles.head}>
              <input
                className={styles.name}
                value={rule.name}
                onChange={(e) => update(rule.id, { name: e.target.value })}
              />
              <span className={styles.index}>#{index + 1}</span>
              <BaseSwitch
                modelValue={rule.enabled}
                onUpdateModelValue={(v) => update(rule.id, { enabled: v })}
              />
              <Icon
                icon="ic:round-close"
                className={styles.remove}
                onClick={() => remove(rule.id)}
              />
            </div>

            <div className={styles.field}>
              <label>匹配（正则）</label>
              <input
                value={rule.match}
                placeholder={rule.mode === 'script' ? '留空匹配所有' : '必填'}
                onChange={(e) => update(rule.id, { match: e.target.value })}
              />
            </div>

            <div className={styles.field}>
              <label>方式</label>
              <div className={styles.modes}>
                {(['replace', 'script'] as const).map((mode) => (
                  <span
                    key={mode}
                    className={rule.mode === mode ? styles.active : undefined}
                    onClick={() => update(rule.id, { mode })}
                  >
                    {mode === 'replace' ? '替换' : '脚本'}
                  </span>
                ))}
              </div>
            </div>

            {rule.mode === 'replace' ? (
              <div className={styles.field}>
                <label>替换为</label>
                <input
                  value={rule.replacement}
                  placeholder="如 https://proxy.example/$1"
                  onChange={(e) => update(rule.id, { replacement: e.target.value })}
                />
              </div>
            ) : (
              <div className={styles.field}>
                <label>
                  函数体
                  <small>参数 url、match，返回新地址，返回空值表示不处理</small>
                </label>
                <textarea
                  value={rule.script}
                  spellCheck={false}
                  rows={4}
                  onChange={(e) => update(rule.id, { script: e.target.value })}
                />
              </div>
            )}

            <div className={styles.result}>
              {res?.error ? (
                <span className={styles.error}>出错：{res.error}</span>
              ) : res?.hit ? (
                <span className={styles.hit}>测试结果：{res.url}</span>
              ) : (
                <span className={styles.miss}>
                  {rule.enabled ? '测试地址未命中（或已被前面的规则处理）' : '未启用'}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <BaseButton type="primary" onClick={() => commit([...rules, createImageRule()])}>
        添加规则
      </BaseButton>
    </div>
  );
}
