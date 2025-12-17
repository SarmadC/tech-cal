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
  const asteriskColor = isDark ? '#FFFFFF' : '#000000';
  
  // Opacity levels for 3D effect
  const opacityDark = 0.3;
  const opacityMedium = 0.5;
  const opacityLight = 0.7;
  const opacityBright = 0.85;
  const opacityBrightest = 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ objectFit: 'contain' }}
    >
      {/* Background */}
      <rect width="120" height="120" fill={bgColor} />
      
      {/* 3D Asterisk - 6 arms extending from center */}
      
      {/* Back-left arm (going back-left into the scene) */}
      <polygon points="60,60 52,56 28,68 36,72" fill={asteriskColor} opacity={opacityDark} />
      <polygon points="36,72 28,68 28,76 36,80" fill={asteriskColor} opacity={opacityDark} />
      <polygon points="60,60 36,72 36,80 60,68" fill={asteriskColor} opacity={opacityMedium} />
      
      {/* Back-right arm (going back-right into the scene) */}
      <polygon points="60,60 68,56 92,68 84,72" fill={asteriskColor} opacity={opacityLight} />
      <polygon points="84,72 92,68 92,76 84,80" fill={asteriskColor} opacity={opacityMedium} />
      <polygon points="60,60 84,72 84,80 60,68" fill={asteriskColor} opacity={opacityLight} />
      
      {/* Bottom arm (going down) */}
      <polygon points="52,64 60,68 60,100 52,96" fill={asteriskColor} opacity={opacityMedium} />
      <polygon points="68,64 60,68 60,100 68,96" fill={asteriskColor} opacity={opacityDark} />
      <polygon points="52,96 60,100 68,96 60,92" fill={asteriskColor} opacity={opacityDark} />
      
      {/* Front-left arm (coming forward-left) */}
      <polygon points="60,60 52,64 28,52 36,48" fill={asteriskColor} opacity={opacityBright} />
      <polygon points="36,48 28,52 28,44 36,40" fill={asteriskColor} opacity={opacityLight} />
      <polygon points="60,60 36,48 36,40 60,52" fill={asteriskColor} opacity={opacityBright} />
      
      {/* Front-right arm (coming forward-right) */}
      <polygon points="60,60 68,64 92,52 84,48" fill={asteriskColor} opacity={opacityBrightest} />
      <polygon points="84,48 92,52 92,44 84,40" fill={asteriskColor} opacity={opacityBright} />
      <polygon points="60,60 84,48 84,40 60,52" fill={asteriskColor} opacity={opacityBrightest} />
      
      {/* Top arm (going up) */}
      <polygon points="52,56 60,52 60,20 52,24" fill={asteriskColor} opacity={opacityBrightest} />
      <polygon points="68,56 60,52 60,20 68,24" fill={asteriskColor} opacity={opacityBrightest} />
      <polygon points="52,24 60,20 68,24 60,28" fill={asteriskColor} opacity={opacityBrightest} />
      
      {/* Center top face (brightest) */}
      <polygon points="52,56 60,52 68,56 60,60" fill={asteriskColor} opacity={opacityBrightest} />
    </svg>
  );
}

