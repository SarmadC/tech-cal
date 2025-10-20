'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import GlassSurface from '@/components/GlassSurface';

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
  return (
    <section className={`mobile-hero ${className}`}>
      {/* Programmatic gradient background */}
      <div className="mobile-hero-background" aria-hidden="true">
        <div className="mobile-hero-surface" />
        <div className="mobile-hero-overlay" />
      </div>

      {/* Mobile Hero Content - New Layout */}
      <div className="mobile-hero-content">
        {/* Hero Image Container */}
        <div className="mobile-hero-image-container">
          <Image 
            src="/kanhaiya-sharma-EiAqej-cGks-unsplash(1).jpg" 
            alt="Abstract geometric filter symbol"
            className="hero-image"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className="hero-image-overlay" />
          
          {/* Hero Text Overlay */}
          <div className="hero-text-overlay">
            {/* Hero Title */}
            <h1 className="mobile-hero-title">
              All-in-One<br />
              <span className="highlight-text">Tech Events Calendar</span>
            </h1>

            {/* Hero Subtitle */}
            <div className="mobile-hero-subtitle">
              <div className="subtitle-content">
                <p className="subtitle-main">
                  Effortless Event Discovery for Everyone
                </p>
                <p className="subtitle-secondary">
                  Never miss important tech events again.<br />
                  Find, track, and attend events that matter to your career.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mobile-hero-cta-container">
              <GlassSurface
                width="100%"
                height="auto"
                borderRadius={12}
                brightness={60}
                opacity={0.9}
                blur={10}
                displace={8}
                backgroundOpacity={0.12}
                saturation={1.15}
                distortionScale={-160}
                redOffset={4}
                greenOffset={12}
                blueOffset={20}
                mixBlendMode="screen"
                className="mobile-liquid-glass-cta"
                contentStyle={{ padding: 0 }}
              >
                <Link href="/discover" className="mobile-primary-cta-liquid">
                  <span>DISCOVER EVENTS</span>
                </Link>
              </GlassSurface>
            </div>
          </div>
        </div>
      
      </div>
    </section>
  );
};

export default MobileHeroSection;
