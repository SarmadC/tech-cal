'use client';
import '@/app/styles/landing-page.css';

import { features } from '@/data/landing-page-data';

export function FeaturesGrid() {
    // Define bento layout classes for different sized cards
    const bentoLayouts = [
        "md:col-span-2 md:row-span-1", // Wide card
        "md:col-span-1 md:row-span-2", // Tall card  
        "md:col-span-1 md:row-span-1", // Regular card
        "md:col-span-1 md:row-span-1", // Regular card
        "md:col-span-2 md:row-span-1", // Wide card
        "md:col-span-1 md:row-span-1", // Regular card
    ];

    return (
        <section className="features" id="features">
            <div className="features-header fade-in">
                <h2 className="features-title">The Complete Solution</h2>
                <p className="features-subtitle">
                    Everything you need to stay on top of the tech world,
                    without the information overload
                </p>
            </div>

            {/* Bento Grid Container */}
            <div className="bento-grid">
                {features.map((feature, index) => {
                    const layoutClass = bentoLayouts[index % bentoLayouts.length];
                    const animationClass = index % 2 === 0 ? 'slide-in-left' : 'slide-in-right';

                    return (
                        <div 
                            key={index} 
                            className={`bento-card ${layoutClass} ${animationClass}`}
                        >
                            {/* Content */}
                            <div className="bento-card-content">
                                <div className="feature-icon">{feature.icon}</div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                                
                                {/* Hover Arrow */}
                                <div className="bento-arrow">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}