// src/utils/accessibilityUtils.ts

/**
 * Accessibility utility functions
 */

// Calculate color contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Check if color combination meets WCAG standards
export function meetsWCAG(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA', size: 'normal' | 'large' = 'normal'): boolean {
  const ratio = getContrastRatio(color1, color2);
  
  if (level === 'AA') {
    return size === 'large' ? ratio >= 3.0 : ratio >= 4.5;
  } else {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7.0;
  }
}

// Get accessible color recommendations
export function getAccessibleColor(backgroundColor: string, preferredColor: string): string {
  const colors = [
    '#000000', // Black
    '#FFFFFF', // White
    '#333333', // Dark gray
    '#666666', // Medium gray
    '#999999', // Light gray
    '#CCCCCC', // Very light gray
  ];

  let bestColor = preferredColor;
  let bestRatio = 0;

  for (const color of colors) {
    const ratio = getContrastRatio(backgroundColor, color);
    if (ratio > bestRatio && meetsWCAG(backgroundColor, color, 'AA')) {
      bestRatio = ratio;
      bestColor = color;
    }
  }

  return bestColor;
}

// Validate color contrast for our theme colors
export function validateThemeContrast(): { [key: string]: boolean } {
  const theme = {
    // Dark theme colors
    'background-main': '#0a0a0b',
    'background-secondary': '#111113',
    'foreground-primary': '#fafafa',
    'foreground-secondary': '#ffffff',
    'accent-primary': '#ffffff',
    'error': '#ef4444',
    'success': '#10b981',
    'warning': '#f59e0b',
  };

  const results: { [key: string]: boolean } = {};

  // Test critical combinations
  const tests = [
    { bg: theme['background-main'], fg: theme['foreground-primary'], name: 'Main background + Primary text' },
    { bg: theme['background-secondary'], fg: theme['foreground-primary'], name: 'Secondary background + Primary text' },
    { bg: theme['accent-primary'], fg: theme['foreground-primary'], name: 'Accent + Primary text' },
    { bg: theme['error'], fg: theme['foreground-primary'], name: 'Error + Primary text' },
    { bg: theme['success'], fg: theme['foreground-primary'], name: 'Success + Primary text' },
  ];

  tests.forEach(test => {
    results[test.name] = meetsWCAG(test.bg, test.fg, 'AA');
  });

  return results;
}

// Generate high contrast color variants
export function generateHighContrastColors(baseColor: string): {
  light: string;
  dark: string;
  highContrast: string;
} {
  // This is a simplified version - in production, you'd want more sophisticated color manipulation
  return {
    light: '#ffffff',
    dark: '#000000',
    highContrast: getAccessibleColor(baseColor, '#000000'),
  };
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check if user prefers high contrast
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// Get appropriate focus ring color based on theme
export function getFocusRingColor(theme: 'light' | 'dark' = 'dark'): string {
  return theme === 'dark' ? '#f97316' : '#ea6610';
}

// Validate form field accessibility
export function validateFormField(field: {
  hasLabel: boolean;
  hasId: boolean;
  hasAriaLabel?: boolean;
  hasAriaDescribedBy?: boolean;
  hasError?: boolean;
}): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!field.hasLabel && !field.hasAriaLabel) {
    issues.push('Field must have either a label or aria-label');
  }

  if (!field.hasId) {
    issues.push('Field must have an id attribute');
  }

  if (field.hasError && !field.hasAriaDescribedBy) {
    issues.push('Field with error must have aria-describedby pointing to error message');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
