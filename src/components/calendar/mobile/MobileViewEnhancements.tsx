'use client';

import { FC, useState, useCallback, useRef } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Event, EventType, AppProfile } from '@/types';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

export interface MobileViewEnhancementsProps {
    currentView: 'today' | 'calendar';
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

    // Advanced swipe gestures for view-specific actions
    const swipeConfig = {
        onSwipeUp: () => {
            if (currentView === 'today') {
                // Swipe up to go to calendar view
                // This could be handled by parent component
            }
        },
        onSwipeDown: () => {
            if (currentView === 'calendar') {
                // Swipe down to go to today view
                // This could be handled by parent component
            }
        },
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
        threshold: 50,
        preventScroll: false,
        enableMomentum: true,
    };

    const { swipeHandlers } = useSwipeGestures(swipeConfig);

    // Scroll detection for auto-hiding elements
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
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
            {
                id: 'go-to-today',
                label: 'Today',
                icon: 'calendar' as const,
                action: () => onDateChange(new Date()),
                variant: 'outline' as const
            }
        ];
    };

    const quickActions = currentView === 'today' ? getTodayQuickActions() : getCalendarQuickActions();

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
        <div className={`mobile-view-enhancements ${className}`} {...swipeHandlers}>
            {/* Scroll Detection Wrapper */}
            <div 
                className="mobile-scroll-container"
                onScroll={handleScroll}
            >
                {/* Quick Actions Bar - Only for Calendar view */}
                {currentView === 'calendar' && (
                    <div className={`mobile-quick-actions ${isScrolling && scrollDirection === 'down' ? 'hidden' : ''}`}>
                        <div className="mobile-quick-actions-content">
                            {quickActions.map((action) => (
                                <Button
                                    key={action.id}
                                    onClick={action.action}
                                    variant={action.variant as "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"}
                                    size="sm"
                                    className="mobile-quick-action-button"
                                >
                                    <MaterialIcon name={action.icon} size={16} />
                                    <span className="mobile-quick-action-label">{action.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Today View - Clean Discovery Interface */}
                {currentView === 'today' && (
                    <div className="mobile-discovery-header">
                        <h2 className="mobile-discovery-title">Discover Events</h2>
                        <p className="mobile-discovery-subtitle">Find your next tech event</p>
                    </div>
                )}

                {/* Week View - Clean Calendar Interface */}
                {currentView === 'calendar' && (
                    <div className="mobile-week-header">
                        <h2 className="mobile-week-title">Week View</h2>
                        <p className="mobile-week-subtitle">View events by week</p>
                    </div>
                )}

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
