/**
 * Universal Horizontal Scroll System (قاعدة عامة لحركة التابات الأفقية بعجلة الماوس)
 * 
 * Automatically captures vertical mouse wheel events over horizontally scrollable
 * tabs, pills, chips, and subnav bars, and smoothly converts them to horizontal scrolling.
 * Supports RTL (Arabic) natively with zero lag, and prevents trapping by yielding
 * to standard page scroll when reaching horizontal boundaries.
 */

function isRtlElement(element: HTMLElement): boolean {
  return window.getComputedStyle(element).direction === 'rtl';
}

/**
 * Checks whether the container can scroll further in the requested wheel direction.
 * Returns false if already at the boundary, allowing natural vertical page scroll.
 */
function canScrollHorizontally(container: HTMLElement, deltaY: number, isRtl: boolean): boolean {
  const maxScroll = container.scrollWidth - container.clientWidth;
  if (maxScroll <= 2) return false;

  const sl = container.scrollLeft;

  if (isRtl) {
    // In modern browsers (Chromium, Firefox, Safari 16+):
    // RTL scrollLeft starts at 0 (far right) and goes negative down to -maxScroll (far left).
    if (sl <= 0) {
      if (deltaY > 0) {
        // Scrolling down/next: moving leftwards towards negative maxScroll
        return Math.abs(sl) < maxScroll - 2;
      } else if (deltaY < 0) {
        // Scrolling up/prev: moving rightwards towards 0
        return sl < -2;
      }
    } else {
      // Legacy positive RTL: starts at maxScroll at right, 0 at left
      if (deltaY > 0) {
        // Scrolling down/next: moving towards 0
        return sl > 2;
      } else if (deltaY < 0) {
        // Scrolling up/prev: moving towards maxScroll
        return sl < maxScroll - 2;
      }
    }
  } else {
    // Standard LTR (0 at left, maxScroll at right)
    if (deltaY > 0) {
      // Scrolling down/next: moving rightwards towards maxScroll
      return sl < maxScroll - 2;
    } else if (deltaY < 0) {
      // Scrolling up/prev: moving leftwards towards 0
      return sl > 2;
    }
  }

  return false;
}

/**
 * Applies horizontal scrolling with browser-agnostic RTL handling.
 */
function applyHorizontalScroll(container: HTMLElement, deltaY: number, isRtl: boolean): void {
  // Normalize delta across delta modes:
  // 0: pixels (precision touchpad), 1: lines (standard mouse wheel), 2: pages
  let normalizedDelta = deltaY;
  if (Math.abs(deltaY) < 40) {
    // Trackpad or high-res wheel: apply 1:1
    normalizedDelta = deltaY;
  } else {
    // Standard notch wheel: smooth step (~80-120px)
    normalizedDelta = deltaY > 0 ? 90 : -90;
  }

  const prevScroll = container.scrollLeft;

  // In RTL, deltaY > 0 (scroll down) means scroll left (reveal next items)
  const moveAmount = isRtl ? -normalizedDelta : normalizedDelta;

  if (typeof container.scrollBy === 'function') {
    container.scrollBy({ left: moveAmount, behavior: 'auto' });
  } else {
    container.scrollLeft += moveAmount;
  }

  // Fallback for legacy engines where positive/negative conventions for RTL differ:
  if (container.scrollLeft === prevScroll && Math.abs(moveAmount) > 0) {
    if (typeof container.scrollBy === 'function') {
      container.scrollBy({ left: -moveAmount, behavior: 'auto' });
    } else {
      container.scrollLeft -= moveAmount;
    }
  }
}

/**
 * Identifies whether an element or any of its ancestors is a horizontal tabs/chips container.
 */
function findHorizontalScrollContainer(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;

  // Ignore form fields where mouse wheel has native meaning (e.g. number inputs, selects)
  if (target.closest('input, select, textarea, [contenteditable="true"]')) {
    return null;
  }

  let current: HTMLElement | null = target;
  while (current && current !== document.body && current !== document.documentElement) {
    // 1. Explicit designation by data attribute or known tabs classes
    const isExplicitTabs =
      current.hasAttribute('data-horizontal-scroll') ||
      current.getAttribute('role') === 'tablist' ||
      current.classList.contains('horizontal-scroll-tabs') ||
      current.classList.contains('filter-chip-row') ||
      current.classList.contains('toolbar-chip-row') ||
      current.classList.contains('settings-tabs') ||
      current.classList.contains('settings-subnav-row') ||
      current.classList.contains('settings-section-tabs') ||
      current.classList.contains('reports-section-tabs') ||
      current.classList.contains('hr-section-nav') ||
      current.classList.contains('audit-workspace-tabs') ||
      current.classList.contains('delivery-rep-tabs') ||
      current.classList.contains('app-browser-tab-bar') ||
      current.classList.contains('nav-tabs') ||
      current.classList.contains('category-pills') ||
      current.classList.contains('storefront-subnav') ||
      current.classList.contains('storefront-sub-tabs') ||
      current.classList.contains('merchant-orders-status-tabs');

    if (isExplicitTabs) {
      if (current.scrollWidth > current.clientWidth + 2) {
        return current;
      }
    }

    // 2. Auto-detection for any compact tabs/chips/pills row:
    // Must overflow horizontally, have overflowX set to auto/scroll,
    // and must be a compact row (height <= 180px) without vertical scrolling.
    if (current.scrollWidth > current.clientWidth + 2) {
      const style = window.getComputedStyle(current);
      const hasHorizontalScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';

      if (hasHorizontalScroll) {
        const hasNoVerticalScroll =
          style.overflowY !== 'auto' && style.overflowY !== 'scroll' ||
          current.scrollHeight <= current.clientHeight + 6;
        const isCompactRow = current.clientHeight <= 180;

        if (isCompactRow && hasNoVerticalScroll) {
          return current;
        }
      }
    }

    current = current.parentElement;
  }

  return null;
}

let isGlobalListenerAttached = false;

/**
 * Initializes the universal horizontal scroll listener on window.
 * Safe to call multiple times (idempotent).
 */
export function initUniversalHorizontalScroll(): () => void {
  if (typeof window === 'undefined' || isGlobalListenerAttached) {
    return () => {};
  }

  const handleWheel = (e: WheelEvent) => {
    // If Shift key is held or horizontal delta is already primary, let browser handle natively
    if (e.shiftKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY) || e.deltaY === 0) {
      return;
    }

    const container = findHorizontalScrollContainer(e.target);
    if (!container) return;

    const isRtl = isRtlElement(container);

    // If the container can scroll in the requested direction:
    if (canScrollHorizontally(container, e.deltaY, isRtl)) {
      e.preventDefault();
      applyHorizontalScroll(container, e.deltaY, isRtl);
    }
    // If it cannot scroll (reached start or end), allow default vertical scroll of the page
  };

  window.addEventListener('wheel', handleWheel, { passive: false });
  isGlobalListenerAttached = true;

  return () => {
    window.removeEventListener('wheel', handleWheel);
    isGlobalListenerAttached = false;
  };
}
