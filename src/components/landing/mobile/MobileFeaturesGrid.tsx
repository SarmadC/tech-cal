'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { features } from '@/data/landing-page-data';

export interface MobileFeaturesGridProps {
  className?: string;
}

const MobileFeaturesGrid: React.FC<MobileFeaturesGridProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Animation constants
  const INITIAL_OFFSET = 72; // px between cards before stacking

  // Track scroll progress of the section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"] // Start when header enters viewport
  });

  // Create transform mappings for each card (outside of map to avoid hook rules violation)
  const card0Y = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [INITIAL_OFFSET * 0, INITIAL_OFFSET * 0 * 0.5, 0, 0]
  );
  const card0Scale = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1 - (0 * 0.02), 1 - (0 * 0.02)]
  );
  const card0Opacity = useTransform(
    scrollYProgress,
    [0, 0.2 + (0 * 0.15), 0.4 + (0 * 0.15)],
    [1, 1, 1]
  );

  const card1Y = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [INITIAL_OFFSET * 1, INITIAL_OFFSET * 1 * 0.5, 0, 0]
  );
  const card1Scale = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1 - (1 * 0.02), 1 - (1 * 0.02)]
  );
  const card1Opacity = useTransform(
    scrollYProgress,
    [0, 0.2 + (1 * 0.15), 0.4 + (1 * 0.15)],
    [1, 1, 1]
  );

  const card2Y = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [INITIAL_OFFSET * 2, INITIAL_OFFSET * 2 * 0.5, 0, 0]
  );
  const card2Scale = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1 - (2 * 0.02), 1 - (2 * 0.02)]
  );
  const card2Opacity = useTransform(
    scrollYProgress,
    [0, 0.2 + (2 * 0.15), 0.4 + (2 * 0.15)],
    [1, 1, 1]
  );

  const card3Y = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [INITIAL_OFFSET * 3, INITIAL_OFFSET * 3 * 0.5, 0, 0]
  );
  const card3Scale = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1 - (3 * 0.02), 1 - (3 * 0.02)]
  );
  const card3Opacity = useTransform(
    scrollYProgress,
    [0, 0.2 + (3 * 0.15), 0.4 + (3 * 0.15)],
    [1, 1, 1]
  );

  const cards = [
    { y: card0Y, scale: card0Scale, opacity: card0Opacity },
    { y: card1Y, scale: card1Scale, opacity: card1Opacity },
    { y: card2Y, scale: card2Scale, opacity: card2Opacity },
    { y: card3Y, scale: card3Scale, opacity: card3Opacity },
  ];

  // Static rendering for reduced motion
  if (shouldReduceMotion) {
    return (
      <section ref={containerRef} className={`mobile-features mobile-features--static ${className}`} id="features" aria-label="Features" role="region">
        <div className="mobile-features-header">
          <h2 className="mobile-features-title">Stop Scrolling, Start Growing</h2>
          <p className="mobile-features-subtitle">
            Powered by advanced aggregation, smart filtering, and real-time processing
            to deliver curated tech events at scale—no noise, just signal.
          </p>
        </div>

        <div className="mobile-features-list mobile-features-list--static">
          {features.map((feature, index) => (
            <div key={index} className="mobile-feature-card mobile-feature-card--static">
              <div className="mobile-feature-content">
                <div className="mobile-feature-icon">
                  <div className="icon-wrapper" aria-hidden="true">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="mobile-feature-title">{feature.title}</h3>
                <p className="mobile-feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className={`mobile-features ${className}`} id="features" aria-label="Features stacking animation" role="region">
      <div className="mobile-features-header">
        <h2 className="mobile-features-title">Stop Scrolling, Start Growing</h2>
        <p className="mobile-features-subtitle">
          Transform chaos into clarity. Get the tech events that matter to your career,
          delivered intelligently to your calendar—no noise, just signal.
        </p>
      </div>

      <div className="mobile-features-list">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="mobile-feature-card"
            style={{
              y: cards[index].y,
              scale: cards[index].scale,
              opacity: cards[index].opacity,
            }}
          >
            <div className="mobile-feature-content">
              <div className="mobile-feature-icon">
                <div className="icon-wrapper" aria-hidden="true">
                  {feature.icon}
                </div>
              </div>
              <h3 className="mobile-feature-title">{feature.title}</h3>
              <p className="mobile-feature-description">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default MobileFeaturesGrid;