'use client';

import React from 'react';
import HeroEventCard from './HeroEventCard';

export interface MobileHeroSectionProps {
    isIOS?: boolean;
    isAndroid?: boolean;
    className?: string;
}

/**
 * MobileHeroSection - "Product Immersion" Layout
 * 
 * A product-first hero design that proves value instantly with:
 * - Sharp, left-aligned headline
 * - Floating event card preview (tilted 15°)
 * - Sticky bottom CTA bar
 * - Deep charcoal background with subtle grid pattern
 */
const MobileHeroSection: React.FC<MobileHeroSectionProps> = ({
    isIOS: _isIOS = false,
    isAndroid: _isAndroid = false,
    className = ''
}) => {
    return (
        <section className={`mobile-hero-immersion ${className}`}>
            {/* Subtle grid pattern background */}
            <div className="hero-grid-pattern" aria-hidden="true" />

            {/* Main content area */}
            <div className="hero-content-wrapper">
                {/* Left-aligned text block */}
                <div className="hero-text-block">
                    <h1 className="hero-headline">
                        The <span className="hero-headline-accent">Professional</span> Tech Calendar
                    </h1>
                    <p className="hero-subtext">
                        Curated conferences, effortless filtering, and zero noise. The only calendar designed for serious engineering careers.
                    </p>
                </div>

                {/* Floating event card - tilted 15° */}
                <div className="hero-floating-card-wrapper">
                    <div className="hero-floating-card">
                        <HeroEventCard />
                    </div>
                </div>
            </div>

        </section>
    );
};

export default MobileHeroSection;
