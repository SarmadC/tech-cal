// src/components/common/AccessibilityHelpers.tsx

import React from 'react';

/**
 * Accessibility helper components and hooks
 */

// Skip navigation link component
export const SkipNavigation: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent-primary text-white px-4 py-2 rounded-md z-50"
  >
    Skip to main content
  </a>
);

// Screen reader only text
export const SrOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

// Accessible button wrapper for clickable divs
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
  role?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  onKeyDown,
  className = '',
  ariaLabel,
  disabled = false,
  role = 'button',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
    onKeyDown?.(e);
  };

  return (
    <div
      role={role}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  );
};

// Focus trap hook for modals
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

// Announce changes to screen readers
export const useScreenReaderAnnouncement = () => {
  const [announcement, setAnnouncement] = React.useState('');

  const announce = React.useCallback((message: string) => {
    setAnnouncement(message);
    // Clear the announcement after a short delay
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  return { announcement, announce };
};

// Screen reader announcement component
export const ScreenReaderAnnouncement: React.FC<{ message: string }> = ({ message }) => (
  <div
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
