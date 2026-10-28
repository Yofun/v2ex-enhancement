const SLIDE_PROPS = ['height', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom'] as const;
const running = new WeakMap<HTMLElement, Animation>();

function keyframe(values: Record<string, string>): Keyframe {
  return values as Keyframe;
}

function collapsed(): Keyframe {
  return keyframe(Object.fromEntries(SLIDE_PROPS.map((p) => [p, '0px'])));
}

function measure(el: HTMLElement): Keyframe {
  const style = getComputedStyle(el);
  return keyframe(Object.fromEntries(SLIDE_PROPS.map((p) => [p, style[p]])));
}

function play(el: HTMLElement, frames: Keyframe[], duration: number, onFinish: () => void) {
  running.get(el)?.cancel();
  el.style.overflow = 'hidden';
  const anim = el.animate(frames, { duration, easing: 'ease-in-out' });
  running.set(el, anim);
  anim.onfinish = () => {
    running.delete(el);
    el.style.overflow = '';
    onFinish();
  };
}

/** 对应 jQuery 的 slideUp('fast') */
export function slideUp(el: HTMLElement, duration = 200): void {
  if (getComputedStyle(el).display === 'none') return;
  play(el, [measure(el), collapsed()], duration, () => {
    el.style.display = 'none';
  });
}

/** 对应 jQuery 的 slideDown('fast') */
export function slideDown(el: HTMLElement, duration = 200): void {
  running.get(el)?.cancel();
  el.style.display = '';
  if (getComputedStyle(el).display === 'none') el.style.display = 'block';
  play(el, [collapsed(), measure(el)], duration, () => undefined);
}

/** 对应 jQuery 的 slideToggle('fast') */
export function slideToggle(el: HTMLElement, duration = 200): void {
  if (getComputedStyle(el).display === 'none') slideDown(el, duration);
  else slideUp(el, duration);
}
