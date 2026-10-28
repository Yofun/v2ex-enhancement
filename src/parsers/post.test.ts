import { beforeEach, describe, expect, it } from 'vitest';

import { getDefaultPost } from '@/core/constants';
import { initSession } from '@/services/session-init';
import { loadFixtureDom } from '@/test/test-utils';

import { getPostAllReplies, parsePageReplies, parsePostContent, parseReplyContent } from './post';

describe('parseReplyContent', () => {
  it('没有 @ 时返回空', () => {
    expect(parseReplyContent('普通回复')).toEqual({ users: [], floor: -1 });
    expect(parseReplyContent('')).toBeUndefined();
  });

  it('单个 @ 且带楼层', () => {
    const str = '@<a href="/member/alice">alice</a> #12 你好';
    expect(parseReplyContent(str)).toEqual({ users: ['alice'], floor: 12 });
  });

  it('单个 @ 不带楼层', () => {
    expect(parseReplyContent('@<a href="/member/alice">alice</a> 你好')).toEqual({
      users: ['alice'],
      floor: -1,
    });
  });

  it('多个 @ 时不解析楼层', () => {
    const str = '@<a href="/member/alice">alice</a> #3 @<a href="/member/bob">bob</a> #5';
    expect(parseReplyContent(str)).toEqual({ users: ['alice', 'bob'], floor: -1 });
  });

  it('@ 后带 ul 的头像弹层也能识别楼层', () => {
    const str = '@<a href="/member/alice">alice</a><ul class="x"><li>1</li></ul> #7 内容';
    expect(parseReplyContent(str)).toEqual({ users: ['alice'], floor: 7 });
  });
});

describe.each(['topic_1252074.html', 'topic_1252085.html'])('解析 %s', (file) => {
  beforeEach(() => {
    initSession();
  });

  it('parsePageReplies：楼层、@用户、字段完整', () => {
    const { body } = loadFixtureDom(file);
    const nodes = Array.from(body.querySelectorAll('#Main .cell[id^="r_"]'));
    expect(nodes).toHaveLength(100);
    const replies = parsePageReplies(nodes);
    expect(replies).toHaveLength(100);
    expect(replies.map((r) => r.floor)).toEqual(nodes.map((_, i) => i + 1));
    expect(new Set(replies.map((r) => r.id)).size).toBe(100);

    replies.forEach((r, i) => {
      const node = nodes[i];
      expect(r.id).toBe(node.id.replace('r_', ''));
      expect(r.username).toBe(node.querySelector('strong a')!.textContent);
      expect(r.date).toBe(node.querySelector('.ago')!.textContent);
      expect(r.reply_content).toBe(node.querySelector('.reply_content')!.innerHTML);
      const atCount = [...r.reply_content.matchAll(/@<a href="\/member\/([^'" ]+)/g)].length;
      expect(r.replyUsers).toHaveLength(atCount);
      expect(r.isOp).toBe(!!node.querySelector('.op'));
      expect(r.isDup).toBe(false);
      expect(r.children).toEqual([]);
      const thank = node.querySelector('.small');
      expect(r.thankCount).toBe(thank ? Number(thank.textContent) : 0);
      if (r.replyUsers.length !== 1) expect(r.replyFloor).toBe(-1);
    });
    expect(replies.some((r) => r.replyUsers.length === 1)).toBe(true);
    expect(replies.some((r) => r.replyFloor > 0)).toBe(true);
  });

  it('parsePostContent：标题、节点、作者、头部模板', async () => {
    const { html, body } = loadFixtureDom(file);
    const post = await parsePostContent(getDefaultPost({ id: '1' }), body, html);
    expect(post.title).toBe(body.querySelector('#Main h1')!.textContent!.trim());
    expect(post.title).not.toBe('');
    const nodeLink = body.querySelector<HTMLAnchorElement>('#Main .header a[href^="/go/"]')!;
    expect(post.node.title).toBe(nodeLink.textContent);
    expect(post.node.title).not.toBe('');
    expect(post.node.url).toBe(nodeLink.href);
    expect(post.member.username).toBe(
      body.querySelector('#Main .header small.gray a:nth-child(1)')!.textContent,
    );
    expect(post.createDateAgo).not.toBe('');
    expect(post.member.avatar_large).toContain('http');
    expect(post.once).toMatch(/^\d+$/);
    expect(post.isReport).toBe(false);
    expect(post.headerTemplate).not.toContain('class="header"');
    expect(post.headerTemplate).toContain('topic_content');
  });

  it('getPostAllReplies：多页回复合并并生成列表', async () => {
    const { html, body } = loadFixtureDom(file);
    const post = getDefaultPost({ id: '1' });
    const pages = Array.from(body.querySelectorAll('a.page_normal'));
    // 其它页走网络请求，这里只验证存在分页时单页解析路径：把分页信息去掉后按单页处理
    pages.forEach((p) => p.remove());
    const res = await getPostAllReplies(post, body, html, 1);
    expect(res.replyList.length).toBeGreaterThan(0);
    expect(res.replyCount).toBe(res.replyList.length);
    expect(res.allReplyUsers.length).toBeGreaterThan(0);
    expect(res.nestedReplies.length).toBeGreaterThan(0);
    expect(res.fr).toBeDefined();
  });
});
