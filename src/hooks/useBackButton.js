import { useEffect, useRef } from 'react';

/**
 * useBackButton — Android back button / browser history integration.
 *
 * Pushes a history state when `isOpen` becomes true.
 * On `popstate` (back button), calls `onClose` instead of navigating away.
 * Multiple overlays handled naturally via LIFO — each push is its own entry.
 */
export default function useBackButton(isOpen, onClose) {
  const pushed = useRef(false);

  useEffect(() => {
    if (isOpen && !pushed.current) {
      pushed.current = true;
      window.history.pushState({ overlay: true }, '');
    }

    if (!isOpen && pushed.current) {
      pushed.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = () => {
      if (pushed.current) {
        pushed.current = false;
        onClose();
      }
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isOpen, onClose]);
}
