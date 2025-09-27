'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export interface MobileHeroSectionProps {
  isIOS?: boolean;
  isAndroid?: boolean;
  className?: string;
}

const MobileHeroSection: React.FC<MobileHeroSectionProps> = ({
  isIOS: _isIOS = false,
  isAndroid: _isAndroid = false,
  className = ''
}) => {
  const [_prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Determine background image based on theme
  const backgroundImage = resolvedTheme === 'dark' 
    ? '/mobile-ui-dark.jpg' 
    : '/mobile-ui-light-ultra-hq.jpg';

  return (
    <section className={`mobile-hero ${className}`}>
      {/* Mobile Theme Toggle */}
      <div className="mobile-theme-toggle">
        <ThemeToggle />
      </div>

      {/* Mobile Hero Background Image */}
      <div className="mobile-hero-background">
        <Image 
          src={backgroundImage} 
          alt="Tech events calendar background" 
          className="mobile-hero-bg-image"
          fill
          priority
        />
        <div className="mobile-hero-overlay" />
      </div>

      {/* Mobile Hero Content - Centered Text */}
      <div className="mobile-hero-text-content">
        {/* Hero Title */}
        <h1 className="mobile-hero-title">
          All-in-One<br />
          <span className="highlight-text">Tech Events Calendar</span>
        </h1>

                {/* Hero Subtitle */}
                <div className="mobile-hero-subtitle">
                  <div className="subtitle-content">
                    <p className="subtitle-main">
                      Effortless Event Discovery for Everyone:
                    </p>
                    <p className="subtitle-secondary">
                      Discover How Simple Steps<br />
                      Can Make Career Growth Easy
                    </p>
                  </div>
                </div>
      </div>

      {/* Mobile CTA Buttons - Bottom Positioned */}
      <div className="mobile-hero-cta enhanced">
        <div className="mobile-liquid-glass-cta">
          <Link 
            href="/signup" 
            className="mobile-primary-cta-liquid"
          >
            <span>CREATE ACCOUNT</span>
          </Link>
        </div>
        
        <Link 
          href="/login" 
          className="mobile-secondary-cta enhanced-secondary"
        >
          LOG IN
        </Link>
      </div>
    </section>
  );
};

export default MobileHeroSection;
