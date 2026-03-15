'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useTheme } from 'next-themes';
import { usePostHog } from 'posthog-js/react';
import { OrbitingCircles } from './OrbitingCircles';
import { CalendarIcon, ArrowClockwiseIcon, MicrophoneIcon, MegaphoneIcon, RocketIcon, TicketIcon } from '@phosphor-icons/react';

const LightRays = dynamic(() => import('./LightRays'), { ssr: false });
const HERO_THEME_PRESETS = {
    dark: {
        raysOrigin: 'top-center' as const,
        raysColor: '#ffffff',
        raysSpeed: 1.5,
        lightSpread: 0.8,
        rayLength: 1.2,
        pulsating: false,
        fadeDistance: 1.0,
        saturation: 1.0,
        followMouse: true,
        mouseInfluence: 0.1,
        noiseAmount: 0.1,
        distortion: 0.05,
    },
    light: {
        raysOrigin: 'top-center' as const,
        raysColor: '#94a3b8',
        raysSpeed: 1.35,
        lightSpread: 0.74,
        rayLength: 1.08,
        pulsating: false,
        fadeDistance: 0.92,
        saturation: 0.78,
        followMouse: true,
        mouseInfluence: 0.05,
        noiseAmount: 0.03,
        distortion: 0.018,
    },
};

export function HeroSection() {
    const orbitLayerRef = useRef<HTMLDivElement>(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const { isMobile, isTablet } = useDeviceDetection();
    const { theme, resolvedTheme } = useTheme();
    const posthog = usePostHog();

    const rootThemeMode =
        typeof document !== 'undefined'
            ? document.documentElement.classList.contains('dark')
                ? 'dark'
                : document.documentElement.classList.contains('light')
                    ? 'light'
                    : undefined
            : undefined;
    const themeMode =
        resolvedTheme === 'dark' || resolvedTheme === 'light'
            ? resolvedTheme
            : theme === 'dark' || theme === 'light'
                ? theme
                : rootThemeMode;
    const heroThemePreset = themeMode === 'dark'
        ? HERO_THEME_PRESETS.dark
        : themeMode === 'light'
            ? HERO_THEME_PRESETS.light
            : null;

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
            {heroThemePreset ? (
                <LightRays
                    {...heroThemePreset}
                    className="hero-light-rays"
                />
            ) : null}

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
                    Calendar that <span className="text-gradient-mono">grows your career</span>
                </h1>

                {/* Sub Heading */}
                <p className="hero-subtitle">
                    Vetted tech events. Smart filters. One-tap Google Calendar sync. <br className="hidden md:block" />
                    Built for engineers who invest in growth.
                </p>

                {/* CTA Buttons */}
                <div className="hero-cta">
                    <Link
                        href="/events?src=hero"
                        aria-label="Discover personalized tech events"
                        className={`hero-primary-btn inline-flex ${isMobile ? 'h-14' : 'h-12'} animate-shimmer motion-reduce:animate-none items-center justify-center rounded-md ${isMobile ? 'px-6 py-4' : 'px-8 py-4'} font-medium transition-colors focus:outline-none focus:ring-2 ${isMobile ? 'text-base' : 'text-sm'}`}
                        onClick={() => posthog?.capture('landing_cta_clicked', { cta_text: 'Browse Events Free', cta_location: 'hero', destination: '/events' })}
                    >
                        Browse Events Free
                    </Link>
                    <Link
                        href="#product-demo"
                        aria-label="Jump to Product Demo"
                        className={`hero-secondary-btn inline-flex ${isMobile ? 'h-14' : 'h-12'} items-center justify-center rounded-md ${isMobile ? 'px-6 py-4' : 'px-8 py-4'} font-medium transition-colors focus:outline-none focus:ring-2 ${isMobile ? 'text-base' : 'text-sm'}`}
                        onClick={(e) => {
                            e.preventDefault();
                            posthog?.capture('landing_cta_clicked', { cta_text: 'See It in Action', cta_location: 'hero', destination: '#product-demo' });
                            const element = document.getElementById('product-demo');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}
                    >
                        See It in Action
                    </Link>
                </div>
            </div>
        </section>
    );
}
