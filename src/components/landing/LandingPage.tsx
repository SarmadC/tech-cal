'use client';

import { useEffect } from 'react';
import {
    LandingNav,
    HeroSection,
    ChaosToOrderSection,
    SocialProof,
    FeaturesGrid,
    FinalCTA,
    Footer
} from './';
export default function LandingPage() {
    // The IntersectionObserver logic for simple animations can live here,
    // as it controls multiple child components.
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
                <ChaosToOrderSection />
                <SocialProof />
                <FeaturesGrid />
                <FinalCTA />
            </main>
            <Footer />
        </div>
    );
}