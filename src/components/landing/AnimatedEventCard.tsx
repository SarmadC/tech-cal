'use client';

import { useRef, useEffect } from 'react';
import { eventsData } from '@/data/landing-page-data';

interface EventCardProps {
  event: typeof eventsData[0];
  index: number;
}

export function AnimatedEventCard({ event, index }: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    
    // Don't store position data in DOM - it's now handled by the parent component
    // This reduces DOM manipulation and improves performance
    
    // The parent component will handle visibility, so we don't need to do it here
    // This was causing redundant operations
    
  }, []);

  return (
    <div 
      ref={cardRef} 
      className="event-card-animated" 
      data-index={index}
      // Add inline styles for better performance on initial render
      style={{
        // Start offscreen to prevent flash of unstyled content
        transform: 'translate3d(-9999px, -9999px, 0)',
        // Ensure GPU acceleration from the start
        willChange: 'transform, width, height',
        // Set initial dimensions
        width: '240px',
        height: '120px'
      }}
    >
      <div className="event-card-header">
        <div className="event-card-company">{event.company}</div>
        <div className="event-card-date">{event.date}</div>
      </div>
      <div className="event-card-title">{event.title}</div>
      <div className="event-card-type">{event.type}</div>
    </div>
  );
}