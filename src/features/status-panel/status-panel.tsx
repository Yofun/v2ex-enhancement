import { useEffect, useState } from 'react';

import { lockPageScroll } from '@/shared/scroll-lock';

export function StatusPanel() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return lockPageScroll();
  }, [isOpen]);

  return (
    <div className="v2ex-enhancement-status">
      {isOpen && (
        <section aria-label="V2EX Enhancement" className="v2ex-enhancement-status__popover">
          <strong>V2EX Enhancement</strong>
          <span>页面美化已启用</span>
        </section>
      )}
      <button
        aria-expanded={isOpen}
        aria-label="切换 V2EX Enhancement 面板"
        className="v2ex-enhancement-status__trigger"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        V+
      </button>
    </div>
  );
}
