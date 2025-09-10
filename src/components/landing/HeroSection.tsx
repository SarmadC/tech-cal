'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { OrbitingCircles } from './OrbitingCircles';
import { Calendar, Search, Filter, Sparkles } from 'lucide-react';

const LightRays = dynamic(() => import('./LightRays'), { ssr: false });

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

            {/* Orbiting Icons (masked to avoid overlapping hero text) */}
            <div className="hero-orbit-layer" aria-hidden="true">
                <OrbitingCircles radius={420} duration={36} iconSize={28}>
                    <Calendar />
                    <Search />
                    <Filter />
                    <Sparkles />
                </OrbitingCircles>
            </div>

            {/* Hero Content */}
            <div className="hero-content">
                {/* Main Heading */}
                <h1 className="hero-title">
                    The All‑in‑One Tech Events Calendar
                </h1>

                {/* Sub Heading */}
                <p className="hero-subtitle">
                    Conferences, meetups, launches, livestreams—everything in one place, without the overload.
                </p>

                {/* CTA Buttons */}
                <div className="hero-cta">
                    <Link
                        href="/calendar"
                        aria-label="Open the live tech events calendar"
                        className="inline-flex h-12 animate-shimmer motion-reduce:animate-none items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-8 py-4 font-medium text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
                    >
                        See Live Calendar
                    </Link>
                    <Link 
                        href="#features"
                        aria-label="Jump to Kure-Cal features"
                        className="inline-flex h-12 items-center justify-center rounded-md border border-slate-800 px-8 py-4 font-medium text-slate-300 transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
                    >
                        Explore Features
                    </Link>
                </div>
            </div>
        </section>
    );
}