'use client';

import React from 'react';
import Link from 'next/link';
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
                        Your Calendar,<br />
                        <span className="hero-headline-accent">Reimagined.</span>
                    </h1>
                    <p className="hero-subtext">
                        Discover, track, and attend tech events that move your career forward.
                    </p>
                </div>

                {/* Floating event card - tilted 15° */}
                <div className="hero-floating-card-wrapper">
                    <div className="hero-floating-card">
                        <HeroEventCard />
                    </div>
                </div>
            </div>

            {/* Sticky bottom CTA bar */}
            <div className="hero-sticky-cta-bar">
                <Link href="/discover" className="hero-cta-button">
                    <span className="hero-cta-text">Discover Events</span>
                    <span className="hero-cta-arrow-chip" aria-hidden="true">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                </Link>
            </div>
        </section>
    );
};

export default MobileHeroSection;
