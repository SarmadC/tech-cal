'use client';

import React from 'react';
import {
  Database,
  Funnel,
  ArrowsClockwise,
  Lightning,
} from '@phosphor-icons/react';

export interface MobileFeaturesGridProps {
  className?: string;
}

// Feature data with layout hints
const bentoFeatures = [
  {
    icon: <Database size={24} weight="light" />,
    watermarkIcon: <Database size={80} weight="light" />,
    title: 'Event Aggregation Engine',
    description: 'Aggregates from 100+ event sources; RSS feeds, APIs, and ICS calendars with real-time updates.',
    layout: 'wide',
  },
  {
    icon: <Funnel size={24} weight="light" />,
    watermarkIcon: <Funnel size={64} weight="light" />,
    title: 'Smart Filters',
    description: 'Server-side filtering with 300+ filter options and full-text search.',
    layout: 'square',
  },
  {
    icon: <ArrowsClockwise size={24} weight="light" />,
    watermarkIcon: <ArrowsClockwise size={64} weight="light" />,
    title: 'Calendar Sync',
    description: 'One-tap Google Calendar sync with automatic reminders.',
    layout: 'square',
  },
  {
    icon: <Lightning size={24} weight="light" />,
    watermarkIcon: <Lightning size={80} weight="light" />,
    title: 'Real-time Data',
    description: 'Continuous event ingestion with quality control, deduplication, and instant availability.',
    layout: 'wide',
  },
];

const MobileFeaturesGrid: React.FC<MobileFeaturesGridProps> = ({ className = '' }) => {
  return (
    <section className={`mobile-features-bento ${className}`} id="features" aria-label="Features">
      {/* Section Header */}
      <div className="bento-header">
        <h2 className="bento-title">Stop Scrolling, Start Growing</h2>
        <p className="bento-subtitle">
          Transform chaos into clarity. Get the tech events that matter to your career, delivered intelligently to your calendar. No noise, just signal.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid">
        {bentoFeatures.map((feature, index) => (
          <article
            key={index}
            className={`bento-card ${feature.layout === 'wide' ? 'bento-card--wide' : 'bento-card--square'}`}
          >
            {/* Watermark Icon */}
            <div className="bento-card-watermark" aria-hidden="true">
              {feature.watermarkIcon}
            </div>

            {/* Content */}
            <div className="bento-card-content">
              <h3 className="bento-card-title">{feature.title}</h3>
              <p className="bento-card-description">{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MobileFeaturesGrid;