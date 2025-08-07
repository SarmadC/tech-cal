'use client';

import { useEffect, useRef, useMemo } from 'react';
import { AnimatedEventCard } from './AnimatedEventCard';
import { useThreeScene, useCardPositions, useScrollAnimation, DomCache } from './useChaosAnimation';
import '@/app/styles/ChaosToOrder.css';

// Debounce helper function
function debounce<F extends (...args: unknown[]) => unknown>(func: F, wait: number): (...args: Parameters<F>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(...args: Parameters<F>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const animationEventsData = [
    { company: 'Meta', date: 'May 1', title: 'React Conf', type: 'Framework Conference' },
    { company: 'OpenAI', date: 'May 4', title: 'OpenAI DevDay', type: 'AI Conference' },
    { company: 'Google', date: 'May 7', title: 'Google I/O 2025', type: 'Conference' },
    { company: 'Apple', date: 'May 11', title: 'WWDC 2025', type: 'Developer Conference' },
    { company: 'Microsoft', date: 'May 13', title: 'Microsoft Build', type: 'Developer Conference' },
    { company: 'GitHub', date: 'May 15', title: 'GitHub Universe', type: 'Developer Conference' },
    { company: 'Docker', date: 'May 19', title: 'DockerCon', type: 'DevOps Conference' },
    { company: 'Vercel', date: 'May 21', title: 'Next.js Conf', type: 'Framework Conference' },
    { company: 'Amazon', date: 'May 30', title: 'AWS re:Invent', type: 'Cloud Conference' }
];

export function ChaosToOrderSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollProgressRef = useRef(0);
    const domCacheRef = useRef<DomCache>({
        cards: null, chaosTitle: null, chaosSubtitle: null, orderTitle: null, orderSubtitle: null
    });

    // --- HOOKS ---
    const [cardPositions, calculateCardPositions] = useCardPositions(animationEventsData);
    useThreeScene(canvasRef, scrollProgressRef);
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
        domCacheRef.current = {
            cards: container.querySelectorAll<HTMLElement>('.event-card-animated'),
            chaosTitle: section.querySelector<HTMLElement>('.chaos-title'),
            chaosSubtitle: section.querySelector<HTMLElement>('.chaos-subtitle'),
            orderTitle: section.querySelector<HTMLElement>('.order-title'),
            orderSubtitle: section.querySelector<HTMLElement>('.order-subtitle'),
        };

        // 2. Set up a debounced resize handler for position recalculations
        const handleResize = () => {
            calculateCardPositions(container);

            // Reposition the absolutely positioned calendar frame after calculation
            const frame = container.querySelector<HTMLElement>('.calendar-frame');
            if (frame && container.dataset.calendarStartX) {
                frame.style.left = `${container.dataset.calendarStartX}px`;
                frame.style.top = `${container.dataset.calendarStartY}px`;
                frame.style.width = `${container.dataset.calendarWidth}px`;
                frame.style.height = `${container.dataset.calendarHeight}px`;
            }
        };
        const debouncedResizeHandler = debounce(handleResize, 150);
        window.addEventListener('resize', debouncedResizeHandler);

        // 3. Run the initial calculation
        handleResize();

        // 4. Stagger the initial card visibility for a nice fade-in effect
        domCacheRef.current.cards?.forEach((card: HTMLElement, i: number) => {
            setTimeout(() => card.classList.add('visible'), i * 50);
        });

        // Cleanup function
        return () => {
            window.removeEventListener('resize', debouncedResizeHandler);
        };
    }, [calculateCardPositions]);

    // --- RENDER ---
    return (
        <section ref={sectionRef} className="chaos-section">
            <div className="sticky-container">
                <canvas ref={canvasRef} className="three-canvas" />

                <div ref={containerRef} className="cards-container">
                    <div className="calendar-frame clean-calendar" style={{ opacity: 0 }}>
                        <div className="calendar-header">
                            <h3 className="calendar-month">May 2025</h3>
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
                        <p>Your personalized tech calendar</p>
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
                        <p className="order-subtitle">Every event organized. Color-coded. Never miss what matters.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}