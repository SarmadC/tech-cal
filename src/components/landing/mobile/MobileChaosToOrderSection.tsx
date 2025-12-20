'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getLogoSourcesForClient } from '@/utils/logoUtils';

export interface MobileChaosToOrderSectionProps {
  className?: string;
}

type Vec2 = { x: number; y: number };

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const VERTICAL_OFFSET = 3; // Offset to move cards slightly lower in calendar slots

type Measurement = {
  railY: number;
  tile: number;
  centers: Record<number, Vec2>;
  spawn: Vec2[];
};

const COMPANY_SLUG: Record<string, string> = {
  meta: 'meta',
  google: 'google',
  apple: 'apple',
  microsoft: 'microsoft',
  github: 'github',
  nvidia: 'nvidia',
  openai: 'openai',
  vercel: 'vercel',
  amazon: 'amazon',
  docker: 'docker'
};

const MobileChaosToOrderSection: React.FC<MobileChaosToOrderSectionProps> = ({ className = '' }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const daysBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const measurementRef = useRef<Measurement | null>(null);
  const rafRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);

  const startedRef = useRef(false);
  const finalizedRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const eventData = useMemo(
    () => [
      { company: 'Meta', date: 'May 1', title: 'Meta Con' },
      { company: 'Google', date: 'May 7', title: 'Google I/O' },
      { company: 'Docker', date: 'May 11', title: 'DockerCon' },
      { company: 'Microsoft', date: 'May 13', title: 'Build' },
      { company: 'Nvidia', date: 'May 15', title: 'GTC' },
    ],
    []
  );
  const eventDays = useMemo(
    () => eventData.map((e) => Number(e.date.split(' ')[1])),
    [eventData]
  );

  // Calendar metadata for alignment (May 2024)
  const YEAR = 2024;
  const MONTH_INDEX = 4; // May (0-based)
  const firstDayOffset = new Date(YEAR, MONTH_INDEX, 1).getDay();
  const daysInMonth = new Date(YEAR, MONTH_INDEX + 1, 0).getDate();

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  // Get logo sources for each company with fallback chain
  const logoSourcesMap = useMemo(
    () => eventData.reduce((acc, e) => {
      acc[e.company] = getLogoSourcesForClient(e.company, SUPABASE_URL);
      return acc;
    }, {} as Record<string, string[]>),
    [eventData, SUPABASE_URL]
  );

  // Track active logo source for each company (for error handling)
  const [activeLogoSources, setActiveLogoSources] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    eventData.forEach((e) => {
      const sources = logoSourcesMap[e.company];
      if (sources && sources.length > 0) {
        initial[e.company] = sources[0];
      }
    });
    return initial;
  });

  useEffect(() => {
    const updated: Record<string, string> = {};
    eventData.forEach((e) => {
      const sources = logoSourcesMap[e.company];
      if (sources && sources.length > 0) {
        updated[e.company] = sources[0];
      }
    });
    setActiveLogoSources(updated);
  }, [eventData, logoSourcesMap]);

  const handleLogoError = useCallback((company: string) => {
    const sources = logoSourcesMap[company];
    if (!sources) return;
    
    const currentSrc = activeLogoSources[company];
    const currentIndex = currentSrc ? sources.indexOf(currentSrc) : -1;
    const nextSrc = currentIndex >= 0 && currentIndex < sources.length - 1 
      ? sources[currentIndex + 1] 
      : undefined;
    
    if (nextSrc) {
      setActiveLogoSources((prev) => ({
        ...prev,
        [company]: nextSrc,
      }));
    }
  }, [activeLogoSources, logoSourcesMap]);

  const getTileSize = () => {
    const el = containerRef.current;
    if (!el) return 32;
    const s = getComputedStyle(el).getPropertyValue('--tile-size');
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : 32;
  };

  // Optimized measurement with reduced DOM queries
  const computeMeasurement = useCallback((): Measurement | null => {
    const container = containerRef.current;
    const bar = daysBarRef.current;
    const grid = gridRef.current;
    if (!container || !bar || !grid) return null;

    // Batch all reads together to avoid layout thrashing
    const containerRect = container.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const railY = Math.max(0, barRect.bottom - containerRect.top + 10);

    const centers: Record<number, Vec2> = {};
    const cells = Array.from(grid.querySelectorAll<HTMLElement>('.calendar-date'));

    // Batch all getBoundingClientRect calls
    const cellData = cells.map((cell) => ({
      day: Number(cell.dataset.day),
      rect: cell.getBoundingClientRect()
    }));

    // Calculate centers from batched data
    cellData.forEach(({ day, rect }) => {
      if (!day) return;
      centers[day] = {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      };
    });

    // Spawn points below the container
    const tile = getTileSize();
    const pad = 24;
    const width = containerRect.width - pad * 2 - tile;
    const spawn: Vec2[] = eventData.map((_, i) => ({
      x: pad + ((i + 1) * width) / (eventData.length + 1),
      y: containerRect.height + tile + 40,
    }));

    return { railY, centers, tile, spawn };
  }, [eventData]);

  const measure = useCallback(
    (force = false): Measurement | null => {
      if (!force && measurementRef.current) return measurementRef.current;
      const measurement = computeMeasurement();
      if (measurement) {
        measurementRef.current = measurement;
      }
      return measurement;
    },
    [computeMeasurement]
  );

  const placeCardsInstantly = useCallback(
    (measurement: Measurement) => {
      // Batch all DOM writes together
      requestAnimationFrame(() => {
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const day = eventDays[i];
          const center = measurement.centers[day];
          if (!center) return;
          card.style.opacity = '1';
          card.style.transform = `translate3d(${center.x - measurement.tile / 2}px, ${
            center.y - measurement.tile / 2 + VERTICAL_OFFSET
          }px, 0)`;
          card.style.willChange = 'auto';
        });
        finalizedRef.current = true;
        containerRef.current?.classList.add('finalized');
      });
    },
    [eventDays]
  );

  // Optimized WAAPI animation with GPU acceleration
  const animateOnce = useCallback(() => {
    if (finalizedRef.current || startedRef.current) return;
    const measurement = measure();
    if (!measurement) return;
    startedRef.current = true;

    const { centers, tile, spawn } = measurement;

    if (prefersReducedMotionRef.current) {
      placeCardsInstantly(measurement);
      return;
    }

    const animations: Animation[] = [];
    const totalDelay = 40; // Faster stagger for mobile

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const day = eventDays[i];
      const center = centers[day];
      if (!center) return;

      const spawnT = `translate3d(${spawn[i].x - tile / 2}px, ${spawn[i].y - tile / 2}px, 0)`;
      const finalT = `translate3d(${center.x - tile / 2}px, ${center.y - tile / 2 + VERTICAL_OFFSET}px, 0)`;

      // Force GPU layer creation
      card.style.opacity = '1';
      card.style.willChange = 'transform';
      card.style.transform = 'translateZ(0)';

      // Simplified 2-keyframe animation for better performance
      const a = card.animate(
        [
          { transform: spawnT, opacity: 0.9 },
          { transform: finalT, opacity: 1 },
        ],
        {
          duration: 700, // Reduced from 1200ms for snappier mobile performance
          easing: EASE,
          delay: i * totalDelay,
          fill: 'forwards',
        }
      );
      animations.push(a);
    });

    // Finalize after animations settle
    Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
      requestAnimationFrame(() => {
        const latestMeasurement = measure(true) ?? measurement;
        cardRefs.current.forEach((card) => card?.getAnimations().forEach((an) => an.cancel()));
        if (latestMeasurement) {
          placeCardsInstantly(latestMeasurement);
        }
      });
    });
  }, [eventDays, measure, placeCardsInstantly]);

  // Start when visible or on mount if already visible
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (prefersReducedMotion) {
      requestAnimationFrame(() => {
        const measurement = measure();
        if (measurement) {
          placeCardsInstantly(measurement);
        }
      });
      return;
    }
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
  }, [animateOnce, measure, placeCardsInstantly, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      prefersReducedMotionRef.current = mq.matches;
      setPrefersReducedMotion(mq.matches);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Optimized resize handler with debouncing
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const onResize = () => {
      if (!finalizedRef.current) return;

      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = window.requestAnimationFrame(() => {
          const m = measure(true);
          if (!m) return;
          const { centers, tile } = m;

          // Batch all transform updates
          cardRefs.current.forEach((card, i) => {
            if (!card) return;
            const day = eventDays[i];
            const c = centers[day];
            if (!c) return;
            card.style.transform = `translate3d(${c.x - tile / 2}px, ${c.y - tile / 2 + VERTICAL_OFFSET}px, 0)`;
          });
        });
      }, 150); // Debounce 150ms
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [eventDays, measure]);

  useEffect(() => {
    const cardsSnapshot = [...cardRefs.current];
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      cardsSnapshot.forEach((card) => {
        card?.getAnimations().forEach((animation) => animation.cancel());
      });
    };
  }, []);

  return (
    <section ref={sectionRef} className={`mobile-chaos-to-order ${className}`}>
      <div className="mobile-chaos-container">
        <div className="mobile-chaos-header">
          <h2 className="mobile-chaos-title">From Chaos to Order</h2>
          <p className="mobile-chaos-subtitle">Watch events transform from scattered chaos into your organized calendar</p>
        </div>

        <div ref={containerRef} className="mobile-animation-container">
          {/* Lightweight frosted glass replacement - theme adaptive */}
          <div className="mobile-calendar-grid frosted-calendar">
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
                className="mobile-event-card"
                role="button"
                aria-label={`${e.company} — ${e.title} on ${e.date}`}
                onClick={() => setSelectedIndex(i)}
                style={{ opacity: 0 }}
              >
                <div className="logo-wrapper" aria-hidden="true">
                  {activeLogoSources[e.company] ? (
                    <Image
                      src={activeLogoSources[e.company]}
                      alt=""
                      width={22}
                      height={22}
                      loading="lazy"
                      sizes="32px"
                      style={{ objectFit: 'contain' }}
                      onError={() => handleLogoError(e.company)}
                    />
                  ) : (
                    <div className="logo-placeholder" style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      {e.company.charAt(0)}
                    </div>
                  )}
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
