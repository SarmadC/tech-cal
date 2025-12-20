'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { eventsData } from '@/data/landing-page-data';
import Image from 'next/image';
import { getLogoSourcesForClient } from '@/utils/logoUtils';

interface EventCardProps {
  event: typeof eventsData[0];
  index: number;
}

export function AnimatedEventCard({ event, index }: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  const logoSources = useMemo(
    () => getLogoSourcesForClient(event.company, SUPABASE_URL),
    [event.company, SUPABASE_URL]
  );

  const [activeLogoSrc, setActiveLogoSrc] = useState<string | null>(
    () => logoSources[0] ?? null
  );

  useEffect(() => {
    setActiveLogoSrc(logoSources[0] ?? null);
  }, [event.company, logoSources]);

  const handleLogoError = useCallback(() => {
    if (!activeLogoSrc) return;
    const currentIndex = logoSources.indexOf(activeLogoSrc);
    const nextSrc = currentIndex >= 0 ? logoSources[currentIndex + 1] : undefined;
    setActiveLogoSrc(nextSrc ?? null);
  }, [activeLogoSrc, logoSources]);

  useEffect(() => {
    if (!cardRef.current) return;
    
    // Set initial off-screen position to prevent flash
    // This will be immediately overridden by the animation hook
    cardRef.current.style.transform = 'translate3d(-9999px, -9999px, 0)';
    
  }, []);

  return (
      <div ref={cardRef} className="event-card-animated" data-index={index}>
          <div className="event-card-header">
              <div className="event-card-logo-wrapper">
                {activeLogoSrc ? (
                  <Image
                    src={activeLogoSrc}
                    alt={`${event.company} logo`}
                    width={20}
                    height={20}
                    className="event-card-logo"
                    unoptimized
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="event-card-logo-placeholder">
                    {event.company.charAt(0)}
                  </div>
                )}
              </div>
              <div className="event-card-company">{event.company}</div>
              <div className="event-card-date">{event.date}</div>
          </div>
          <div className="event-card-title">{event.title}</div>
          <div className="event-card-type">{event.type}</div>
      </div>
  );
}