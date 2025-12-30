import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationProps {
  itemCount: number;
  onSelect?: (index: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  disabled?: boolean;
}

export const useKeyboardNavigation = ({
  itemCount,
  onSelect,
  onNext,
  onPrevious,
  activeIndex,
  setActiveIndex,
  disabled = false
}: UseKeyboardNavigationProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setActiveIndex((activeIndex + 1) % itemCount);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setActiveIndex((activeIndex - 1 + itemCount) % itemCount);
        break;
      case 'Enter':
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          onNext?.();
        } else {
          onSelect?.(activeIndex);
        }
        break;
      case 'Backspace':
        // Optional: Go back if not in an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          onPrevious?.();
        }
        break;
    }
  }, [activeIndex, itemCount, onSelect, onNext, onPrevious, setActiveIndex, disabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
