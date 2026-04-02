'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getLogoSourcesForClient } from '@/utils/logoUtils';

export interface MobileChaosToOrderSectionProps {
    className?: string;
}

type Vec2 = { x: number; y: number };

const SNAP_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const VERTICAL_OFFSET = 3; // Offset to move cards slightly lower in calendar slots
const CHIP_SIZE = 28; // Fixed chip size for logo-only design
const LOGO_SIZE = 18;
const FLOAT_RANGE = 4;
const FLOAT_ENTRY_MS = 960;
const FLOAT_LAYOUT = [
    { x: 0.12, y: 0.2, rotate: -8 },
    { x: 0.76, y: 0.34, rotate: 7 },
    { x: 0.2, y: 0.56, rotate: -5 },
    { x: 0.72, y: 0.7, rotate: 9 },
    { x: 0.4, y: 0.14, rotate: -6 },
] as const;

type Measurement = {
    railY: number;
    tile: number;
    centers: Record<number, Vec2>;
    floating: Array<Vec2 & { rotate: number }>;
    spawn: Vec2[];
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
            { company: 'Meta', date: 'May 1', title: 'Meta Con', time: '9:00 AM', color: '#0668E1' },
            { company: 'Google', date: 'May 7', title: 'Google I/O', time: '10:00 AM', color: '#4285F4' },
            { company: 'Docker', date: 'May 11', title: 'DockerCon', time: '11:00 AM', color: '#2496ED' },
            { company: 'Microsoft', date: 'May 13', title: 'Build', time: '9:30 AM', color: '#00A4EF' },
            { company: 'Nvidia', date: 'May 15', title: 'GTC', time: '10:30 AM', color: '#76B900' },
        ],
        []
    );
    const eventDays = useMemo(
        () => eventData.map((e) => Number(e.date.split(' ')[1])),
        [eventData]
    );

    // Calendar metadata for alignment (May 2025)
    const YEAR = 2025;
    const MONTH_INDEX = 4; // May (0-based)
    const firstDayOffset = new Date(YEAR, MONTH_INDEX, 1).getDay();
    const daysInMonth = new Date(YEAR, MONTH_INDEX + 1, 0).getDate();
    const totalWeeks = Math.ceil((firstDayOffset + daysInMonth) / 7);

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

    const handleLogoError = useCallback((company: string) => {
        const sources = logoSourcesMap[company];
        if (!sources) return;

        const currentSrc = activeLogoSources[company] ?? sources[0];
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

        const floatWidth = containerRect.width - pad * 2 - tile;
        const floatTop = railY + tile * 0.5;
        const floatHeight = Math.max(tile * 4, containerRect.height - floatTop - tile * 1.75);
        const floating = eventData.map((_, i) => {
            const layout = FLOAT_LAYOUT[i % FLOAT_LAYOUT.length];
            return {
                x: pad + layout.x * floatWidth,
                y: floatTop + layout.y * floatHeight,
                rotate: layout.rotate,
            };
        });

        return { railY, centers, tile, floating, spawn };
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
                    card.style.transform = `translate3d(${center.x - CHIP_SIZE / 2}px, ${center.y - CHIP_SIZE / 2 + VERTICAL_OFFSET
                        }px, 0)`;
                    card.style.willChange = 'auto';
                });
                finalizedRef.current = true;
                containerRef.current?.classList.remove('is-floating', 'is-locking');
                containerRef.current?.classList.add('is-locked', 'finalized');
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

        const { centers, floating, spawn } = measurement;

        if (prefersReducedMotionRef.current) {
            placeCardsInstantly(measurement);
            return;
        }

        containerRef.current?.classList.remove('is-locking', 'is-locked', 'finalized');
        containerRef.current?.classList.add('is-floating');

        const entryAnimations: Animation[] = [];
        const totalDelay = 50;
        const lockStart = Math.round(FLOAT_ENTRY_MS * 0.62);

        cardRefs.current.forEach((card, i) => {
            if (!card) return;
            const day = eventDays[i];
            const center = centers[day];
            if (!center) return;
            const spawnT = `translate3d(${spawn[i].x - CHIP_SIZE / 2}px, ${spawn[i].y - CHIP_SIZE / 2}px, 0)`;
            const floatPoint = floating[i];
            const floatT = `translate3d(${floatPoint.x - CHIP_SIZE / 2}px, ${floatPoint.y - CHIP_SIZE / 2}px, 0) rotate(${floatPoint.rotate}deg)`;
            const floatUpT = `${floatT} translate3d(0, -${FLOAT_RANGE}px, 0)`;
            const floatDownT = `${floatT} translate3d(0, ${FLOAT_RANGE}px, 0)`;
            const finalT = `translate3d(${center.x - CHIP_SIZE / 2}px, ${center.y - CHIP_SIZE / 2 + VERTICAL_OFFSET}px, 0)`;

            // Force GPU layer creation
            card.style.opacity = '1';
            card.style.willChange = 'transform';
            card.style.transform = spawnT;

            const a = card.animate(
                [
                    { transform: spawnT, opacity: 0 },
                    { transform: floatT, opacity: 1, offset: 0.38 },
                    { transform: floatUpT, opacity: 1, offset: 0.52 },
                    { transform: floatDownT, opacity: 1, offset: 0.68 },
                    { transform: finalT, opacity: 1, offset: 1 },
                ],
                {
                    duration: FLOAT_ENTRY_MS,
                    easing: SNAP_EASE,
                    delay: i * totalDelay,
                    fill: 'forwards',
                }
            );
            entryAnimations.push(a);
        });

        window.setTimeout(() => {
            containerRef.current?.classList.remove('is-floating');
            containerRef.current?.classList.add('is-locking');
        }, lockStart);

        Promise.all(entryAnimations.map((a) => a.finished.catch(() => undefined))).then(() => {
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
            { threshold: 0.3, rootMargin: '0px 0px -20% 0px' }
        );
        io.observe(node);
        // If already visible - require ≥30% visibility to trigger
        const r = node.getBoundingClientRect();
        const visibleHeight = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        const visibilityRatio = visibleHeight / r.height;
        if (visibilityRatio >= 0.3 && r.top < window.innerHeight && r.bottom > 0) animateOnce();
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
        let resizeTimeout: ReturnType<typeof setTimeout>;

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
                    const { centers } = m;

                    // Batch all transform updates
                    cardRefs.current.forEach((card, i) => {
                        if (!card) return;
                        const day = eventDays[i];
                        const c = centers[day];
                        if (!c) return;
                        card.style.transform = `translate3d(${c.x - CHIP_SIZE / 2}px, ${c.y - CHIP_SIZE / 2 + VERTICAL_OFFSET}px, 0)`;
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
                    <h2 className="mobile-chaos-title">Turn Noise Into a Schedule</h2>
                </div>

                <div ref={containerRef} className="mobile-animation-container">
                    {/* Premium Calendar Container */}
                    <div className="mobile-calendar-grid calendar-chassis">
                        {/* Month Header with Navigation */}
                        <div className="calendar-month-header">
                            <span className="calendar-month-label">May 2025</span>
                        </div>
                        {/* Weekday Headers */}
                        <div className="calendar-header">
                            <div ref={daysBarRef} className="calendar-days">
                                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                            </div>
                        </div>
                        <div
                            ref={gridRef}
                            className="calendar-dates"
                            style={{ gridTemplateRows: `repeat(${totalWeeks}, 1fr)` }}
                        >
                            {/* Optional staging rail purely for reference/visual continuity */}
                            <div className="staging-rail" />
                            {Array.from({ length: daysInMonth }, (_, index) => {
                                const day = index + 1;
                                const hasEvent = eventDays.includes(day);
                                const weekdayIndex = (firstDayOffset + index) % 7;
                                const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;

                                return (
                                    <div
                                        key={day}
                                        className={`calendar-date in-month ${hasEvent ? 'has-event' : ''} ${isWeekend ? 'weekend' : ''}`}
                                        data-day={day}
                                        style={day === 1 ? { gridColumnStart: firstDayOffset + 1 } : undefined}
                                    >
                                        {!hasEvent && (
                                            <span className="date-number">{day}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mobile-event-cards">
                        {eventData.map((e, i) => {
                            const currentLogoSrc = activeLogoSources[e.company] ?? logoSourcesMap[e.company]?.[0];

                            return (
                                <div
                                    key={i}
                                    ref={(el) => { cardRefs.current[i] = el; }}
                                    className="mobile-event-card logo-chip"
                                    role="button"
                                    aria-label={`${e.company} — ${e.title} on ${e.date}`}
                                    onClick={() => setSelectedIndex(i)}
                                    style={{
                                        opacity: 0,
                                        '--company-color': e.color
                                    } as React.CSSProperties}
                                >
                                    <div className="chip-logo">
                                        {currentLogoSrc ? (
                                            <Image
                                                src={currentLogoSrc}
                                                alt=""
                                                width={LOGO_SIZE}
                                                height={LOGO_SIZE}
                                                loading="lazy"
                                                sizes="20px"
                                                style={{ objectFit: 'contain' }}
                                                onError={() => handleLogoError(e.company)}
                                            />
                                        ) : (
                                            <span className="logo-fallback">
                                                {e.company.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
