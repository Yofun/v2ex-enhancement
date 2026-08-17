import type { Feature } from '@/shared/feature-runtime';
import { lockPageScroll } from '@/shared/scroll-lock';

import './style.scss';

const sidebarId = 'v2ex-enhancement-node-sidebar';

function findNodeDirectory(): HTMLElement | undefined {
  const boxes = [...document.querySelectorAll<HTMLElement>('#Main .box')];

  return (
    boxes.find((box) => box.textContent?.includes('V2EX / Curated Nodes')) ??
    boxes.find(
      (box) =>
        !box.querySelector('.item') &&
        box.querySelectorAll<HTMLAnchorElement>('a[href^="/go/"]').length >= 20,
    )
  );
}

function createNodeGroups(source: HTMLElement): DocumentFragment {
  const fragment = document.createDocumentFragment();

  for (const row of source.querySelectorAll('tr')) {
    const cells = row.querySelectorAll('td');
    const links = [...row.querySelectorAll<HTMLAnchorElement>('a[href^="/go/"]')];

    if (cells.length < 2 || links.length === 0) {
      continue;
    }

    const group = document.createElement('section');
    group.className = 'v2ex-enhancement-node-sidebar__group';

    const heading = document.createElement('h3');
    heading.textContent = cells[0].textContent?.trim() || '未分类';

    const linkList = document.createElement('div');
    linkList.className = 'v2ex-enhancement-node-sidebar__links';

    for (const link of links) {
      const node = document.createElement('a');
      node.href = link.href;
      node.textContent = link.textContent?.trim() || '未命名节点';
      linkList.append(node);
    }

    group.append(heading, linkList);
    fragment.append(group);
  }

  return fragment;
}

export const nodeSidebarFeature: Feature = {
  id: 'node-sidebar',
  setup() {
    if (location.pathname !== '/') {
      return;
    }

    const source = findNodeDirectory();
    if (!source) {
      return;
    }

    const wasHidden = source.hidden;
    source.hidden = true;

    const container = document.createElement('div');
    container.className = 'v2ex-enhancement-node-sidebar';
    container.id = sidebarId;

    const backdrop = document.createElement('button');
    backdrop.ariaLabel = '关闭节点导航';
    backdrop.className = 'v2ex-enhancement-node-sidebar__backdrop';
    backdrop.type = 'button';

    const trigger = document.createElement('button');
    trigger.setAttribute('aria-controls', `${sidebarId}-drawer`);
    trigger.ariaExpanded = 'false';
    trigger.className = 'v2ex-enhancement-node-sidebar__trigger';
    trigger.textContent = '节点';
    trigger.type = 'button';

    const drawer = document.createElement('aside');
    drawer.ariaLabel = '节点导航';
    drawer.className = 'v2ex-enhancement-node-sidebar__drawer';
    drawer.id = `${sidebarId}-drawer`;

    const header = document.createElement('header');
    header.className = 'v2ex-enhancement-node-sidebar__header';
    const title = document.createElement('h2');
    title.textContent = '节点导航';
    const close = document.createElement('button');
    close.ariaLabel = '关闭节点导航';
    close.className = 'v2ex-enhancement-node-sidebar__close';
    close.textContent = '\u00d7';
    close.type = 'button';
    header.append(title, close);

    const content = document.createElement('div');
    content.className = 'v2ex-enhancement-node-sidebar__content';
    content.append(createNodeGroups(source));
    drawer.append(header, content);
    container.append(backdrop, trigger, drawer);
    document.body.append(container);

    function setOpen(isOpen: boolean): void {
      const wasOpen = container.classList.contains('is-open');
      container.classList.toggle('is-open', isOpen);
      trigger.ariaExpanded = String(isOpen);

      if (isOpen && !wasOpen) {
        releasePageScroll = lockPageScroll();
      } else if (!isOpen && wasOpen) {
        releasePageScroll?.();
        releasePageScroll = undefined;
      }
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    trigger.addEventListener('click', () => setOpen(!container.classList.contains('is-open')));
    close.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', handleKeydown);

    let releasePageScroll: (() => void) | undefined;

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      releasePageScroll?.();
      source.hidden = wasHidden;
      container.remove();
    };
  },
};
