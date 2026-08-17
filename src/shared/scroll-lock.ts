let lockCount = 0;
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';
let originalRootOverflow = '';

export function lockPageScroll(): () => void {
  if (lockCount === 0) {
    const root = document.documentElement;
    const { body } = document;
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    originalBodyOverflow = body.style.overflow;
    originalBodyPaddingRight = body.style.paddingRight;
    originalRootOverflow = root.style.overflow;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `calc(${getComputedStyle(body).paddingRight} + ${scrollbarWidth}px)`;
    }
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    lockCount -= 1;

    if (lockCount === 0) {
      document.documentElement.style.overflow = originalRootOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
    }
  };
}
