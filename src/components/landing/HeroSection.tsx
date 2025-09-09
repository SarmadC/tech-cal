'use client';

import Link from 'next/link';
import LightRays from './LightRays';

export function HeroSection() {
    return (
        <section className="hero">
            {/* Light Rays Effect */}
            <LightRays
                raysOrigin="top-center"
                raysColor="#ffffff"
                raysSpeed={1.5}
                lightSpread={0.8}
                rayLength={1.2}
                pulsating={false}
                fadeDistance={1.0}
                saturation={1.0}
                followMouse={true}
                mouseInfluence={0.1}
                noiseAmount={0.1}
                distortion={0.05}
                className="hero-light-rays"
            />

            {/* Hero Content */}
            <div className="hero-content">
                {/* Main Heading */}
                <h1 className="hero-title">
                    Never Miss What Matters
                </h1>

                {/* Sub Heading */}
                <p className="hero-subtitle">
                    antidote to the information overload
                </p>

                {/* CTA Buttons */}
                <div className="hero-cta">
                    <button
                        className="inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-8 py-4 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
                        onClick={() => window.location.href = '/calendar'}
                    >
                        See Live Calendar
                    </button>
                    <Link 
                        href="/features" 
                        className="inline-flex h-12 items-center justify-center rounded-md border border-slate-800 px-8 py-4 font-medium text-slate-300 transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
                        style={{ paddingLeft: '32px', paddingRight: '32px' }}
                    >
                        Learn More
                    </Link>
                </div>
            </div>
        </section>
    );
}