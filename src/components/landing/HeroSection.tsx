'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { OrbitingCircles } from './OrbitingCircles';
import { CalendarIcon, ArrowClockwiseIcon, MicrophoneIcon, MegaphoneIcon, RocketIcon, TicketIcon } from '@phosphor-icons/react';

const LightRays = dynamic(() => import('./LightRays'), { ssr: false });

export function HeroSection() {
    const orbitLayerRef = useRef<HTMLDivElement>(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const { isMobile, isTablet } = useDeviceDetection();

    useEffect(() => {
        if (typeof window === 'undefined' || !('matchMedia' in window)) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setPrefersReducedMotion(!!mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);

    // Subtle parallax drift for orbit layer
    useEffect(() => {
        if (prefersReducedMotion || isMobile || isTablet) {
            // reset drift if disabled
            const el = orbitLayerRef.current;
            if (el) {
                el.style.setProperty('--parallax-x', '0px');
                el.style.setProperty('--parallax-y', '0px');
            }
            return;
        }
        const el = orbitLayerRef.current;
        if (!el) return;

        let rafId: number | null = null;
        let targetX = 0, targetY = 0;
        let currentX = 0, currentY = 0;
        const amplitude = 14; // px

        const onMove = (e: MouseEvent) => {
            const nx = (e.clientX / window.innerWidth) - 0.5;
            const ny = (e.clientY / window.innerHeight) - 0.5;
            targetX = nx * amplitude;
            targetY = ny * amplitude;
            if (rafId == null) rafId = requestAnimationFrame(tick);
        };

        const tick = () => {
            // ease towards target
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            el.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`);
            el.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`);
            rafId = Math.abs(currentX - targetX) < 0.1 && Math.abs(currentY - targetY) < 0.1
                ? null
                : requestAnimationFrame(tick);
        };

        window.addEventListener('mousemove', onMove);
        return () => {
            window.removeEventListener('mousemove', onMove);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [prefersReducedMotion, isMobile, isTablet]);
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
            <div ref={orbitLayerRef} className="hero-orbit-layer" aria-hidden="true">
                {/* Outer ring: KURE + Calendar + Sync */}
                <OrbitingCircles 
                    radius={isMobile ? 300 : isTablet ? 380 : 460} 
                    duration={isMobile ? 40 : 32} 
                    iconSize={isMobile ? 24 : isTablet ? 28 : 32} 
                    reverse
                >
                    {/* K - Keynotes */}
                    <MicrophoneIcon />
                    {/* U - Updates */}
                    <MegaphoneIcon />
                    {/* R - Releases */}
                    <RocketIcon />
                    {/* E - Events */}
                    <TicketIcon />
                    {/* Calendar */}
                    <CalendarIcon />
                    {/* Sync */}
                    <ArrowClockwiseIcon />
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
                        className={`hero-primary-btn inline-flex ${isMobile ? 'h-14' : 'h-12'} animate-shimmer motion-reduce:animate-none items-center justify-center rounded-md ${isMobile ? 'px-6 py-4' : 'px-8 py-4'} font-medium transition-colors focus:outline-none focus:ring-2 ${isMobile ? 'text-base' : 'text-sm'}`}
                    >
                        See Live Calendar
                    </Link>
                    <Link 
                        href="#features"
                        aria-label="Jump to Kure-Cal features"
                        className={`hero-secondary-btn inline-flex ${isMobile ? 'h-14' : 'h-12'} items-center justify-center rounded-md ${isMobile ? 'px-6 py-4' : 'px-8 py-4'} font-medium transition-colors focus:outline-none focus:ring-2 ${isMobile ? 'text-base' : 'text-sm'}`}
                    >
                        Explore Features
                    </Link>
                </div>
            </div>
        </section>
    );
}