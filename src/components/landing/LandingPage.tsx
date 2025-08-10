'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const ChaosToOrderSection = dynamic(
    // This function tells Next.js how to load the component
    () => import('./ChaosToOrderSection').then((mod) => mod.ChaosToOrderSection),
    {
        // This component uses browser APIs, so we must disable Server-Side Rendering
        ssr: false,
        // This provides a placeholder to prevent the page layout from shifting while the component loads
        loading: () => <div style={{ height: '250vh' }} />
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