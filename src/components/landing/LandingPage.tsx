'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import MarketingNavbar from '@/components/common/MarketingNavbar';

const ProductDemoSection = dynamic(
    () => import('./ProductDemoSection').then((mod) => ({ default: mod.default })),
    {
        ssr: false,
        loading: () => <div className="h-[800px] w-full bg-background/5 animate-pulse rounded-3xl" />
    }
);

import {
    HeroSection,
    FeaturesGrid,
    Footer,
    UseCasesSection,
    FAQSection,
    CoverageSection,
    FeatureShowcaseSection,
    HackathonHighlightSection
} from './';

export default function LandingPage() {
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
        <div className="landing-container">
            <div className="relative w-full">
                <MarketingNavbar />
            </div>

            <main>
                <HeroSection />
                {/* This now renders the dynamically loaded component */}
                <ProductDemoSection />
                <FeatureShowcaseSection />
                <HackathonHighlightSection />
                <FeaturesGrid />
                <UseCasesSection />
                <CoverageSection />
                <FAQSection />
            </main>
            <Footer />
        </div>
    );
}
