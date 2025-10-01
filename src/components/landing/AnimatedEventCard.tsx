'use client';

import { useRef, useEffect } from 'react';
import { eventsData } from '@/data/landing-page-data';
import Image from 'next/image';

interface EventCardProps {
  event: typeof eventsData[0];
  index: number;
}

// Logo utility function - matches mobile implementation
const getLogoUrl = (companyName: string): string => {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const companySlug: Record<string, string> = {
    meta: 'meta',
    google: 'google',
    apple: 'apple',
    microsoft: 'microsoft',
    github: 'github',
    openai: 'openai',
    nvidia: 'nvidia',
    amazon: 'amazon',
    docker: 'docker',
  };

  const key = companyName.toLowerCase();
  const slug = Object.keys(companySlug).find((k) => key.includes(k));
  
  if (SUPABASE_URL && slug) {
    return `${SUPABASE_URL}/storage/v1/object/public/logos/${companySlug[slug]}.svg`;
  }
  
  // Fallback to Clearbit
  const domain = slug ? `${companySlug[slug]}.com` : 'example.com';
  return `https://logo.clearbit.com/${domain}`;
};

export function AnimatedEventCard({ event, index }: EventCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const logoUrl = getLogoUrl(event.company);

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
                <Image
                  src={logoUrl}
                  alt={`${event.company} logo`}
                  width={20}
                  height={20}
                  className="event-card-logo"
                  unoptimized
                />
              </div>
              <div className="event-card-company">{event.company}</div>
              <div className="event-card-date">{event.date}</div>
          </div>
          <div className="event-card-title">{event.title}</div>
          <div className="event-card-type">{event.type}</div>
      </div>
  );
}