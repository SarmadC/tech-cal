// src/hooks/useSmartFilters.ts
import { useState, useMemo, useCallback } from 'react';
import { Event, AppProfile, isTrackedEvent, TrackedEvent, CalendarEventData } from '@/types';
import { UnifiedEventUtils, DurationCategory } from '@/utils/unifiedEventUtils';

/**
 * Extract career impact score from event
 * Checks both careerImpactLite (lightweight) and careerImpact (full)
 * @param event - Event or TrackedEvent to extract score from
 * @returns Career impact score (0-100) or 0 if no score available
 */
function getCareerImpactScore(event: Event | TrackedEvent): number {
    const asScored = event as { 
        careerImpactLite?: { overall: number };
        careerImpact?: { overall: number };
    };
    return asScored.careerImpactLite?.overall 
           ?? asScored.careerImpact?.overall 
           ?? 0;
}

export interface SmartFilterOptions {
    // ... (interface remains the same)
    categories: string[];
    searchTerm: string;
    dateRange: { start: Date | null; end: Date | null; };
    format: 'all' | 'virtual' | 'in-person' | 'hybrid';
    cost: 'all' | 'free' | 'paid';
    difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
    availability: 'all' | 'available' | 'no-conflicts';
    popularity: 'all' | 'trending' | 'high-attendance' | 'niche';
    myTracked: boolean;
    myNetwork: boolean;
    recommended: boolean;
    duration: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
    sortBy: 'default' | 'date' | 'popularity' | 'career-impact' | 'title' | 'location';
}

const defaultFilters: SmartFilterOptions = {
    // ... (defaults remain the same)
    categories: [],
    searchTerm: '',
    dateRange: { start: null, end: null },
    format: 'all',
    cost: 'all',
    difficulty: 'all',
    availability: 'all',
    popularity: 'all',
    duration: 'all',
    myTracked: false,
    myNetwork: false,
    recommended: false,
    sortBy: 'default',
};

