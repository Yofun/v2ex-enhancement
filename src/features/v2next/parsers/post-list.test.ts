import { beforeEach, describe, expect, it } from 'vitest';

import { initSession } from '../services/session-init';
import { session } from '../session';
import { loadFixtureDom } from '../test-utils';
import { PageType } from '../types';
import { parsePagePostList } from './post-list';

describe('parsePagePostList', () => {
  beforeEach(() => {
    initSession();
    session.stopMe = true;
  });

  const check = (list: Element[], box: ParentNode) => {
    const items = list.filter((el) => el.querySelector('.item_title'));
    expect(items.length).toBeGreaterThan(10);
    parsePagePostList(list, box);
    items.forEach((el) => {
      const link = el.querySelector<HTMLAnchorElement>('.item_title a')!;
      const id = /\/t\/(\d+)/.exec(link.href)![1];
      expect(el.classList.contains('post-item')).toBe(true);
      expect(el.classList.contains(`id_${id}`)).toBe(true);
      expect((el as HTMLElement).dataset['href']).toBe(link.href);
      const toggle = el.querySelector<HTMLElement>('.toggle')!;
      expect(toggle.textContent).toBe('预览');
      expect(toggle.dataset['id']).toBe(id);
      expect(toggle.parentElement!.style.position).toBe('relative');
    });
    return items.length;
  };

  it('首页列表', () => {
    session.pageType = PageType.Home;
    const { body } = loadFixtureDom('home.html');
    const box = body.querySelector('#Wrapper #Main .box')!;
    check(Array.from(box.querySelectorAll('.item')), box);
    expect(session.postList).toHaveLength(0);
  });

  it('节点页列表', () => {
    session.pageType = PageType.Node;
    const { body } = loadFixtureDom('node.html');
    const boxs = body.querySelectorAll('#Wrapper #Main .box');
    const list = Array.from(boxs[1].querySelector('#TopicsNode')!.querySelectorAll('.cell'));
    check(list, boxs[1]);
  });

  it('卡片视图下把主题登记到 session.postList', () => {
    session.config.viewType = 'card';
    session.pageType = PageType.Home;
    const { body } = loadFixtureDom('home.html');
    const box = body.querySelector('#Wrapper #Main .box')!;
    const count = check(Array.from(box.querySelectorAll('.item')), box);
    expect(session.postList).toHaveLength(count);
    expect(session.postList[0].id).toMatch(/^\d+$/);
    expect(session.postList[0].url).toContain('/api/topics/show.json?id=');
  });
});
