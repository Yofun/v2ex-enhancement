const HIDDEN_ATTR = 'data-v2n-ad';

function isAdvertisement(box: HTMLElement): boolean {
  if (box.id === 'pro-campaign-container') return true;
  return (
    box.querySelector('[class^="pro-unit"], [class*=" pro-unit"]') !== null ||
    /\bPromoted by\b|\bSponsored\b/i.test(box.textContent ?? '')
  );
}

/** 隐藏右侧栏里的广告卡片（含它前面的分隔条）。返回清理函数，会恢复被隐藏的元素 */
export function startAdFilter(): () => void {
  const hidden: HTMLElement[] = [];
  let raf = 0;

  const hide = (el: Element | null) => {
    if (!(el instanceof HTMLElement) || el.hasAttribute(HIDDEN_ATTR)) return;
    el.setAttribute(HIDDEN_ATTR, '');
    el.style.setProperty('display', 'none', 'important');
    hidden.push(el);
  };

  const scan = () => {
    raf = 0;
    document.querySelectorAll<HTMLElement>('#Rightbar > .box').forEach((box) => {
      if (box.hasAttribute(HIDDEN_ATTR) || !isAdvertisement(box)) return;
      const prev = box.previousElementSibling;
      hide(prev?.classList.contains('sep20') ? prev : null);
      hide(box);
    });
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(scan);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();

  return () => {
    observer.disconnect();
    if (raf) cancelAnimationFrame(raf);
    hidden.forEach((el) => {
      el.removeAttribute(HIDDEN_ATTR);
      el.style.removeProperty('display');
    });
  };
}
