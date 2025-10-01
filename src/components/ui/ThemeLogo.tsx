'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function ThemeLogo({ width = 24, height = 24, className = '' }: ThemeLogoProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  // Inline SVG that responds to theme
  const isDark = resolvedTheme === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const barsColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ objectFit: 'contain', borderRadius: '4px' }}
    >
      {/* Background with rounded corners */}
      <rect width="120" height="120" rx="24" fill={bgColor} />

      {/* Logo Mark centered */}
      <g id="logo-mark" transform="translate(60, 60)">
        {/* Perfectly centered stacked bars */}
        <rect x="-28" y="-20" width="56" height="6" fill={barsColor} opacity="0.25" />
        <rect x="-22" y="-10" width="44" height="6" fill={barsColor} opacity="0.4" />
        <rect x="-16" y="0" width="32" height="6" fill={barsColor} opacity="0.6" />
        <rect x="-10" y="10" width="20" height="6" fill={barsColor} opacity="0.8" />
        <rect x="-4" y="20" width="8" height="6" fill={barsColor} />
      </g>
    </svg>
  );
}

