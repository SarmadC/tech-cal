'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GlassSurface from '@/components/GlassSurface';
import Image from 'next/image';

export interface MobileChaosToOrderSectionProps {
  className?: string;
}

type Vec2 = { x: number; y: number };

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

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
  const [isDarkTheme, setIsDarkTheme] = useState(false);

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
  const logoUrl = useCallback((name: string) => {
    const key = name.toLowerCase();
    const slug = Object.keys(COMPANY_SLUG).find((k) => key.includes(k));
    if (SUPABASE_URL && slug) return `${SUPABASE_URL}/storage/v1/object/public/logos/${COMPANY_SLUG[slug]}.svg`;
    const domain = slug ? `${COMPANY_SLUG[slug]}.com` : 'example.com';
    return `https://logo.clearbit.com/${domain}`;
  }, [SUPABASE_URL]);

  const logoSources = useMemo(
    () => eventData.map((e) => logoUrl(e.company)),
    [eventData, logoUrl]
  );

  const getTileSize = () => {
    const el = containerRef.current;
    if (!el) return 32;
    const s = getComputedStyle(el).getPropertyValue('--tile-size');
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n) : 32;
  };

  // Measure important layout points
  const computeMeasurement = useCallback((): Measurement | null => {
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
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const day = eventDays[i];
        const center = measurement.centers[day];
        if (!center) return;
        card.style.opacity = '1';
        card.style.transform = `translate3d(${center.x - measurement.tile / 2}px, ${
          center.y - measurement.tile / 2
        }px, 0)`;
        card.style.willChange = 'auto';
      });
      finalizedRef.current = true;
      containerRef.current?.classList.add('finalized');
    },
    [eventDays]
  );

  // FLIP/WAAPI animation
  const animateOnce = useCallback(() => {
    if (finalizedRef.current || startedRef.current) return;
    const measurement = measure();
    if (!measurement) return;
    startedRef.current = true;

    const { railY, centers, tile, spawn } = measurement;

    if (prefersReducedMotionRef.current) {
      placeCardsInstantly(measurement);
      return;
    }

    const animations: Animation[] = [];
    const totalDelay = 50; // snappier stagger

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const day = eventDays[i];
      const center = centers[day];
      if (!center) return;
      const spawnT = `translate3d(${spawn[i].x - tile / 2}px, ${spawn[i].y - tile / 2}px, 0)`;
      const railT = `translate3d(${spawn[i].x - tile / 2}px, ${railY - tile / 2}px, 0)`;
      const finalT = `translate3d(${center.x - tile / 2}px, ${center.y - tile / 2}px, 0)`;

      card.style.opacity = '1';
      card.style.willChange = 'transform, opacity';

      const a = card.animate(
        [
          { transform: spawnT, opacity: 0.9 },
          { transform: railT, opacity: 1, offset: 0.5 },
          { transform: finalT, opacity: 1 },
        ],
        {
          duration: 1200,
          easing: EASE,
          delay: i * totalDelay,
          fill: 'forwards',
        }
      );
      animations.push(a);
    });

    // Finalize after animations settle
    Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
      const latestMeasurement = measure(true) ?? measurement;
      cardRefs.current.forEach((card) => card?.getAnimations().forEach((an) => an.cancel()));
      if (latestMeasurement) {
        placeCardsInstantly(latestMeasurement);
      }
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

  // Track theme toggles (listen to class changes on <html>)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const update = () => setIsDarkTheme(root.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // After finalized, keep placement correct on resize/orientation
  useEffect(() => {
    const onResize = () => {
      if (!finalizedRef.current) return;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = window.requestAnimationFrame(() => {
        const m = measure(true);
        if (!m) return;
        const { centers, tile } = m;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const day = eventDays[i];
          const c = centers[day];
          if (!c) return;
          card.style.transform = `translate3d(${c.x - tile / 2}px, ${c.y - tile / 2}px, 0)`;
        });
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
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
          <GlassSurface
            className="mobile-calendar-grid"
            width="100%"
            height="100%"
            borderRadius={14}
            brightness={isDarkTheme ? 64 : 58}
            opacity={0.95}
            blur={isDarkTheme ? 14 : 18}
            displace={10}
            backgroundOpacity={isDarkTheme ? 0.16 : 0.42}
            saturation={1.2}
            distortionScale={-220}
            borderWidth={0.08}
            redOffset={4}
            greenOffset={12}
            blueOffset={20}
            mixBlendMode={isDarkTheme ? 'screen' : 'overlay'}
            contentClassName="calendar-surface-content"
            contentStyle={{ padding: 0, display: 'block' }}
          >
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
          </GlassSurface>

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
                  <Image
                    src={logoSources[i]}
                    alt=""
                    width={22}
                    height={22}
                    loading="lazy"
                    sizes="32px"
                    style={{ objectFit: 'contain' }}
                  />
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
