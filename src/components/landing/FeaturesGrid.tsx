'use client';
import '@/app/styles/features.css';
import { useEffect, useRef } from 'react';
import { features } from '@/data/landing-page-data';

export function FeaturesGrid() {
    const gridRef = useRef<HTMLDivElement>(null);

    // Better bento box layout - creating a more balanced grid
    const bentoLayouts = [
        "md:col-span-2 md:row-span-2 hero-feature",     // Smart Filtering (2x2)
        "md:col-span-2 md:row-span-1 wide-feature",     // Real-time Updates (2x1)  
        "md:col-span-1 md:row-span-1 regular-feature",  // Calendar Sync (1x1)
        "md:col-span-1 md:row-span-1 regular-feature",  // Custom Views (1x1)
        "md:col-span-2 md:row-span-1 wide-feature",     // Team Collaboration (2x1)
        "md:col-span-2 md:row-span-1 wide-feature",     // Analytics Dashboard (2x1)
    ];

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 100);
                }
            });
        }, observerOptions);

        // ✅ Fixed: Use the correct class name
        const cards = gridRef.current?.querySelectorAll('.bento-card-enhanced');
        cards?.forEach(card => observer.observe(card));

        // ✅ Also observe the header for fade-in animation
        const header = gridRef.current?.parentElement?.querySelector('.features-header');
        if (header) observer.observe(header);

        return () => {
            cards?.forEach(card => observer.unobserve(card));
            if (header) observer.unobserve(header);
        };
    }, []);

    return (
        <section className="features-enhanced" id="features">
            <div className="features-header fade-in">
                <h2 className="features-title">The Complete Solution</h2>
                <p className="features-subtitle">
                    Everything you need to stay on top of the tech world,
                    without the information overload
                </p>
            </div>

            <div ref={gridRef} className="bento-grid-enhanced">
                {features.map((feature, index) => {
                    const layoutClass = bentoLayouts[index % bentoLayouts.length];
                    const animationClass = `slide-in-stagger`;

                    return (
                        <div
                            key={index}
                            className={`bento-card-enhanced ${layoutClass} ${animationClass}`}
                            data-index={index}
                        >
                            <div className="card-pattern"></div>
                            <div className="card-gradient"></div>
                            <div className="bento-card-content-enhanced">
                                <div className="feature-icon-enhanced">
                                    <div className="icon-wrapper">
                                        {feature.icon}
                                    </div>
                                </div>
                                <h3 className="feature-title-enhanced">{feature.title}</h3>
                                <p className="feature-description-enhanced">{feature.description}</p>

                                {/* Removed the calendar dots from Smart Filtering */}

                                {(index === 1 || index === 2) && (
                                    <div className="progress-ring">
                                        <svg className="progress-svg" width="40" height="40">
                                            <circle
                                                className="progress-background"
                                                cx="20"
                                                cy="20"
                                                r="18"
                                                fill="none"
                                                stroke="rgba(255, 255, 255, 0.1)"
                                                strokeWidth="2"
                                            />
                                            <circle
                                                className="progress-bar"
                                                cx="20"
                                                cy="20"
                                                r="18"
                                                fill="none"
                                                stroke="#A47864"
                                                strokeWidth="2"
                                                strokeDasharray="113"
                                                strokeDashoffset="28"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                )}

                                <div className="bento-arrow-enhanced">
                                    <div className="arrow-container">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}