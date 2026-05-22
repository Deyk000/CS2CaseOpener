// Minimal focus trap. Cycles Tab/Shift+Tab within `element`, restores focus
// to whatever was active when activate() was called.
//
// Usage:
//   const trap = focusTrap(resultModal);
//   trap.activate();
//   // ...later, on close...
//   trap.deactivate();

const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusTrap(element) {
  let previouslyFocused = null;
  let onKeyDown = null;

  function getFocusable() {
    return [...element.querySelectorAll(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  function activate() {
    previouslyFocused = document.activeElement;
    onKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    element.addEventListener('keydown', onKeyDown);
    // Defer focus until after the modal's enter transition starts.
    requestAnimationFrame(() => {
      const items = getFocusable();
      items[0]?.focus();
    });
  }

  function deactivate() {
    if (onKeyDown) element.removeEventListener('keydown', onKeyDown);
    onKeyDown = null;
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try { previouslyFocused.focus(); } catch {}
    }
    previouslyFocused = null;
  }

  return { activate, deactivate };
}
