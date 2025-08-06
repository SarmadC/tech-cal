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
    
    // Initialize with random position data stored in data attributes
    const card = cardRef.current;
    const chaosX = Math.random() * (window.innerWidth - 300);
    const chaosY = Math.random() * (window.innerHeight - 150);
    const chaosRot = (Math.random() - 0.5) * 45;
    const chaosScale = 0.7 + Math.random() * 0.3;
    
    card.dataset.chaosX = String(chaosX);
    card.dataset.chaosY = String(chaosY);
    card.dataset.chaosRot = String(chaosRot);
    card.dataset.chaosScale = String(chaosScale);
    
    // Make visible after a staggered delay for a nice entry effect
    setTimeout(() => {
      card.classList.add('visible');
    }, index * 100);
  }, [index]);

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