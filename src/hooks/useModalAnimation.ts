import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Modal Animation & Lifecycle Architecture (TALA Pedagogical Modals)
// ============================================================================

export interface UseModalAnimationOptions {
  isOpen: boolean;
  onClose?: () => void;
  closeDuration?: number; // default 160ms
  preventScroll?: boolean; // default true
  closeOnEsc?: boolean; // default true
}

export interface UseModalAnimationReturn {
  shouldRender: boolean;
  isClosing: boolean;
  backdropClassName: string;
  containerClassName: string;
  triggerClose: (options?: { immediate?: boolean }) => void;
  handleBackdropClick: (e: React.MouseEvent) => void;
}

// ----------------------------------------------------------------------------
// Shared Global Scroll Lock (Reference-counted for nested modals)
// ----------------------------------------------------------------------------
let scrollLockCount = 0;
let prevBodyOverflow = '';

export function lockScroll(): void {
  if (typeof document === 'undefined') return;
  if (scrollLockCount === 0) {
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }
  scrollLockCount++;
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = prevBodyOverflow;
    document.body.classList.remove('modal-open');
  }
}

export function getScrollLockCount(): number {
  return scrollLockCount;
}

export function resetScrollLockForTesting(): void {
  scrollLockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
}

// ----------------------------------------------------------------------------
// Shared Modal ESC Stack (Topmost modal handles Escape key)
// ----------------------------------------------------------------------------
const modalEscStack: Array<() => void> = [];

export function pushModalEsc(handler: () => void): void {
  modalEscStack.push(handler);
}

export function popModalEsc(handler: () => void): void {
  const idx = modalEscStack.lastIndexOf(handler);
  if (idx !== -1) {
    modalEscStack.splice(idx, 1);
  }
}

export function getModalEscStackCount(): number {
  return modalEscStack.length;
}

export function resetModalEscStackForTesting(): void {
  modalEscStack.length = 0;
}

// ----------------------------------------------------------------------------
// Accessibility: prefers-reduced-motion check
// ----------------------------------------------------------------------------
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * useModalAnimation
 * Standardizes modal open (220ms ease-out) and close (160ms ease-in) transitions,
 * backdrop animation, scroll-lock reference counting, and ESC dismiss stack.
 */
export function useModalAnimation({
  isOpen,
  onClose,
  closeDuration = 160,
  preventScroll = true,
  closeOnEsc = true
}: UseModalAnimationOptions): UseModalAnimationReturn {
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transition controller
  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender && !isClosing) {
      if (isReducedMotion()) {
        setShouldRender(false);
        setIsClosing(false);
        return;
      }

      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        timerRef.current = null;
      }, closeDuration);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isOpen, shouldRender, isClosing, closeDuration]);

  // Scroll lock effect
  useEffect(() => {
    if (!preventScroll || !shouldRender || isClosing) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [preventScroll, shouldRender, isClosing]);

  // ESC handler effect (topmost modal priority)
  useEffect(() => {
    if (!closeOnEsc || !onClose || !shouldRender || isClosing) return;

    pushModalEsc(onClose);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const topHandler = modalEscStack[modalEscStack.length - 1];
        if (topHandler === onClose) {
          e.stopPropagation();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      popModalEsc(onClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEsc, onClose, shouldRender, isClosing]);

  // Clean trigger close method
  const triggerClose = useCallback(
    (opts?: { immediate?: boolean }) => {
      if (!onClose) return;
      if (opts?.immediate || isReducedMotion()) {
        setIsClosing(false);
        setShouldRender(false);
        onClose();
        return;
      }
      if (isClosing) return;
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setIsClosing(false);
        setShouldRender(false);
        onClose();
        timerRef.current = null;
      }, closeDuration);
    },
    [onClose, isClosing, closeDuration]
  );

  // Safe backdrop click dismissal (ignores bubble-up from dialog body and ignore while closing)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isClosing && onClose) {
        onClose();
      }
    },
    [isClosing, onClose]
  );

  return {
    shouldRender,
    isClosing,
    backdropClassName: isClosing ? 'is-closing' : '',
    containerClassName: isClosing ? 'is-closing' : '',
    triggerClose,
    handleBackdropClick
  };
}

export default useModalAnimation;
