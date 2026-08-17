import type { Feature } from '@/shared/feature-runtime';

import './style.css';

const topicPathPattern = /^\/t\/\d+/;
const maxDepth = 3;

interface ReplyNode {
  author: string;
  children: ReplyNode[];
  depth: number;
  element: HTMLElement;
  floor: number;
  parent?: ReplyNode;
}

function getReplyElements(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('#Main .box .cell')].filter(
    (element) =>
      element.querySelector('table .reply_content') !== null &&
      element.querySelector('table .no') !== null,
  );
}

function getFloor(element: HTMLElement): number | undefined {
  const text = element.querySelector('.no')?.textContent?.trim();
  const floor = Number(text);

  return Number.isSafeInteger(floor) && floor > 0 ? floor : undefined;
}

function getAuthor(element: HTMLElement): string | undefined {
  const href = element
    .querySelector<HTMLAnchorElement>('strong a[href^="/member/"]')
    ?.getAttribute('href');
  const author = href?.slice('/member/'.length);

  return author || undefined;
}

function getParentFloor(content: HTMLElement): number | undefined {
  const match = content.textContent?.match(/^\s*@[^\s]+\s+#(\d+)\b/);
  const floor = Number(match?.[1]);

  return Number.isSafeInteger(floor) && floor > 0 ? floor : undefined;
}

function getMentionedAuthor(content: HTMLElement): string | undefined {
  if (!content.textContent?.trimStart().startsWith('@')) {
    return undefined;
  }

  const href = content
    .querySelector<HTMLAnchorElement>('a[href^="/member/"]')
    ?.getAttribute('href');
  const author = href?.slice('/member/'.length);

  return author || undefined;
}

function findParent(
  element: HTMLElement,
  repliesByFloor: ReadonlyMap<number, ReplyNode>,
  repliesByAuthor: ReadonlyMap<string, ReplyNode[]>,
): ReplyNode | undefined {
  const content = element.querySelector<HTMLElement>('.reply_content');
  if (!content) {
    return undefined;
  }

  const parentFloor = getParentFloor(content);
  if (parentFloor) {
    return repliesByFloor.get(parentFloor);
  }

  const mentionedAuthor = getMentionedAuthor(content);
  if (!mentionedAuthor) {
    return undefined;
  }

  const candidates = repliesByAuthor.get(mentionedAuthor);
  return candidates?.at(-1);
}

function createThreadNode(reply: ReplyNode): HTMLElement {
  const element = document.createElement('div');
  element.className = 'v2ex-enhancement-reply-thread__node';
  element.classList.toggle('has-children', reply.children.length > 0);
  element.dataset.depth = String(reply.depth);
  element.dataset.floor = String(reply.floor);

  const children = document.createElement('div');
  children.className = 'v2ex-enhancement-reply-thread__children';
  element.append(reply.element, children);

  return element;
}

function buildReplyTree(replyElements: readonly HTMLElement[]): HTMLElement {
  const repliesByFloor = new Map<number, ReplyNode>();
  const repliesByAuthor = new Map<string, ReplyNode[]>();
  const roots: ReplyNode[] = [];

  for (const element of replyElements) {
    const floor = getFloor(element);
    const author = getAuthor(element);
    if (!floor || !author) {
      continue;
    }

    const parent = findParent(element, repliesByFloor, repliesByAuthor);
    const depth = parent && parent.depth < maxDepth ? parent.depth + 1 : 0;
    const reply: ReplyNode = { author, children: [], depth, element, floor, parent };

    if (parent && depth > 0) {
      parent.children.push(reply);
    } else {
      roots.push(reply);
    }

    repliesByFloor.set(floor, reply);
    const repliesFromAuthor = repliesByAuthor.get(author) ?? [];
    repliesFromAuthor.push(reply);
    repliesByAuthor.set(author, repliesFromAuthor);
  }

  const tree = document.createElement('div');
  tree.className = 'v2ex-enhancement-reply-thread';

  function appendReply(reply: ReplyNode, parent: HTMLElement): void {
    const node = createThreadNode(reply);
    parent.append(node);

    const children = node.querySelector<HTMLElement>('.v2ex-enhancement-reply-thread__children');
    if (children) {
      for (const child of reply.children) {
        appendReply(child, children);
      }
    }
  }

  for (const reply of roots) {
    appendReply(reply, tree);
  }

  return tree;
}

export const replyThreadFeature: Feature = {
  id: 'reply-thread',
  setup() {
    if (!topicPathPattern.test(location.pathname)) {
      return;
    }

    const replyElements = getReplyElements();
    if (replyElements.length < 2) {
      return;
    }

    const replyBox = replyElements[0].parentElement;
    if (!replyBox || replyElements.some((element) => element.parentElement !== replyBox)) {
      return;
    }

    // Keep the original top and bottom pagination on their respective sides of the reply tree.
    const insertionPoint = document.createComment('v2ex-enhancement-reply-thread');
    replyBox.insertBefore(insertionPoint, replyElements[0]);

    const tree = buildReplyTree(replyElements);
    insertionPoint.replaceWith(tree);
  },
};
