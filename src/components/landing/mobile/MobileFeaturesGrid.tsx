'use client';

import React, { useEffect, useRef } from 'react';
import { features } from '@/data/landing-page-data';

export interface MobileFeaturesGridProps {
  className?: string;
}

const MobileFeaturesGrid: React.FC<MobileFeaturesGridProps> = ({ className = '' }) => {
  const gridRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Small stagger for a calm entrance
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 80);
        }
      });
    }, observerOptions);

    const cards = gridRef.current?.querySelectorAll('.mobile-feature-card');
    cards?.forEach((card) => observer.observe(card));

    const header = gridRef.current?.parentElement?.querySelector('.mobile-features-header');
    if (header) observer.observe(header);

    return () => {
      cards?.forEach((card) => observer.unobserve(card));
      if (header) observer.unobserve(header);
    };
  }, []);

  return (
    <section className={`mobile-features ${className}`} id="features">
      <div className="mobile-features-header fade-in">
        <h2 className="mobile-features-title">Stop Scrolling, Start Growing</h2>
        <p className="mobile-features-subtitle">
          Transform chaos into clarity. Get the tech events that matter to your career,
          delivered intelligently to your calendar—no noise, just signal.
        </p>
      </div>

      <ul ref={gridRef} className="mobile-features-list" role="list">
        {features.map((feature, index) => (
          <li key={index} className="mobile-feature-card slide-in-stagger" data-index={index}>
            <div className="mobile-feature-content">
              <div className="mobile-feature-icon">
                <div className="icon-wrapper" aria-hidden="true">
                  {feature.icon}
                </div>
              </div>
              <h3 className="mobile-feature-title">{feature.title}</h3>
              <p className="mobile-feature-description">{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MobileFeaturesGrid;
