'use client';

import { FC, useState, useCallback, useRef, useEffect } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Event, EventType, AppProfile } from '@/types';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

export interface MobileViewEnhancementsProps {
    currentView: 'today' | 'calendar' | 'month';
    currentDate: Date;
    events: Event[];
    categories: EventType[];
    profile: AppProfile | null;
    onDateChange: (date: Date) => void;
    onEventSelect?: (event: Event) => void;
    className?: string;
}

const MobileViewEnhancements: FC<MobileViewEnhancementsProps> = ({
    currentView,
    currentDate,
    events,
    categories: _categories,
    profile: _profile,
    onDateChange,
    onEventSelect: _onEventSelect,
    className = ''
}) => {
    const [_showQuickActions, _setShowQuickActions] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
    const [lastScrollY, setLastScrollY] = useState(0);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Advanced swipe gestures for view-specific actions
    // Only enable horizontal swipes to prevent interference with vertical scrolling
    const swipeConfig = {
        onSwipeLeft: () => {
            // Navigate to next period
            const newDate = new Date(currentDate);
            if (currentView === 'today') {
                newDate.setDate(newDate.getDate() + 1);
            } else {
                newDate.setDate(newDate.getDate() + 7);
            }
            onDateChange(newDate);
        },
        onSwipeRight: () => {
            // Navigate to previous period
            const newDate = new Date(currentDate);
            if (currentView === 'today') {
                newDate.setDate(newDate.getDate() - 1);
            } else {
                newDate.setDate(newDate.getDate() - 7);
            }
            onDateChange(newDate);
        },
        threshold: 120, // Increased threshold to make swipes less sensitive
        preventScroll: false,
        enableMomentum: false, // Disabled momentum to prevent accidental triggers
    };

    const { swipeHandlers } = useSwipeGestures(swipeConfig);

    // Scroll detection for auto-hiding elements
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (!target) return;
        
        try {
            const currentScrollY = target.scrollTop ?? 0;
            const direction = currentScrollY > lastScrollY ? 'down' : 'up';
            
            setScrollDirection(direction);
            setIsScrolling(true);
            setLastScrollY(currentScrollY);

            // Clear existing timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Set timeout to stop scrolling state
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                setScrollDirection(null);
            }, 150);
        } catch (error) {
            // Element doesn't support scrollTop or was unmounted
            console.warn('[MobileViewEnhancements] Error accessing scrollTop:', error);
        }
    }, [lastScrollY]);

    // Quick actions for today view - simplified for discovery
    const getTodayQuickActions = () => {
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();
        
        return [
            {
                id: 'go-to-today',
                label: isToday ? 'Today' : 'Go to Today',
                icon: 'calendar' as const,
                action: () => onDateChange(today),
                variant: isToday ? 'default' : 'outline' as const
            }
        ];
    };

    // Quick actions for calendar view - simplified
    const getCalendarQuickActions = () => {
        return [
            // Removed Today button to avoid duplication with month view's Today button
        ];
    };

    const _quickActions = currentView === 'today' ? getTodayQuickActions() : getCalendarQuickActions();

    // Event statistics for today view
    const getTodayStats = () => {
        const todayEvents = events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate.toDateString() === currentDate.toDateString();
        });

        return {
            totalEvents: todayEvents.length,
            upcomingEvents: todayEvents.filter(event => new Date(event.startTime) > new Date()).length,
            liveEvents: todayEvents.filter(event => {
                const now = new Date();
                const start = new Date(event.startTime);
                const end = new Date(event.endTime || event.startTime);
                return now >= start && now <= end;
            }).length,
            trackedEvents: todayEvents.filter(event => 'isTracked' in event && event.isTracked).length
        };
    };

    const _todayStats = currentView === 'today' ? getTodayStats() : null;

    return (
        <div 
          className={`mobile-view-enhancements ${className}`}
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchMove={swipeHandlers.onTouchMove}
          onTouchEnd={swipeHandlers.onTouchEnd}
        >
            {/* Scroll Detection Wrapper */}
            <div 
                className="mobile-scroll-container"
                onScroll={handleScroll}
            >


                {/* Calendar View - No header needed since we're already in Month tab */}

                {/* Scroll Indicator */}
                {isScrolling && (
                    <div className="mobile-scroll-indicator">
                        <div className={`mobile-scroll-arrow ${scrollDirection === 'down' ? 'down' : 'up'}`}>
                            <MaterialIcon name="expand-more" size={20} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileViewEnhancements;
