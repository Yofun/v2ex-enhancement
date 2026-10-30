import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDefaultConfig } from '@/core/constants';
import { initSession } from '@/services/session-init';

import { applyDynamicStyle, buildDynamicStyle, removeDynamicStyle } from './dynamic-style';

describe('dynamic style', () => {
  beforeEach(() => {
    initSession();
  });
  afterEach(() => {
    removeDynamicStyle();
  });

  it('simple 视图与自定义背景色体现在样式里', () => {
    // 简洁模式的标志：隐藏节点/作者/时间，只留标题
    expect(buildDynamicStyle(getDefaultConfig())).not.toContain('.topic_info{display:none;}');
    const css = buildDynamicStyle(
      getDefaultConfig({ viewType: 'simple', customBgColor: '#abcdef' }),
    );
    expect(css).toContain('.topic_info{display:none;}');
    expect(css).toContain('background: #abcdef !important');
  });

  it('applyDynamicStyle 只维护一个 style 元素并在 config 变化时更新', () => {
    applyDynamicStyle(getDefaultConfig());
    expect(document.querySelectorAll('style')).toHaveLength(1);
    applyDynamicStyle(getDefaultConfig({ customBgColor: '#123456' }));
    expect(document.querySelectorAll('style')).toHaveLength(1);
    expect(document.querySelector('style')!.textContent).toContain('#123456');
    removeDynamicStyle();
    expect(document.querySelectorAll('style')).toHaveLength(0);
  });
});
