'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const ChaosToOrderSection = dynamic(
    () => import('./ChaosToOrderSection').then((mod) => ({ default: mod.ChaosToOrderSection })),
    {
        ssr: false,
        loading: () => <div style={{ height: '250vh', background: '#0f0f23' }}>Loading animation...</div>
    }
);

import {
    LandingNav,
    HeroSection,
    SocialProof,
    FeaturesGrid,
    Footer
} from './';

export default function LandingPage() {
    useEffect(() => {
        const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
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
            <LandingNav />
            <main>
                <HeroSection />
                {/* This now renders the dynamically loaded component */}
                <ChaosToOrderSection />
                <SocialProof />
                <FeaturesGrid />
            </main>
            <Footer />
        </div>
    );
}