import { bootstrap } from '@/app/bootstrap';

function start(): void {
  const stop = bootstrap();
  if (stop) window.addEventListener('pagehide', stop, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
