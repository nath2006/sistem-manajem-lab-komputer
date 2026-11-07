import { useEffect, useRef } from 'react';
import { acquireBodyScrollLock } from './scrollLock.js';

const focusableSelector =
  'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function useDialog(open, onClose) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const releaseScroll = acquireBodyScrollLock();
    dialog.focus({ preventScroll: true });
    const handleKey = (event) => {
      const dialogs = document.querySelectorAll('[data-dialog-root="true"]');
      if (dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll(focusableSelector)].filter(
        (element) =>
          element.getClientRects().length > 0 && !element.closest('[inert]')
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      if (
        event.shiftKey &&
        (active === first || active === dialog || !dialog.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === dialog || !dialog.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      releaseScroll();
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  return dialogRef;
}
