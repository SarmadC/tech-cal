'use client';

import { features } from '@/data/landing-page-data';

export function FeaturesGrid() {
    return (
        <section className="features" id="features">
            <div className="features-header fade-in">
                <h2 className="features-title">The Complete Solution</h2>
                <p className="features-subtitle">
                    Everything you need to stay on top of the tech world,
                    without the information overload
                </p>
            </div>
            <div className="features-grid">
                {features.map((feature, index) => (
                    <div key={index} className={`feature-card ${index % 2 === 0 ? 'slide-in-left' : 'slide-in-right'}`}>
                        <div className="feature-icon">{feature.icon}</div>
                        <h3 className="feature-title">{feature.title}</h3>
                        <p className="feature-description">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}