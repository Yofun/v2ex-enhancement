import { beforeEach, describe, expect, it } from 'vitest';

import { setNativeBoxesDisplay } from './dom';

const mount = (boxes: string) => {
  document.body.innerHTML = `<div id="Wrapper"><div id="Main">${boxes}</div></div>`;
};
const box = (id: string, inner = '') => `<div class="box" id="${id}">${inner}</div>`;
const display = (id: string) => document.getElementById(id)!.style.display;

describe('setNativeBoxesDisplay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('隐藏前三个原生 .box，之后能恢复', () => {
    mount(box('a') + box('b') + box('c'));
    setNativeBoxesDisplay('none');
    expect(['a', 'b', 'c'].map(display)).toEqual(['none', 'none', 'none']);
    setNativeBoxesDisplay('');
    expect(['a', 'b', 'c'].map(display)).toEqual(['', '', '']);
  });

  it('回复框被多出来的 .box 挤到第四个以后时，仍然隐藏它', () => {
    mount(
      box('topic') +
        box('extra') +
        box('replies') +
        box('form', '<textarea id="reply_content"></textarea>'),
    );
    setNativeBoxesDisplay('none');
    expect(display('form')).toBe('none');
  });

  it('第四个以后不含输入框的 .box 保持原样', () => {
    mount(box('a') + box('b') + box('c') + box('d', '<div>相关主题</div>'));
    setNativeBoxesDisplay('none');
    expect(display('d')).toBe('');
  });

  it('不动脚本自己的 #app 里的 .box', () => {
    mount(
      box('a') +
        '<section id="app">' +
        box('mine', '<textarea></textarea>') +
        '</section>' +
        box('b') +
        box('c'),
    );
    setNativeBoxesDisplay('none');
    expect(display('mine')).toBe('');
    expect(['a', 'b', 'c'].map(display)).toEqual(['none', 'none', 'none']);
  });
});
