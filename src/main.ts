import { bootstrap } from '@/app/bootstrap';
import { earlyBoot } from '@/app/early';

const revertEarly = earlyBoot();

function start(): void {
  const stop = bootstrap();
  if (stop) window.addEventListener('pagehide', stop, { once: true });
  else revertEarly();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
