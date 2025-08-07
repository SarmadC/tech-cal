'use client';

import { useEffect, useRef } from 'react';
import { AnimatedEventCard } from './AnimatedEventCard';
import { useThreeScene, useCardPositions, useScrollAnimation, DomCache } from './useChaosAnimation';
import '@/app/styles/ChaosToOrder.css';

// Updated event data with specific dates
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

const renderCalendarCells = (eventDays: { [key: number]: string[] } | null) => {
    const cells = [];
    const firstDayOffset = 4; // May 1st, 2025 is a Thursday
    const daysInMonth = 31;

    for (let i = 0; i < 35; i++) {
        const dayNumber = i - firstDayOffset + 1;
        const isDayInMonth = dayNumber > 0 && dayNumber <= daysInMonth;
        const hasEvents = eventDays && eventDays[dayNumber];
        
        cells.push(
            <div key={`cell-${i}`} className={`calendar-cell ${hasEvents ? 'has-event' : ''}`}>
                {isDayInMonth && (
                    <>
                        <span className="day-number">{dayNumber}</span>
                        {hasEvents && (
                            <div className="event-indicators">
                                {hasEvents.map((company, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`event-dot company-${company.toLowerCase().replace(/\s+/g, '-')}`}
                                        title={company}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }
    return cells;
};

export function ChaosToOrderSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollProgressRef = useRef(0);
    const domCacheRef = useRef<DomCache>({
        cards: null, chaosTitle: null, chaosSubtitle: null, orderTitle: null, orderSubtitle: null
    });

    const [cardPositions, calculateCardPositions] = useCardPositions(animationEventsData);
    useThreeScene(canvasRef, scrollProgressRef);
    useScrollAnimation(sectionRef, containerRef, domCacheRef, cardPositions, scrollProgressRef);
    
    useEffect(() => {
        if (!containerRef.current || !sectionRef.current) return;

        // Cache DOM elements
        domCacheRef.current.cards = containerRef.current.querySelectorAll<HTMLElement>('.event-card-animated');
        domCacheRef.current.chaosTitle = sectionRef.current.querySelector<HTMLElement>('.chaos-title');
        domCacheRef.current.chaosSubtitle = sectionRef.current.querySelector<HTMLElement>('.chaos-subtitle');
        domCacheRef.current.orderTitle = sectionRef.current.querySelector<HTMLElement>('.order-title');
        domCacheRef.current.orderSubtitle = sectionRef.current.querySelector<HTMLElement>('.order-subtitle');

        calculateCardPositions(containerRef.current);
        
        // Initial card visibility
        domCacheRef.current.cards?.forEach((card: HTMLElement, i: number) => {
            setTimeout(() => card.classList.add('visible'), i * 50);
        });
    }, [calculateCardPositions]);

    // Parse event days for calendar indicators
    const eventDays = animationEventsData.reduce((acc, event) => {
        const day = parseInt(event.date.split(' ')[1]);
        if (!acc[day]) acc[day] = [];
        acc[day].push(event.company);
        return acc;
    }, {} as { [key: number]: string[] });

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !container.dataset.calendarStartX) return;

        const calendarFrame = container.querySelector<HTMLElement>('.calendar-frame');
        if (calendarFrame) {
            calendarFrame.style.left = `${container.dataset.calendarStartX}px`;
            calendarFrame.style.top = `${container.dataset.calendarStartY}px`;
            calendarFrame.style.width = `${container.dataset.calendarWidth}px`;
            calendarFrame.style.height = `${container.dataset.calendarHeight}px`;
        }
        
        // Position the event list label
        const eventListLabel = container.querySelector<HTMLElement>('.event-list-label');
        if (eventListLabel && container.dataset.listLabelX && container.dataset.listLabelY) {
            eventListLabel.style.left = `${container.dataset.listLabelX}px`;
            eventListLabel.style.top = `${container.dataset.listLabelY}px`;
        }
    }, [cardPositions]);

    return (
        <section ref={sectionRef} className="chaos-section">
            <div className="sticky-container">
                <canvas ref={canvasRef} className="three-canvas" />
                
                <div ref={containerRef} className="cards-container">
                    {/* Clean calendar with event indicators */}
                    <div className="calendar-frame clean-calendar" style={{ opacity: 0 }}>
                        <div className="calendar-header">
                            <h3 className="calendar-month">May 2025</h3>
                            <div className="calendar-days">
                                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span>
                                <span>THU</span><span>FRI</span><span>SAT</span>
                            </div>
                        </div>
                        <div className="calendar-grid">
                            {renderCalendarCells(eventDays)}
                        </div>
                    </div>
                    
                    {/* Event list label (appears with organized cards) */}
                    <div className="event-list-label" style={{ opacity: 0 }}>
                        <h3>Upcoming Events</h3>
                        <p>Your personalized tech calendar</p>
                    </div>
                    
                    {/* Event cards */}
                    {animationEventsData.map((event, index) => (
                        <AnimatedEventCard key={index} event={event} index={index} />
                    ))}
                </div>
                
                {/* Text overlays */}
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