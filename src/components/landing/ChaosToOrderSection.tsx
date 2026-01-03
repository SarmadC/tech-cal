'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { AnimatedEventCard } from './AnimatedEventCard';
// Duplicate import removed

import { useCardPositions, useScrollAnimation, DomCache } from './useChaosAnimation';
import { debounce } from '@/utils/debounce';
import '@/app/styles/ChaosToOrder.css';
import dynamic from 'next/dynamic';

const ChaosCanvas = dynamic(() => import('./ChaosCanvas'), { ssr: false });

const animationEventsData = [
    { company: 'Meta', date: 'May 1', title: 'Meta Con', type: 'Framework Conference' },
    { company: 'OpenAI', date: 'May 4', title: 'OpenAI DevDay', type: 'AI Conference' },
    { company: 'Google', date: 'May 7', title: 'Google I/O 2025', type: 'Conference' },
    { company: 'Apple', date: 'May 11', title: 'WWDC 2025', type: 'Developer Conference' },
    { company: 'Microsoft', date: 'May 13', title: 'Microsoft Build', type: 'Developer Conference' },
    { company: 'GitHub', date: 'May 15', title: 'GitHub Universe', type: 'Developer Conference' },
    { company: 'Docker', date: 'May 19', title: 'DockerCon', type: 'DevOps Conference' },
    { company: 'NVIDIA', date: 'May 21', title: 'GTC 2025', type: 'AI Conference' },
    { company: 'Amazon', date: 'May 30', title: 'AWS re:Invent', type: 'Cloud Conference' }
];

export function ChaosToOrderSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // canvasRef moved to ChaosCanvas
    const scrollProgressRef = useRef(0);
    const { isMobile, isTablet } = useDeviceDetection();
    const domCacheRef = useRef<DomCache>({
        cards: null, chaosTitle: null, chaosSubtitle: null, orderTitle: null, orderSubtitle: null
    });

    // --- HOOKS ---
    const [cardPositions, calculateCardPositions] = useCardPositions(animationEventsData);

    // Always call hooks in the same order - hooks handle mobile detection internally
    // useThreeScene moved to ChaosCanvas
    useScrollAnimation(sectionRef, containerRef, domCacheRef, cardPositions, scrollProgressRef);

    // --- MEMOIZED CALCULATIONS ---
    const eventDays = useMemo(() =>
        animationEventsData.reduce((acc, event) => {
            const day = parseInt(event.date.split(' ')[1]);
            if (!acc[day]) acc[day] = [];
            acc[day].push(event.company);
            return acc;
        }, {} as { [key: number]: string[] })
        , []); // Runs only once

    const calendarCells = useMemo(() => {
        const cells = [];
        const firstDayOffset = 4;
        const daysInMonth = 31;
        for (let i = 0; i < 35; i++) {
            const dayNumber = i - firstDayOffset + 1;
            const isDayInMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const hasEvents = eventDays && eventDays[dayNumber];
            cells.push(
                <div key={`cell-${i}`} className={`calendar-cell ${hasEvents ? 'has-event' : ''}`}>
                    {isDayInMonth && <span className="day-number">{dayNumber}</span>}
                </div>
            );
        }
        return cells;
    }, [eventDays]); // Runs only when eventDays changes (which is once)

    // --- EFFECTS ---
    // This consolidated effect handles all initial setup and resizing.
    useEffect(() => {
        const container = containerRef.current;
        const section = sectionRef.current;
        if (!container || !section) return;

        // 1. Cache all DOM nodes
        const cards = container.querySelectorAll<HTMLElement>('.event-card-animated');
        console.log('DOM caching - found cards:', cards.length);

        domCacheRef.current = {
            cards,
            chaosTitle: section.querySelector<HTMLElement>('.chaos-title'),
            chaosSubtitle: section.querySelector<HTMLElement>('.chaos-subtitle'),
            orderTitle: section.querySelector<HTMLElement>('.order-title'),
            orderSubtitle: section.querySelector<HTMLElement>('.order-subtitle'),
        };

        // 2. Set up a debounced resize handler for position recalculations
        let resizeTimeoutId: NodeJS.Timeout;
        const cardTimeoutIds: NodeJS.Timeout[] = [];

        const handleResize = () => {
            // Clear any existing timeout
            if (resizeTimeoutId) {
                clearTimeout(resizeTimeoutId);
            }
            // Use a small timeout to ensure the calendar DOM is ready
            resizeTimeoutId = setTimeout(() => {
                calculateCardPositions(container);
            }, 50);
        };
        const debouncedResizeHandler = debounce(handleResize, 150);
        window.addEventListener('resize', debouncedResizeHandler);

        // 3. Make calendar frame visible first, then calculate positions
        const calendarFrame = container.querySelector('.calendar-frame') as HTMLElement;
        if (calendarFrame) {
            calendarFrame.style.opacity = '1';
        }

        // 4. Run the initial calculation with a small delay to ensure DOM is ready
        const initialTimeoutId = setTimeout(() => {
            handleResize();

            // 5. Stagger the initial card visibility for a nice fade-in effect
            domCacheRef.current.cards?.forEach((card: HTMLElement, i: number) => {
                const cardTimeoutId = setTimeout(() => card.classList.add('visible'), i * 50);
                cardTimeoutIds.push(cardTimeoutId);
            });
        }, 100);

        // Cleanup function
        return () => {
            window.removeEventListener('resize', debouncedResizeHandler);
            if (resizeTimeoutId) {
                clearTimeout(resizeTimeoutId);
            }
            if (initialTimeoutId) {
                clearTimeout(initialTimeoutId);
            }
            // Clear all card animation timeouts
            cardTimeoutIds.forEach(timeoutId => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            });
        };
    }, [calculateCardPositions]);

    // --- RENDER ---
    return (
        <section ref={sectionRef} className={`chaos-section ${isMobile ? 'mobile-optimized' : ''}`}>
            <div className="sticky-container">
                {/* Only render Three.js canvas on desktop for better mobile performance */}
                {!isMobile && !isTablet && (
                    <ChaosCanvas scrollProgressRef={scrollProgressRef} className="three-canvas" />
                )}

                <div ref={containerRef} className={`cards-container ${isMobile ? 'mobile-optimized' : ''}`}>
                    <div className="calendar-frame clean-calendar">
                        <div className="calendar-header">
                            <div className="calendar-days">
                                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span>
                                <span>THU</span><span>FRI</span><span>SAT</span>
                            </div>
                        </div>
                        <div className="calendar-grid">
                            {calendarCells}
                        </div>
                    </div>

                    <div className="event-list-label" style={{ opacity: 0 }}>
                        <h3>Upcoming Events</h3>
                        <p>Your personalized Kure calendar</p>
                    </div>

                    {animationEventsData.map((event, index) => (
                        <AnimatedEventCard key={index} event={event} index={index} />
                    ))}
                </div>

                <div className="text-overlay-container">
                    <div className="chaos-text-wrapper">
                        <h2 className="chaos-title">The Problem: Information Chaos</h2>
                        <p className="chaos-subtitle">Events scattered across Twitter, Discord, Email, Slack...</p>
                    </div>
                    <div className="order-text-wrapper">
                        <h2 className="order-title">The Solution: Organized Calendar</h2>
                        <p className="order-subtitle">Smart organization with color-coded events. Stay focused on what drives your career forward.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}