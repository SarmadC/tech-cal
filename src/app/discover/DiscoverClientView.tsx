'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Event, EventType, AppProfile } from '@/types';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';
import DesktopDiscoveryView from '@/components/calendar/desktop/discovery/DesktopDiscoveryView';
import { CalendarLayout } from '../calendar/CalendarLayout';
import { SmartLoader } from '@/components/Loading';
import { EventsLoadingSkeleton } from '@/components/ui/LoadingStates';
import { useNavigation } from '@/utils/navigation';

interface DiscoverClientViewProps {
    initialCategories: EventType[];
    profile: AppProfile | null;
}

export default function DiscoverClientView({
    initialCategories,
    profile
}: DiscoverClientViewProps) {
    const router = useRouter();
    const nav = useNavigation(router);
    const eventData = useUnifiedServerFiltering(profile);

    // Navigation handlers
    const handleEventSelect = useCallback((event: Event) => {
        nav.toEvent(event.id);
    }, [nav]);

    const handleDateSelect = useCallback((date: Date) => {
        nav.toDate(date);
    }, [nav]);

    const handleNavigate = useCallback(() => {
        nav.toCalendar();
    }, [nav]);

    const handleToggleFilters = useCallback(() => {
        nav.toCalendar();
    }, [nav]);

    // Loading skeleton
    const loadingSkeleton = <EventsLoadingSkeleton />;

    // Main content
    const mainContent = (
        <DesktopDiscoveryView
            events={eventData.filteredEvents}
            categories={initialCategories}
            profile={profile}
            trackedEvents={eventData.filteredEvents.filter(e => e.isTracked)}
            onEventSelect={handleEventSelect}
        />
    );

    return (
        <CalendarLayout
            onNavigate={handleNavigate}
            onDateChange={handleDateSelect}
            onToggleFilters={handleToggleFilters}
            isFilterPanelOpen={false}
            activeFilterCount={0}
            events={eventData.filteredEvents}
            categories={initialCategories}
            profile={profile}
            onEventSelect={handleEventSelect}
            renderContent={() => (
                <SmartLoader
                    loading={eventData.isLoading}
                    error={eventData.error}
                    onRetry={eventData.refetch}
                    skeleton={loadingSkeleton}
                >
                    {mainContent}
                </SmartLoader>
            )}
        />
    );
}