// 2. UPDATE SIGNATURE: The hook now accepts a flexible array of Event or TrackedEvent.
export function useSmartFilters(
    events: (Event | TrackedEvent)[],
    userProfile: AppProfile | null,
    userCalendar?: CalendarEventData[]
) {
    const [filters, setFilters] = useState<SmartFilterOptions>(defaultFilters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    const filteredEvents = useMemo(() => {
        // Smart filters processing events
        
        const filtered = events.filter(event => {
            // Basic filters (no change needed here)
            if (filters.categories.length > 0 && !filters.categories.includes(event.eventTypeId)) {
                return false;
            }
            if (filters.searchTerm && !event.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
                !(event.description || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
                !event.organizer.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
                return false;
            }

            // ... (other filters like dateRange, format, cost, etc. remain the same)
            if (filters.dateRange.start || filters.dateRange.end) {
                const eventDate = new Date(event.startTime);
                if (filters.dateRange.start && eventDate < filters.dateRange.start) return false;
                if (filters.dateRange.end && eventDate > filters.dateRange.end) return false;
            }
            if (filters.format !== 'all') {
                const isVirtual = event.location.toLowerCase().includes('virtual') || event.livestreamUrl;
                const isInPerson = !isVirtual && event.location !== 'TBA';
                switch (filters.format) {
                    case 'virtual': if (!isVirtual) return false; break;
                    case 'in-person': if (!isInPerson) return false; break;
                    case 'hybrid': if (!isVirtual || !isInPerson) return false; break;
                }
            }
            if (filters.cost !== 'all') {
                // Determine if event is free based on actual data
                const isFree = !event.priceRange || 
                              event.priceRange.toLowerCase().includes('free') || 
                              event.priceRange === '0' || 
                              event.priceRange.toLowerCase().includes('no cost');
                if (filters.cost === 'free' && !isFree) return false;
                if (filters.cost === 'paid' && isFree) return false;
            }
            if (filters.difficulty !== 'all') {
                if (filters.difficulty !== getDifficultyFromEvent(event)) return false;
            }
            if (filters.availability === 'no-conflicts' && userCalendar) {
                if (checkForConflicts(event, userCalendar)) return false;
            }
            if (filters.popularity !== 'all') {
                if (filters.popularity !== getEventPopularity(event)) return false;
            }
            if (filters.duration !== 'all') {
                if (filters.duration !== getEventDuration(event)) return false;
            }

            // 3. UPDATE PERSONAL FILTERS: Use the type guard for `myTracked`.
            if (filters.myTracked && (!isTrackedEvent(event) || !event.isTracked)) {
                return false;
            }
            if (filters.myNetwork && !hasNetworkConnections(event)) return false;
            
            // Recommended: Filter by career impact score (50+ threshold)
            // Events are pre-enriched with careerImpact scores by the server
            if (filters.recommended && getCareerImpactScore(event) < 50) return false;

            return true;
        });
        
        // Apply sorting based on sortBy filter
        const sorted = [...filtered].sort((a, b) => {
            switch (filters.sortBy) {
                case 'date':
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                case 'popularity':
                    // Simple popularity sorting based on attendee count
                    const aAttendees = a.attendeeCount || 0;
                    const bAttendees = b.attendeeCount || 0;
                    return bAttendees - aAttendees;
                case 'career-impact':
                    // Career impact sorting using pre-computed scores
                    const aCareerScore = getCareerImpactScore(a);
                    const bCareerScore = getCareerImpactScore(b);
                    if (aCareerScore !== bCareerScore) {
                        return bCareerScore - aCareerScore; // Higher scores first
                    }
                    // Fallback to date sorting
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                default:
                    // Default sorting by date
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            }
        });
        
        // Smart filters completed
        return sorted;
    }, [events, filters, userCalendar]);

    // 4. UPDATE HELPER SIGNATURES: All helpers now accept the base `Event` type.
    const getDifficultyFromEvent = (event: Event): 'beginner' | 'intermediate' | 'advanced' => {
        const title = event.title.toLowerCase();
        const description = (event.description || '').toLowerCase();
        if (title.includes('beginner') || title.includes('intro') || title.includes('101')) return 'beginner';
        if (title.includes('advanced') || title.includes('expert') || description.includes('prerequisite')) return 'advanced';
        return 'intermediate';
    };

    const checkForConflicts = (event: Event, calendar: CalendarEventData[]): boolean => {
        const eventStart = new Date(event.startTime);
        const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
        return calendar.some(calEvent => {
            const calStart = new Date(calEvent.start);
            const calEnd = calEvent.end ? new Date(calEvent.end) : new Date(calStart.getTime() + 2 * 60 * 60 * 1000);
            return (eventStart < calEnd && eventEnd > calStart);
        });
    };

    const getEventPopularity = (event: Event): 'trending' | 'high-attendance' | 'niche' => {
        // Base popularity on actual event metrics
        const attendeeCount = event.attendeeCount || 0;
        const hasRegistration = Boolean(event.registrationUrl);
        const isRecentlyCreated = event.createdAt ? 
          (new Date().getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 7 : false;
        
        // Calculate popularity score
        let popularityScore = 0;
        if (attendeeCount > 500) popularityScore += 0.4;
        else if (attendeeCount > 100) popularityScore += 0.2;
        
        if (hasRegistration) popularityScore += 0.2;
        if (isRecentlyCreated) popularityScore += 0.2;
        
        // Major organizers boost
        const orgName = event.organization?.name?.toLowerCase() || '';
        const majorOrgs = ['google', 'microsoft', 'amazon', 'meta', 'apple'];
        if (majorOrgs.some(org => orgName.includes(org))) {
          popularityScore += 0.3;
        }
        
        if (popularityScore >= 0.6) return 'trending';
        if (popularityScore >= 0.3) return 'high-attendance';
        return 'niche';
    };

    const getEventDuration = (event: Event): DurationCategory => {
        return UnifiedEventUtils.getDurationAs(event, 'category') as DurationCategory;
    };

    const hasNetworkConnections = (event: Event): boolean => {
        // Check if event has networking potential based on type and size
        const eventType = event.category?.name?.toLowerCase() || '';
        const attendeeCount = event.attendeeCount || 0;
        
        // High networking potential events
        if (eventType.includes('networking') || eventType.includes('meetup')) return true;
        if (eventType.includes('conference') && attendeeCount > 200) return true;
        if (eventType.includes('summit') && attendeeCount > 100) return true;
        
        // Medium networking potential
        if (attendeeCount > 500) return true;
        if (eventType.includes('workshop') && attendeeCount > 50) return true;
        
        return false;
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