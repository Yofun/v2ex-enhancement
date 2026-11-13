/**
 * 页面里内容是异步渲染的（React、弹框、列表预览），所以要监听 DOM 变化后再处理新出现的节点。
 * run 在每个动画帧最多调用一次，并带上一个跨次调用共享的 seen，用来记住处理过的元素。
 * 返回清理函数。
 */
export function watchDom(run: (seen: WeakSet<Element>) => void): () => void {
  const seen = new WeakSet<Element>();
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      run(seen);
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
  return () => {
    observer.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}
