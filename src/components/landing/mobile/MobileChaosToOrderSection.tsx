'use client';

import React, { useEffect, useRef } from 'react';

export interface MobileChaosToOrderSectionProps {
  className?: string;
}

const MobileChaosToOrderSection: React.FC<MobileChaosToOrderSectionProps> = ({ 
  className = '' 
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.3 }
    );

    const currentRef = sectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className={`mobile-chaos-to-order ${className}`}>
      <div className="mobile-chaos-container">
        {/* Header */}
        <div className="mobile-chaos-header">
          <h2 className="mobile-chaos-title">
            From Chaos to Order
          </h2>
          <p className="mobile-chaos-subtitle">
            Stop scrolling through endless lists. Get the events that matter.
          </p>
        </div>

        {/* Simple Process */}
        <div className="mobile-process">
          <div className="process-item">
            <div className="process-number">01</div>
            <div className="process-content">
              <h3 className="process-title">Discover</h3>
              <p className="process-description">
                AI finds events matching your interests and career goals
              </p>
            </div>
          </div>

          <div className="process-divider"></div>

          <div className="process-item">
            <div className="process-number">02</div>
            <div className="process-content">
              <h3 className="process-title">Filter</h3>
              <p className="process-description">
                Remove noise, keep only what&apos;s relevant to your growth
              </p>
            </div>
          </div>

          <div className="process-divider"></div>

          <div className="process-item">
            <div className="process-number">03</div>
            <div className="process-content">
              <h3 className="process-title">Deliver</h3>
              <p className="process-description">
                Events appear in your calendar when you need them
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileChaosToOrderSection;
