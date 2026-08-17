import type { Feature } from '@/shared/feature-runtime';

import './style.css';

const scrolledAttribute = 'data-v2ex-enhancement-header-scrolled';

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export const headerFeature: Feature = {
  id: 'header',
  setup() {
    if (!document.querySelector('#Top')) {
      return;
    }

    const tools = document.querySelector('#Top .tools');
    tools?.toggleAttribute(
      'data-v2ex-enhancement-guest',
      Boolean(tools.querySelector('a[href="/signin"]')),
    );

    const notificationLink = document.querySelector<HTMLAnchorElement>('a[href="/notifications"]');
    const headerNotificationLink = notificationLink?.cloneNode(true) as
      HTMLAnchorElement | undefined;
    const signOutLink = tools
      ? [...tools.querySelectorAll<HTMLAnchorElement>('a.top')].find((link) =>
          /登出|退出|sign\s*out|logout/i.test(link.textContent ?? ''),
        )
      : undefined;

    signOutLink?.classList.add('v2ex-enhancement-header__signout');

    if (tools && notificationLink && headerNotificationLink) {
      const unreadCount = notificationLink.textContent?.match(/\d+/)?.[0] ?? '0';

      headerNotificationLink.className = 'top v2ex-enhancement-header__notification';
      headerNotificationLink.ariaLabel = `${unreadCount} 条未读提醒`;
      headerNotificationLink.title = `${unreadCount} 条未读提醒`;
      headerNotificationLink.innerHTML = [
        '<i class="fa fa-bell-o" aria-hidden="true"></i>',
        `<span class="v2ex-enhancement-header__notification-count">${unreadCount}</span>`,
      ].join('');
      tools.insertBefore(headerNotificationLink, signOutLink ?? null);
    }

    const activeNavigationLinks = tools
      ? [...tools.querySelectorAll<HTMLAnchorElement>('a.top')].filter((link) => {
          if (link.classList.contains('v2ex-enhancement-header__signout')) {
            return false;
          }

          const linkPath = new URL(link.href, location.origin).pathname;
          const isActive =
            linkPath === '/'
              ? location.pathname === linkPath
              : location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);

          link.classList.toggle('v2ex-enhancement-header__active', isActive);
          return isActive;
        })
      : [];

    const meteorLayer = document.createElement('div');
    meteorLayer.ariaHidden = 'true';
    meteorLayer.className = 'v2ex-enhancement-header__meteors';
    document.querySelector('#Top')?.append(meteorLayer);

    let animationFrame: number | undefined;
    let meteorTimer: number | undefined;

    function launchMeteorShower(): void {
      const meteorCount = randomBetween(1, 3);

      for (let index = 0; index < meteorCount; index += 1) {
        const meteor = document.createElement('span');
        meteor.className = 'v2ex-enhancement-header__meteor';
        meteor.style.setProperty('--meteor-delay', `${randomBetween(0, 220)}ms`);
        meteor.style.setProperty('--meteor-duration', `${randomBetween(1100, 1600)}ms`);
        meteor.style.setProperty('--meteor-left', `${randomBetween(12, 78)}%`);
        meteor.style.setProperty('--meteor-top', `${randomBetween(-18, 18)}px`);
        meteor.style.setProperty('--meteor-tail', `${randomBetween(52, 82)}px`);
        meteor.style.setProperty('--meteor-x', `${randomBetween(110, 180)}px`);
        meteor.style.setProperty('--meteor-y', `${randomBetween(55, 94)}px`);
        meteor.addEventListener('animationend', () => meteor.remove(), { once: true });
        meteorLayer.append(meteor);
      }

      meteorTimer = window.setTimeout(launchMeteorShower, randomBetween(5000, 10000));
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      meteorTimer = window.setTimeout(launchMeteorShower, randomBetween(5000, 10000));
    }

    function updateScrollState(): void {
      document.documentElement.toggleAttribute(scrolledAttribute, window.scrollY > 24);
      animationFrame = undefined;
    }

    function handleScroll(): void {
      if (animationFrame === undefined) {
        animationFrame = window.requestAnimationFrame(updateScrollState);
      }
    }

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
      if (meteorTimer !== undefined) {
        window.clearTimeout(meteorTimer);
      }
      window.removeEventListener('scroll', handleScroll);
      document.documentElement.removeAttribute(scrolledAttribute);
      tools?.removeAttribute('data-v2ex-enhancement-guest');
      signOutLink?.classList.remove('v2ex-enhancement-header__signout');
      activeNavigationLinks.forEach((link) =>
        link.classList.remove('v2ex-enhancement-header__active'),
      );
      headerNotificationLink?.remove();
      meteorLayer.remove();
    };
  },
};
