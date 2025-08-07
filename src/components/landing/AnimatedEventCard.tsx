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
    
    // Set initial off-screen position to prevent flash
    // This will be immediately overridden by the animation hook
    cardRef.current.style.transform = 'translate3d(-9999px, -9999px, 0)';
    
  }, []);

  return (
      <div ref={cardRef} className="event-card-animated" data-index={index}>
          <div className="event-card-header">
              <div className="event-card-company">{event.company}</div>
              <div className="event-card-date">{event.date}</div>
          </div>
          <div className="event-card-title">{event.title}</div>
          <div className="event-card-type">{event.type}</div>
      </div>
  );
}