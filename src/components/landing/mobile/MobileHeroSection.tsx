'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return (
    <section className={`mobile-hero ${className}`}>
      {/* Mobile Hero Background */}
      <div className="mobile-hero-background">
        <div className="mobile-hero-gradient" />
      </div>

      {/* Mobile Hero Content */}
      <div className="mobile-hero-content">
        {/* Hero Title */}
        <h1 className="mobile-hero-title">
          All-in-One<br />
          <span className="highlight-text">Tech Events Calendar</span>
        </h1>

        {/* Hero Subtitle */}
        <div className="mobile-hero-subtitle">
          <div className="subtitle-icon animate-bounce-subtle">
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              className="arrow-icon"
            >
              <path d="M7 7h10v10M7 17L17 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
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

      {/* Mobile CTA Buttons */}
      <div className="mobile-hero-cta enhanced">
        <Link 
          href="/signup" 
          className="mobile-primary-cta enhanced-primary"
        >
          <span>CREATE ACCOUNT</span>
        </Link>
        
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
