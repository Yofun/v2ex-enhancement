export interface Feature {
  id: string;
  setup: () => void | (() => void);
}

export function startFeatures(features: readonly Feature[]): () => void {
  const cleanups = features.flatMap((feature) => {
    try {
      const cleanup = feature.setup();
      return cleanup ? [cleanup] : [];
    } catch (error) {
      console.error(`[v2ex-enhancement] Feature failed: ${feature.id}`, error);
      return [];
    }
  });

  const stop = (): void => {
    cleanups.reverse().forEach((cleanup) => cleanup());
  };

  window.addEventListener('pagehide', stop, { once: true });
  return stop;
}
