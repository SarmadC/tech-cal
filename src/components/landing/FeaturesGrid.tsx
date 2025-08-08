'use client';
import '@/app/styles/features.css';
import { useEffect, useRef } from 'react';
import { features } from '@/data/landing-page-data';

export function FeaturesGrid() {
    const gridRef = useRef<HTMLDivElement>(null);

    // Enhanced bento layout with varied sizes for visual hierarchy
    const bentoLayouts = [
        "md:col-span-2 md:row-span-2 hero-feature", // Hero feature (2x2)
        "md:col-span-2 md:row-span-1 wide-feature", // Wide secondary feature
        "md:col-span-1 md:row-span-2 tall-feature", // Tall feature  
        "md:col-span-1 md:row-span-1 regular-feature", // Regular card
        "md:col-span-1 md:row-span-1 regular-feature", // Regular card
        "md:col-span-1 md:row-span-1 regular-feature", // Regular card
    ];

    // Intersection Observer for staggered animations
    useEffect(() => {
        const observerOptions = { 
            threshold: 0.1, 
            rootMargin: '0px 0px -50px 0px' 
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Staggered animation delay
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 100); // 100ms delay between cards
                }
            });
        }, observerOptions);

        const cards = gridRef.current?.querySelectorAll('.bento-card');
        cards?.forEach(card => observer.observe(card));

        return () => cards?.forEach(card => observer.unobserve(card));
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

            {/* Enhanced Bento Grid Container */}
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
                            {/* Background Pattern */}
                            <div className="card-pattern"></div>
                            
                            {/* Gradient Overlay */}
                            <div className="card-gradient"></div>
                            
                            {/* Content */}
                            <div className="bento-card-content-enhanced">
                                <div className="feature-icon-enhanced">
                                    <div className="icon-wrapper">
                                        {feature.icon}
                                    </div>
                                </div>
                                <h3 className="feature-title-enhanced">{feature.title}</h3>
                                <p className="feature-description-enhanced">{feature.description}</p>
                                
                                {/* Interactive Elements for Hero Feature */}
                                {index === 0 && (
                                    <div className="hero-extras">
                                        <div className="mini-calendar">
                                            <div className="calendar-dots">
                                                <span className="dot active"></span>
                                                <span className="dot"></span>
                                                <span className="dot"></span>
                                                <span className="dot busy"></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Progress Ring for Secondary Features */}
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
                                
                                {/* Magnetic Hover Arrow */}
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