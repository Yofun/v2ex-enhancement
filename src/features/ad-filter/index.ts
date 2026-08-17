import type { Feature } from '@/shared/feature-runtime';

function isAdvertisement(box: HTMLElement): boolean {
  if (box.id === 'pro-campaign-container') {
    return true;
  }

  return (
    box.querySelector('[class^="pro-unit"], [class*=" pro-unit"]') !== null ||
    /\bPromoted by\b|\bSponsored\b/i.test(box.textContent ?? '')
  );
}

export const adFilterFeature: Feature = {
  id: 'ad-filter',
  setup() {
    const hiddenStates = new Map<HTMLElement, boolean>();

    function hideAdvertisements(): void {
      document.querySelectorAll<HTMLElement>('#Rightbar .box').forEach((box) => {
        if (!isAdvertisement(box) || hiddenStates.has(box)) {
          return;
        }

        hiddenStates.set(box, box.hidden);
        box.hidden = true;

        const previous = box.previousElementSibling;
        if (previous instanceof HTMLElement && previous.className.startsWith('sep')) {
          hiddenStates.set(previous, previous.hidden);
          previous.hidden = true;
        }
      });
    }

    hideAdvertisements();

    const observer = new MutationObserver(hideAdvertisements);
    observer.observe(document.querySelector('#Rightbar') ?? document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      hiddenStates.forEach((wasHidden, box) => {
        box.hidden = wasHidden;
      });
    };
  },
};
