'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useAuth } from '@/contexts/AuthContext';
import MobileHeroSection from './MobileHeroSection';
import MobileChaosToOrderSection from './MobileChaosToOrderSection';
import MobileFeatureShowcaseSection from './MobileFeatureShowcaseSection';
import MobileFeaturesGrid from './MobileFeaturesGrid';
import MobileHackathonHighlightSection from './MobileHackathonHighlightSection';
import MobileUseCasesSection from './MobileUseCasesSection';
import MobileFAQSection from './MobileFAQSection';
import MobileFooter from './MobileFooter';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import '@/app/styles/mobile-landing.css';
import '@/app/styles/mobile-design-system.css';

export interface MobileLandingPageProps {
    className?: string;
}

const MobileLandingPage: React.FC<MobileLandingPageProps> = ({ className = '' }) => {
    const { isMobile, userAgent } = useDeviceDetection();
    const { user } = useAuth();

    // Enhanced mobile detection for specific devices
    const isIOSMobile = userAgent.isIOS && isMobile;
    const isAndroidMobile = userAgent.isAndroid && isMobile;
    const exploreHref = user ? '/discover' : '/events';

    const navItems = [
        {
            name: "Features",
            href: "#features",
        },
        {
            name: "Pricing",
            href: "/pricing",
        },
        {
            name: "Blog",
            href: "/blog",
        },
    ];

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        const elements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
        elements.forEach(el => observer.observe(el));

        return () => elements.forEach(el => observer.unobserve(el));
    }, []);

    return (
        <div className={`mobile-landing-container ${className}`}>
            {/* Mobile Navigation */}
            <UnifiedMobileNavbar
                navItems={navItems}
                showThemeToggle={true}
                showLogo={true}
            />

            <main className="mobile-landing-main">
                <MobileHeroSection
                    isIOS={isIOSMobile}
                    isAndroid={isAndroidMobile}
                />
                <MobileChaosToOrderSection />
                <MobileFeatureShowcaseSection />
                <MobileHackathonHighlightSection />
                <MobileFeaturesGrid />
                <MobileUseCasesSection />
                <MobileFAQSection />
            </main>

            <div className="hero-sticky-cta-bar">
                <Link href={exploreHref} className="hero-cta-button">
                    <span className="hero-cta-balance-spacer" aria-hidden="true" />
                    <span className="hero-cta-text">Explore Events</span>
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

            <MobileFooter />
        </div>
    );
};

export default MobileLandingPage;
