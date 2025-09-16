'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

export interface MobileChaosToOrderSectionProps {
  className?: string;
}

type Vec2 = { x: number; y: number };

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const MobileChaosToOrderSection: React.FC<MobileChaosToOrderSectionProps> = ({ className = '' }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const daysBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const startedRef = useRef(false);
  const finalizedRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const eventData = useMemo(
    () => [
      { company: 'Meta', date: 'May 1', title: 'Meta Con' },
      { company: 'Google', date: 'May 7', title: 'Google I/O' },
      { company: 'Apple', date: 'May 11', title: 'WWDC' },
      { company: 'Microsoft', date: 'May 13', title: 'Build' },
      { company: 'GitHub', date: 'May 15', title: 'Universe' },
    ],
    []
  );

  // Calendar metadata for alignment (May 2024)
  const YEAR = 2024;
  const MONTH_INDEX = 4; // May (0-based)
  const firstDayOffset = new Date(YEAR, MONTH_INDEX, 1).getDay();
  const daysInMonth = new Date(YEAR, MONTH_INDEX + 1, 0).getDate();

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const companySlug: Record<string, string> = {
    meta: 'meta',
    google: 'google',
    apple: 'apple',
    microsoft: 'microsoft',
    github: 'github',
    openai: 'openai',
    vercel: 'vercel',
    amazon: 'amazon',
    docker: 'docker',
  };
  const logoUrl = (name: string) => {
    const key = name.toLowerCase();
    const slug = Object.keys(companySlug).find((k) => key.includes(k));
    if (SUPABASE_URL && slug) return `${SUPABASE_URL}/storage/v1/object/public/logos/${companySlug[slug]}.svg`;
    const domain = slug ? `${companySlug[slug]}.com` : 'example.com';
    return `https://logo.clearbit.com/${domain}`;
  };

  const getTileSize = () => {
    const el = containerRef.current;
    if (!el) return 32;
    const s = getComputedStyle(el).getPropertyValue('--tile-size');
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : 32;
  };

  // Measure important layout points
  const measure = useCallback(() => {
    const container = containerRef.current;
    const bar = daysBarRef.current;
    const grid = gridRef.current;
    if (!container || !bar || !grid) return null;

    const containerRect = container.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const railY = Math.max(0, barRect.bottom - containerRect.top + 10); // pixels from container top

    const centers: Record<number, Vec2> = {};
    const cells = Array.from(grid.querySelectorAll<HTMLElement>('.calendar-date'));
    cells.forEach((cell) => {
      const day = Number(cell.dataset.day);
      if (!day) return;
      const r = cell.getBoundingClientRect();
      centers[day] = {
        x: r.left - containerRect.left + r.width / 2,
        y: r.top - containerRect.top + r.height / 2,
      };
    });

    // Spawn points below the container, X distributed across width
    const tile = getTileSize();
    const pad = 24;
    const width = containerRect.width - pad * 2 - tile;
    const spawn: Vec2[] = eventData.map((_, i) => ({
      x: pad + ((i + 1) * width) / (eventData.length + 1),
      y: containerRect.height + tile + 40,
    }));

    return { containerRect, railY, centers, tile, spawn };
  }, [eventData]);

  // FLIP/WAAPI animation
  const animateOnce = useCallback(() => {
    if (finalizedRef.current || startedRef.current) return;
    const prefReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const m = measure();
    if (!m) return;
    startedRef.current = true;

    const { railY, centers, tile, spawn } = m;

    // Reduced motion: place instantly
    if (prefReduced) {
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const day = Number(eventData[i].date.split(' ')[1]);
        const c = centers[day];
        if (!c) return;
        card.style.opacity = '1';
        card.style.transform = `translate3d(${c.x - tile / 2}px, ${c.y - tile / 2}px, 0)`;
      });
      finalizedRef.current = true;
      containerRef.current?.classList.add('finalized');
      return;
    }

    const animations: Animation[] = [];
    const totalDelay = 60; // ms per item

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const day = Number(eventData[i].date.split(' ')[1]);
      const c = centers[day];
      if (!c) return;
      const spawnT = `translate3d(${spawn[i].x - tile / 2}px, ${spawn[i].y - tile / 2}px, 0)`;
      const railT = `translate3d(${spawn[i].x - tile / 2}px, ${railY - tile / 2}px, 0)`;
      const finalT = `translate3d(${c.x - tile / 2}px, ${c.y - tile / 2}px, 0)`;

      card.style.opacity = '1';
      card.style.willChange = 'transform, opacity';

      const a = card.animate(
        [
          { transform: spawnT, opacity: 0.9 },
          { transform: railT, opacity: 1, offset: 0.55 },
          { transform: finalT, opacity: 1 },
        ],
        {
          duration: 1400,
          easing: EASE,
          delay: i * totalDelay,
          fill: 'forwards',
        }
      );
      animations.push(a);
    });

    // Finalize after animations settle
    Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
      const m2 = measure();
      if (m2) {
        const { centers, tile } = m2;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const day = Number(eventData[i].date.split(' ')[1]);
          const c = centers[day];
          if (!c) return;
          card.getAnimations().forEach((an) => an.cancel());
          card.style.transform = `translate3d(${c.x - tile / 2}px, ${c.y - tile / 2}px, 0)`;
          card.style.opacity = '1';
          card.style.willChange = 'auto';
        });
      }
      finalizedRef.current = true;
      containerRef.current?.classList.add('finalized');
    });
  }, [eventData, measure]);

  // Start when visible or on mount if already visible
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) animateOnce();
        });
      },
      { threshold: 0.1, rootMargin: '120px 0px -10% 0px' }
    );
    io.observe(node);
    // If already visible
    const r = node.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) animateOnce();
    return () => io.disconnect();
  }, [animateOnce]);

  // After finalized, keep placement correct on resize/orientation
  useEffect(() => {
    const onResize = () => {
      if (!finalizedRef.current) return;
      const m = measure();
      if (!m) return;
      const { centers, tile } = m;
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const day = Number(eventData[i].date.split(' ')[1]);
        const c = centers[day];
        if (!c) return;
        card.style.transform = `translate3d(${c.x - tile / 2}px, ${c.y - tile / 2}px, 0)`;
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [measure, eventData]);

  return (
    <section ref={sectionRef} className={`mobile-chaos-to-order ${className}`}>
      <div className="mobile-chaos-container">
        <div className="mobile-chaos-header">
          <h2 className="mobile-chaos-title">From Chaos to Order</h2>
          <p className="mobile-chaos-subtitle">Watch events transform from scattered chaos into your organized calendar</p>
        </div>

        <div ref={containerRef} className="mobile-animation-container">
          <div className="mobile-calendar-grid">
            <div className="calendar-header">
              <div ref={daysBarRef} className="calendar-days">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
            </div>
            <div ref={gridRef} className="calendar-dates">
              {/* Optional staging rail purely for reference/visual continuity */}
              <div className="staging-rail" />
              {Array.from({ length: 42 }, (_, i) => {
                const day = i - firstDayOffset + 1;
                const hasEvent = eventData.some((e) => Number(e.date.split(' ')[1]) === day);
                return (
                  <div key={i} className={`calendar-date ${hasEvent ? 'has-event' : ''}`} data-day={day > 0 && day <= daysInMonth ? day : undefined}>
                    {day > 0 && day <= daysInMonth && (
                      <>
                        <span className="date-number">{day}</span>
                        {hasEvent && <div className="event-dot" />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mobile-event-cards">
            {eventData.map((e, i) => (
              <div
                key={i}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="mobile-event-card mobile-opacity-0"
                role="button"
                aria-label={`${e.company} — ${e.title} on ${e.date}`}
                onClick={() => setSelectedIndex(i)}
              >
                <div className="logo-wrapper" aria-hidden="true">
                  <Image src={logoUrl(e.company)} alt="" width={22} height={22} className="mobile-image-contain" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedIndex !== null && (
          <div className="mobile-event-preview" onClick={() => setSelectedIndex(null)}>
            <div className="preview-card">
              <div className="preview-title">{eventData[selectedIndex].title}</div>
              <div className="preview-meta">{eventData[selectedIndex].company} • {eventData[selectedIndex].date}</div>
              <div className="preview-hint">Tap anywhere to close</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MobileChaosToOrderSection;
