// src/hooks/useSmartFilters.ts
import { useState, useMemo, useCallback } from 'react';
import { AppEvent, AppProfile } from '@/types';

// Define calendar event type for conflict detection
interface CalendarEvent {
    start: string | Date;
    end: string | Date;
    title?: string;
}

export interface SmartFilterOptions {
    // Existing filters
    categories: string[];
    searchTerm: string;
    dateRange: {
        start: Date | null;
        end: Date | null;
    };

    // New smart filters
    format: 'all' | 'virtual' | 'in-person' | 'hybrid';
    cost: 'all' | 'free' | 'paid';
    difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
    timePreference: 'all' | 'work-hours' | 'after-hours' | 'weekends';
    availability: 'all' | 'available' | 'no-conflicts';
    popularity: 'all' | 'trending' | 'high-attendance' | 'niche';
    duration: 'all' | 'short' | 'medium' | 'long' | 'multi-day';

    // Personalized filters
    myTracked: boolean;
    myNetwork: boolean;
    recommended: boolean;
}

const defaultFilters: SmartFilterOptions = {
    categories: [],
    searchTerm: '',
    dateRange: { start: null, end: null },
    format: 'all',
    cost: 'all',
    difficulty: 'all',
    timePreference: 'all',
    availability: 'all',
    popularity: 'all',
    duration: 'all',
    myTracked: false,
    myNetwork: false,
    recommended: false,
};

