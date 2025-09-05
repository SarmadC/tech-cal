'use client';

import { FC, ReactNode, useState, useEffect, useRef } from 'react';

export interface CalendarTransitionWrapperProps {
    children: ReactNode;
    view: string;
    date: Date;
    className?: string;
}

const CalendarTransitionWrapper: FC<CalendarTransitionWrapperProps> = ({
    children,
    view,
    date,
    className = ''
}) => {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [direction, setDirection] = useState<'prev' | 'next' | null>(null);
    const [currentView, setCurrentView] = useState(view);
    const [currentDate, setCurrentDate] = useState(date);
    const prevViewRef = useRef(view);
    const prevDateRef = useRef(date);

    useEffect(() => {
        const viewChanged = prevViewRef.current !== view;
        const dateChanged = prevDateRef.current.getTime() !== date.getTime();
        
        if (viewChanged || dateChanged) {
            // Determine transition direction based on date change
            if (dateChanged) {
                const timeDiff = date.getTime() - prevDateRef.current.getTime();
                setDirection(timeDiff > 0 ? 'next' : 'prev');
            } else {
                setDirection(null);
            }

            setIsTransitioning(true);
            
            // Update state after a brief delay to allow transition
            setTimeout(() => {
                setCurrentView(view);
                setCurrentDate(date);
                setIsTransitioning(false);
                setDirection(null);
            }, 150);
        }

        prevViewRef.current = view;
        prevDateRef.current = date;
    }, [view, date]);

    const getTransitionClass = () => {
        if (!isTransitioning) return '';
        
        const baseClass = 'calendar-transition';
        const directionClass = direction ? `slide-${direction}` : '';
        const transitioningClass = isTransitioning ? 'transitioning' : '';
        
        return [baseClass, directionClass, transitioningClass].filter(Boolean).join(' ');
    };

    return (
        <div className={`calendar-transition-container ${getTransitionClass()} ${className}`}>
            {children}
        </div>
    );
};

export default CalendarTransitionWrapper;
