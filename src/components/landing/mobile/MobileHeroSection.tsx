'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ChromeCross = dynamic(() => import('@/components/ChromeCross'), { ssr: false });

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
            {/* Full-screen ChromeCross animation background */}
            <div className="mobile-hero-background-animation">
                <ChromeCross />
            </div>

            {/* Overlay gradient for text readability */}
            <div className="mobile-hero-overlay-gradient" />

            {/* Mobile Hero Content - Overlaid on image */}
            <div className="mobile-hero-content">
                {/* Text Content Section */}
                <div className="mobile-hero-text-section">
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
                </div>

                {/* CTA Button Section */}
                <div className="mobile-hero-cta-section">
                    <Link href="/discover" className="mobile-hero-cta-button">
                        <span>Discover Events</span>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default MobileHeroSection;