export function useSmartFilters(
    events: AppEvent[],
    userProfile: AppProfile | null,
    userCalendar?: CalendarEvent[] // User's personal calendar for conflict detection
) {
    const [filters, setFilters] = useState<SmartFilterOptions>(defaultFilters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // Smart filter logic
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // Basic filters
            if (filters.categories.length > 0 && !filters.categories.includes(event.eventTypeId)) {
                return false;
            }

            if (filters.searchTerm && !event.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
                !event.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
                !event.organizer.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
                return false;
            }

            // Date range filter
            if (filters.dateRange.start || filters.dateRange.end) {
                const eventDate = new Date(event.startTime);
                if (filters.dateRange.start && eventDate < filters.dateRange.start) return false;
                if (filters.dateRange.end && eventDate > filters.dateRange.end) return false;
            }

            // Format filter
            if (filters.format !== 'all') {
                const isVirtual = event.location.toLowerCase().includes('virtual') || event.livestreamUrl;
                const isInPerson = !isVirtual && event.location !== 'TBA';

                switch (filters.format) {
                    case 'virtual':
                        if (!isVirtual) return false;
                        break;
                    case 'in-person':
                        if (!isInPerson) return false;
                        break;
                    case 'hybrid':
                        if (!isVirtual || !isInPerson) return false;
                        break;
                }
            }

            // Cost filter (mock implementation - in real app, this would come from event data)
            if (filters.cost !== 'all') {
                const isFree = Math.random() > 0.4; // Mock: 60% of events are free
                if (filters.cost === 'free' && !isFree) return false;
                if (filters.cost === 'paid' && isFree) return false;
            }

            // Difficulty filter (mock implementation)
            if (filters.difficulty !== 'all') {
                const eventDifficulty = getDifficultyFromEvent(event);
                if (filters.difficulty !== eventDifficulty) return false;
            }

            // Time preference filter
            if (filters.timePreference !== 'all') {
                const eventDate = new Date(event.startTime);
                const hour = eventDate.getHours();
                const dayOfWeek = eventDate.getDay();

                switch (filters.timePreference) {
                    case 'work-hours':
                        if (hour < 9 || hour > 17 || dayOfWeek === 0 || dayOfWeek === 6) return false;
                        break;
                    case 'after-hours':
                        if ((hour >= 9 && hour <= 17) && dayOfWeek !== 0 && dayOfWeek !== 6) return false;
                        break;
                    case 'weekends':
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;
                        break;
                }
            }

            // Availability filter (conflict detection)
            if (filters.availability === 'no-conflicts' && userCalendar) {
                const hasConflict = checkForConflicts(event, userCalendar);
                if (hasConflict) return false;
            }

            // Popularity filter (mock implementation)
            if (filters.popularity !== 'all') {
                const popularity = getEventPopularity(event);
                if (filters.popularity !== popularity) return false;
            }

            // Duration filter
            if (filters.duration !== 'all') {
                const duration = getEventDuration(event);
                if (filters.duration !== duration) return false;
            }

            // Personal filters
            if (filters.myTracked && !event.isTracked) return false;
            if (filters.myNetwork && !hasNetworkConnections(event)) return false;
            if (filters.recommended && !isRecommendedForUser(event, userProfile)) return false;

            return true;
        });
    }, [events, filters, userProfile, userCalendar]);

    // Helper functions
    const getDifficultyFromEvent = (event: AppEvent): 'beginner' | 'intermediate' | 'advanced' => {
        const title = event.title.toLowerCase();
        const description = event.description.toLowerCase();

        if (title.includes('beginner') || title.includes('intro') || title.includes('101')) {
            return 'beginner';
        }
        if (title.includes('advanced') || title.includes('expert') || description.includes('prerequisite')) {
            return 'advanced';
        }
        return 'intermediate';
    };

    const checkForConflicts = (event: AppEvent, calendar: CalendarEvent[]): boolean => {
        const eventStart = new Date(event.startTime);
        const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);

        return calendar.some(calEvent => {
            const calStart = new Date(calEvent.start);
            const calEnd = new Date(calEvent.end);

            return (eventStart < calEnd && eventEnd > calStart);
        });
    };

    const getEventPopularity = (_event: AppEvent): 'trending' | 'high-attendance' | 'niche' => {
        // Mock implementation - in real app, this would be based on actual data
        const random = Math.random();
        if (random > 0.8) return 'trending';
        if (random > 0.5) return 'high-attendance';
        return 'niche';
    };

    const getEventDuration = (event: AppEvent): 'short' | 'medium' | 'long' | 'multi-day' => {
        if (!event.endTime) return 'medium';

        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (diffHours > 24) return 'multi-day';
        if (diffHours > 6) return 'long';
        if (diffHours > 3) return 'medium';
        return 'short';
    };

    const hasNetworkConnections = (_event: AppEvent): boolean => {
        // Mock implementation - in real app, this would check actual network data
        return Math.random() > 0.7;
    };

    const isRecommendedForUser = (_event: AppEvent, profile: AppProfile | null): boolean => {
        // Mock implementation - in real app, this would use ML or rule-based recommendations
        if (!profile) return false;
        return Math.random() > 0.6;
    };

    // Filter actions
    const updateFilter = useCallback(<K extends keyof SmartFilterOptions>(
        key: K,
        value: SmartFilterOptions[K]
    ) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(defaultFilters);
    }, []);

    const applyQuickFilter = useCallback((filterType: string) => {
        switch (filterType) {
            case 'this-week':
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                setFilters(prev => ({
                    ...prev,
                    dateRange: { start: weekStart, end: weekEnd }
                }));
                break;

            case 'free-events':
                setFilters(prev => ({ ...prev, cost: 'free' }));
                break;

            case 'virtual-only':
                setFilters(prev => ({ ...prev, format: 'virtual' }));
                break;

            case 'my-level':
                // Set difficulty based on user's experience level (mock)
                setFilters(prev => ({ ...prev, difficulty: 'intermediate' }));
                break;

            case 'no-conflicts':
                setFilters(prev => ({ ...prev, availability: 'no-conflicts' }));
                break;

            case 'trending':
                setFilters(prev => ({ ...prev, popularity: 'trending' }));
                break;
        }
    }, []);

    // Get active filter count for UI
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.categories.length > 0) count++;
        if (filters.searchTerm) count++;
        if (filters.dateRange.start || filters.dateRange.end) count++;
        if (filters.format !== 'all') count++;
        if (filters.cost !== 'all') count++;
        if (filters.difficulty !== 'all') count++;
        if (filters.timePreference !== 'all') count++;
        if (filters.availability !== 'all') count++;
        if (filters.popularity !== 'all') count++;
        if (filters.duration !== 'all') count++;
        if (filters.myTracked) count++;
        if (filters.myNetwork) count++;
        if (filters.recommended) count++;
        return count;
    }, [filters]);

    return {
        filters,
        filteredEvents,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount,
        isFilterPanelOpen,
        setIsFilterPanelOpen,
    };
}