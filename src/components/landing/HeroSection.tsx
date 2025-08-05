'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { heroStats } from '@/data/landing-page-data';
import { CalendarPreview } from './CalendarPreview';

export function HeroSection() {
    return (
        <section className="hero">
            <div className="hero-bg"></div>
            <div className="hero-grid"></div>

            <div className="hero-content">
                <div className="hero-text">
                    <h1 className="hero-title">Never Miss What Matters</h1>
                    <p className="hero-subtitle">{"// antidote to information_overload"}</p>
                    <p className="hero-description">
                        Stop juggling 12 different calendars and missing crucial tech events.
                        Kure-Cal consolidates 500+ event sources into one intelligent calendar
                        that learns what you care about.
                    </p>
                    <div className="hero-stats">
                        {heroStats.map((stat, index) => (
                            <div key={index} className="hero-stat">
                                <span className="hero-stat-number">{stat.number}</span>
                                <div className="hero-stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="cta-container">
                        <Link href="/calendar" className="cta-button cta-primary">
                            <span>See Live Calendar</span>
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
                <CalendarPreview />
            </div>
        </section>
    );
}