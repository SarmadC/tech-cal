'use client';

import '@/app/styles/features.css';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { features } from '@/data/landing-page-data';

export function FeaturesGrid() {
    const { isMobile } = useDeviceDetection();

    return (
        <section className="features-enhanced features-sticky" id="features">
            <div className="features-sticky-grid">
                <div className="features-left">
                    <h2 className="features-title">How it actually works</h2>
                    <p className="features-subtitle">
                        Events from 100+ sources, filtered for noise,
                        and synced to your calendar, automatically.
                    </p>
                </div>
                <div className="features-right">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="feature-sticky-card"
                            style={!isMobile ? { top: `${30 + index * 2}vh` } : undefined}
                        >
                            <div className="feature-sticky-icon">
                                <div className="icon-wrapper">{feature.icon}</div>
                            </div>
                            <h3 className="feature-title-enhanced">{feature.title}</h3>
                            <p className="feature-description-enhanced">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}