import type { Feature } from '@/shared/feature-runtime';

import './style.scss';

const appearanceAttribute = 'data-v2ex-enhancement';
const notificationsAttribute = 'data-v2ex-enhancement-notifications';
const topicDetailAttribute = 'data-v2ex-enhancement-topic-detail';
const topicListAttribute = 'data-v2ex-enhancement-topic-list';

const topicActionDetails = [
  { iconClass: 'fa fa-star-o', key: 'favorite', label: '加入收藏' },
  { iconClass: 'fa fa-star', key: 'favorite', label: '取消收藏' },
  { iconClass: 'fa fa-twitter', key: 'tweet', label: 'Tweet' },
  { iconClass: 'fa fa-eye-slash', key: 'ignore', label: '忽略主题' },
  { iconClass: 'fa fa-heart-o', key: 'thank', label: '感谢' },
] as const;

function enhanceTopicVotes(): (() => void) | undefined {
  const header = document.querySelector<HTMLElement>('#Main .box > .header:has(> h1)');
  if (!header) {
    return;
  }

  const topicHeader = header;

  function updateVoteIcons(): void {
    const votes = topicHeader.querySelector<HTMLElement>('.votes');
    if (!votes) {
      return;
    }

    votes.classList.add('v2ex-enhancement-topic-votes');
    const voteDetails = [
      { iconClass: 'fa fa-thumbs-o-up', label: '赞同' },
      { iconClass: 'fa fa-thumbs-o-down', label: '反对' },
    ];

    for (const [index, link] of [
      ...votes.querySelectorAll<HTMLAnchorElement>('a.vote'),
    ].entries()) {
      const detail = voteDetails[index];
      if (!detail) {
        continue;
      }

      link.ariaLabel = detail.label;
      link.title = detail.label;
      link.querySelector('li')?.setAttribute('class', detail.iconClass);
    }
  }

  updateVoteIcons();

  const observer = new MutationObserver(updateVoteIcons);
  observer.observe(topicHeader, { childList: true, subtree: true });

  return () => observer.disconnect();
}

function enhanceTopicListVotes(): void {
  for (const icon of document.querySelectorAll<HTMLElement>('#Main .cell.item .votes li')) {
    if (icon.classList.contains('fa-chevron-up')) {
      icon.className = 'fa fa-thumbs-o-up';
    }

    if (icon.classList.contains('fa-chevron-down')) {
      icon.className = 'fa fa-thumbs-o-down';
    }
  }
}

function enhanceTopicActions(): (() => void) | undefined {
  const topicBox = document.querySelector<HTMLElement>('#Main .box:has(> .header > h1)');
  if (!topicBox) {
    return;
  }

  const topicContainer = topicBox;

  function updateTopicActions(): void {
    for (const cell of topicContainer.querySelectorAll<HTMLElement>(
      ':scope > .topic_buttons, :scope > .cell',
    )) {
      const actionLinks = [...cell.querySelectorAll<HTMLAnchorElement>('a')]
        .map((link) => {
          const text = link.textContent?.replaceAll(/\s+/g, '') ?? '';
          const detail = topicActionDetails.find(({ label }) => text.includes(label));

          return detail ? { detail, link } : undefined;
        })
        .filter(
          (
            action,
          ): action is { detail: (typeof topicActionDetails)[number]; link: HTMLAnchorElement } =>
            Boolean(action),
        );

      if (actionLinks.length < 2) {
        continue;
      }

      cell.classList.add('v2ex-enhancement-topic-actions');

      // The original non-breaking spaces become anonymous flex items before the buttons.
      for (const node of [...cell.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
          node.remove();
        }
      }

      for (const { detail, link } of actionLinks) {
        link.classList.add(
          'v2ex-enhancement-topic-action',
          `v2ex-enhancement-topic-action--${detail.key}`,
        );
        link.ariaLabel = detail.label;
        link.title = detail.label;

        const existingIcon = link.querySelector<HTMLElement>(
          '.v2ex-enhancement-topic-action__icon',
        );
        if (existingIcon) {
          existingIcon.className = `v2ex-enhancement-topic-action__icon ${detail.iconClass}`;
        } else {
          const icon = document.createElement('i');
          icon.className = `v2ex-enhancement-topic-action__icon ${detail.iconClass}`;
          icon.setAttribute('aria-hidden', 'true');
          link.prepend(icon);
        }
      }

      const statistics = [...cell.children].find(
        (child) => child instanceof HTMLElement && child.classList.contains('fr'),
      );
      statistics?.classList.add('v2ex-enhancement-topic-actions__stats');
    }
  }

  updateTopicActions();

  const observer = new MutationObserver(updateTopicActions);
  observer.observe(topicContainer, { childList: true, subtree: true });

  return () => observer.disconnect();
}

export const appearanceFeature: Feature = {
  id: 'appearance',
  setup() {
    document.documentElement.setAttribute(appearanceAttribute, 'enabled');
    const isHome = location.pathname === '/';
    const isNotifications = document.querySelector('#notifications') !== null;
    const isTopicDetail = document.querySelector('#Main .box > .header > h1') !== null;
    const isTopicList = document.querySelector('#Main .item_title') !== null;

    if (isHome) {
      document.documentElement.setAttribute('data-v2ex-enhancement-page', 'home');
    }

    document.documentElement.toggleAttribute(topicListAttribute, isTopicList);
    document.documentElement.toggleAttribute(notificationsAttribute, isNotifications);
    document.documentElement.toggleAttribute(topicDetailAttribute, isTopicDetail);

    const stopTopicVotes = isTopicDetail ? enhanceTopicVotes() : undefined;
    const stopTopicActions = isTopicDetail ? enhanceTopicActions() : undefined;

    if (isTopicList) {
      enhanceTopicListVotes();
    }

    return () => {
      document.documentElement.removeAttribute(appearanceAttribute);
      document.documentElement.removeAttribute('data-v2ex-enhancement-page');
      document.documentElement.removeAttribute(notificationsAttribute);
      document.documentElement.removeAttribute(topicDetailAttribute);
      document.documentElement.removeAttribute(topicListAttribute);
      stopTopicVotes?.();
      stopTopicActions?.();
    };
  },
};
