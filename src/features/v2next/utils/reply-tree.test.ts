import { beforeEach, describe, expect, it } from 'vitest';

import { parsePageReplies } from '../parsers/post';
import { initSession } from '../services/session-init';
import { loadFixtureDom } from '../test-utils';
import type { Reply } from '../types';
import { oracle } from './__oracle__/reply-tree-orig';
import { functions } from './functions';
import { createNestedList, createNestedRedundantList } from './reply-tree';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function makeReply(
  floor: number,
  username: string,
  replyUsers: string[],
  replyFloor: number,
): Reply {
  return {
    id: String(floor),
    floor,
    level: 0,
    username,
    avatar: '',
    date: '',
    reply_content: '',
    reply_text: '',
    hideCallUserReplyContent: '',
    replyUsers,
    replyFloor,
    thankCount: floor % 7,
    isThanked: false,
    isOp: false,
    isDup: false,
    replyCount: 0,
    children: [],
  };
}

/** 固定种子的随机回复序列：既有指定楼层的回复、也有只 @ 用户、多 @、无 @ 的回复 */
function randomReplies(seed: number, count: number): Reply[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const users = ['a', 'b', 'c', 'd', 'e', 'f'];
  const list: Reply[] = [];
  for (let floor = 1; floor <= count; floor++) {
    const username = users[Math.floor(rnd() * users.length)];
    const kind = rnd();
    if (floor === 1 || kind < 0.25) {
      list.push(makeReply(floor, username, [], -1));
    } else if (kind < 0.7) {
      const target = list[Math.floor(rnd() * list.length)];
      list.push(makeReply(floor, username, [target.username], target.floor));
    } else if (kind < 0.9) {
      list.push(makeReply(floor, username, [users[Math.floor(rnd() * users.length)]], -1));
    } else {
      list.push(makeReply(floor, username, [users[0], users[1]], -1));
    }
  }
  return list;
}

function countNodes(list: Reply[]): number {
  return list.reduce((n, r) => n + 1 + countNodes(r.children), 0);
}

function collectIds(list: Reply[], out: string[] = []): string[] {
  list.forEach((r) => {
    out.push(r.id);
    collectIds(r.children, out);
  });
  return out;
}

function fixtureReplies(name: string): Reply[] {
  const { body } = loadFixtureDom(name);
  return parsePageReplies(Array.from(body.querySelectorAll('#Main .cell[id^="r_"]')));
}

const inputs: [string, () => Reply[]][] = [
  ['topic_1252074', () => fixtureReplies('topic_1252074.html')],
  ['topic_1252085', () => fixtureReplies('topic_1252085.html')],
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((seed): [string, () => Reply[]] => [
    `random#${seed}`,
    () => randomReplies(seed, 80),
  ]),
];

describe('createNestedList 与原算法一致', () => {
  beforeEach(() => {
    initSession();
  });

  it.each(inputs)('%s', (_name, build) => {
    const replies = build();
    expect(replies.length).toBeGreaterThan(0);

    const topA = clone(replies)
      .filter((v) => v.thankCount >= 3)
      .slice(0, 5);
    const topB = clone(topA);
    const expected = oracle.createNestedList(clone(replies), topA);
    const actual = createNestedList(clone(replies), topB);
    expect(actual).toEqual(expected);
    expect(topB).toEqual(topA);

    // 每条回复在树里恰好出现一次
    expect(actual.some((r) => r.children.length > 0)).toBe(true);
    const ids = collectIds(actual);
    expect(ids).toHaveLength(replies.length);
    expect(new Set(ids).size).toBe(replies.length);
    expect(countNodes(actual)).toBe(replies.length);
  });

  it.each(inputs)('createNestedRedundantList %s', (_name, build) => {
    const replies = build();
    const topA = clone(replies)
      .filter((v) => v.thankCount >= 3)
      .slice(0, 5);
    const topB = clone(topA);
    expect(createNestedRedundantList(clone(replies), topB)).toEqual(
      oracle.createNestedRedundantList(clone(replies), topA),
    );
  });

  it('functions 上保留同名方法，createList 的产物与原算法一致', () => {
    const replies = fixtureReplies('topic_1252074.html');
    const post = functions.createList({ replyList: [] } as never, replies);
    expect(post.replyCount).toBe(replies.length);
    expect(post.nestedReplies).toEqual(
      oracle.createNestedList(clone(replies), clone(post.topReplyList)),
    );
    expect(functions.createNestedList).toBe(createNestedList);
    expect(typeof functions.findChildren).toBe('function');
  });

  it('楼中楼关系：明确回复某楼的回复挂在该楼下', () => {
    const list = [
      makeReply(1, 'a', [], -1),
      makeReply(2, 'b', ['a'], 1),
      makeReply(3, 'c', [], -1),
      makeReply(4, 'a', ['b'], 2),
    ];
    const tree = createNestedList(clone(list), []);
    expect(tree.map((r) => r.floor)).toEqual([1, 3]);
    expect(tree[0].children.map((r) => r.floor)).toEqual([2]);
    expect(tree[0].children[0].children.map((r) => r.floor)).toEqual([4]);
    expect(tree[0].children[0].level).toBe(1);
    expect(tree[0].children[0].children[0].level).toBe(2);
    expect(tree[0].replyCount).toBe(2);
  });
});
