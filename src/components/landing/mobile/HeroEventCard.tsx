'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Clock, MapPin } from '@phosphor-icons/react';
import { getLogoSourcesForClient } from '@/utils/logoUtils';

/**
 * HeroEventCard - A decorative event card for the mobile hero section
 * Features glassmorphism styling and displays a sample event
 */
export default function HeroEventCard() {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Featured event data for the decorative hero preview.
    const event = {
        company: 'NVIDIA',
        title: 'NVIDIA GTC 2026',
        date: 'Mar 16-19',
        time: 'Keynote Mar 16',
        location: 'San Jose, CA',
        type: 'AI Conference',
    };

    const logoSources = useMemo(
        () => getLogoSourcesForClient(event.company, SUPABASE_URL),
        [event.company, SUPABASE_URL]
    );

    const [activeLogoSrc, setActiveLogoSrc] = useState<string | null>(
        () => logoSources[0] ?? null
    );

    useEffect(() => {
        setActiveLogoSrc(logoSources[0] ?? null);
    }, [logoSources]);

    const handleLogoError = useCallback(() => {
        if (!activeLogoSrc) return;
        const currentIndex = logoSources.indexOf(activeLogoSrc);
        const nextSrc = currentIndex >= 0 ? logoSources[currentIndex + 1] : undefined;
        setActiveLogoSrc(nextSrc ?? null);
    }, [activeLogoSrc, logoSources]);

    return (
        <div className="hero-event-card">
            {/* Card Header - Logo and Company */}
            <div className="hero-event-card-header">
                <div className="hero-event-card-logo">
                    {activeLogoSrc ? (
                        <Image
                            src={activeLogoSrc}
                            alt={`${event.company} logo`}
                            width={32}
                            height={32}
                            className="hero-event-card-logo-img"
                            unoptimized
                            onError={handleLogoError}
                        />
                    ) : (
                        <div className="hero-event-card-logo-placeholder">
                            {event.company.charAt(0)}
                        </div>
                    )}
                </div>
                <div className="hero-event-card-company">{event.company}</div>
            </div>

            {/* Card Title */}
            <h3 className="hero-event-card-title">{event.title}</h3>

            {/* Card Meta Info */}
            <div className="hero-event-card-meta">
                <div className="hero-event-card-meta-item">
                    <Clock size={14} weight="regular" />
                    <span>{event.date} · {event.time}</span>
                </div>
                <div className="hero-event-card-meta-item">
                    <MapPin size={14} weight="regular" />
                    <span>{event.location}</span>
                </div>
            </div>

            {/* Card Type Badge */}
            <div className="hero-event-card-badge">
                {event.type}
            </div>
        </div>
    );
}
