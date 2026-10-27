import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef } from 'react';

interface PreviewState {
  rect: DOMRect | null;
  resultWidth: number;
  resultHeight: number;
  x: number;
  y: number;
  scale: number;
  minScale: number;
  maxScale: number;
}

const initialState = (): PreviewState => ({
  rect: null,
  resultWidth: 0,
  resultHeight: 0,
  x: 0,
  y: 0,
  scale: 1,
  minScale: 0.2,
  maxScale: 16,
});

const PX_KEYS = [
  'top',
  'left',
  'bottom',
  'right',
  'width',
  'height',
  'font-size',
  'margin',
  'padding',
];
const UNIT_REG = /^-?\d+.?\d*(px|pt|em|rem|vw|vh|%|rpx|ms)$/i;

function css(el: HTMLElement | null, key: string, value: string | number) {
  if (!el) return;
  let v = value;
  if (PX_KEYS.includes(key) && !UNIT_REG.test(String(v)) && !String(v).includes('calc')) {
    v = `${v}px`;
  }
  el.style.setProperty(key, String(v));
}

function setTransform(el: HTMLElement, value: string) {
  el.style.transform = value;
}

export function getImgSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  const imgRatio = naturalWidth / naturalHeight;
  const maxRatio = maxWidth / maxHeight;
  let height: number;
  if (imgRatio >= maxRatio) {
    height = naturalWidth > maxWidth ? (maxWidth / naturalWidth) * naturalHeight : naturalHeight;
  } else {
    height = naturalHeight > maxHeight ? maxHeight : naturalHeight;
  }
  let width: number;
  if (height === 0) {
    height = maxHeight;
    width = height * 1.3;
  } else {
    if (height < 24) {
      height = 50;
    } else if (height < 100) {
      height = 300;
    } else {
      height = maxHeight;
    }
    width = height * imgRatio;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / imgRatio;
    }
  }
  return { width, height };
}

/** 点击正文图片后的放大预览（原 PostDetail.stop / wheel / closePreviewModal），保持原有的命令式 DOM 动画 */
export function useImagePreview() {
  const modalRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<PreviewState>(initialState());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const closePreviewModal = useCallback(() => {
    const s = shadowRef.current;
    const previewModal = modalRef.current;
    const domRect = stateRef.current.rect;
    if (!s || !domRect) return;
    css(s, 'transition', 'all 0.3s');
    css(s, 'width', domRect.width);
    css(s, 'height', domRect.height);
    setTransform(s, `translate3d(${domRect.x}px, ${domRect.y}px, 0) scale(1)`);
    css(maskRef.current, 'opacity', 0);
    later(() => {
      css(s, 'transition', 'all 0s');
      s.remove();
      if (shadowRef.current === s) shadowRef.current = null;
      css(previewModal, 'top', '-1000vh');
      css(document.body, 'overflow', 'auto');
    }, 300);
  }, [later]);

  /** 点击 .main 区域：始终阻止冒泡；若点到图片则打开预览。返回 true 表示已处理图片 */
  const handleMainClick = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;
      const state = initialState();
      stateRef.current = state;
      e.preventDefault();
      const domRect = target.getBoundingClientRect();
      const previewModal = modalRef.current;
      if (!previewModal) return;
      css(previewModal, 'top', '0');
      const s = target.cloneNode() as HTMLImageElement;
      s.classList.add('shadow');
      previewModal.append(s);
      shadowRef.current = s;
      css(s, 'transition', 'all 0s');
      css(s, 'width', domRect.width);
      css(s, 'height', domRect.height);
      setTransform(s, `translate3d(${domRect.x}px, ${domRect.y}px, 0) scale(1)`);
      state.rect = domRect;
      const result = getImgSize(
        s.naturalWidth,
        s.naturalHeight,
        window.innerWidth * 0.95,
        window.innerHeight * 0.9,
      );
      state.resultWidth = result.width;
      state.resultHeight = result.height;
      state.x = (window.innerWidth - result.width) * 0.5;
      state.y = (window.innerHeight - result.height) * 0.5;

      let isPointerdown = false;
      let isMove = false;
      let lastPointermove = { x: 0, y: 0 };
      s.addEventListener('pointerdown', (e3) => {
        isPointerdown = true;
        isMove = false;
        s.setPointerCapture(e3.pointerId);
        lastPointermove = { x: e3.clientX, y: e3.clientY };
      });
      s.addEventListener('pointermove', (e3) => {
        if (isPointerdown) {
          isMove = true;
          const current = { x: e3.clientX, y: e3.clientY };
          state.x += current.x - lastPointermove.x;
          state.y += current.y - lastPointermove.y;
          lastPointermove = current;
          css(s, 'transition', 'all 0.1s');
          setTransform(s, `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`);
        }
        e3.preventDefault();
      });
      s.addEventListener('pointerup', () => {
        if (isPointerdown) {
          isPointerdown = false;
          if (!isMove) closePreviewModal();
        }
      });
      s.addEventListener('pointercancel', () => {
        isPointerdown = false;
      });

      const mask = maskRef.current;
      css(mask, 'transition', 'all 0s');
      css(mask, 'opacity', 0);
      later(() => {
        css(s, 'transition', 'all .3s');
        css(mask, 'transition', 'all .3s');
        css(mask, 'opacity', 1);
        setTransform(s, `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`);
        css(s, 'width', state.resultWidth);
        css(s, 'height', state.resultHeight);
      }, 0);
      later(() => {
        css(document.body, 'overflow', 'hidden');
      }, 300);
    },
    [closePreviewModal, later],
  );

  const handleWheel = useCallback((e: WheelEvent) => {
    const state = stateRef.current;
    const d = e.deltaY < 0 ? 0.1 : -0.1;
    const ratio = 1 + d;
    const next = state.scale * ratio;
    if (next > state.maxScale) {
      state.scale = state.maxScale;
    } else if (next < state.minScale) {
      state.scale = state.minScale;
    } else {
      state.scale = next;
    }
    if ((e.target as HTMLElement).tagName === 'IMG') {
      const origin = { x: (d * state.resultWidth) / 2, y: (d * state.resultHeight) / 2 };
      state.x -= d * (e.clientX - state.x) - origin.x;
      state.y -= d * (e.clientY - state.y) - origin.y;
    }
    const s = shadowRef.current;
    if (s) {
      css(s, 'transition', 'all 0.2s');
      setTransform(s, `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`);
    }
    e.preventDefault();
  }, []);

  // React 的 onWheel 是被动监听，无法 preventDefault，这里手动绑定非被动监听
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return { modalRef, maskRef, handleMainClick, closePreviewModal };
}
