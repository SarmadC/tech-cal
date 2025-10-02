'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event, EventType, AppProfile } from '@/types';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';
import DesktopDiscoveryView from '@/components/calendar/desktop/discovery/DesktopDiscoveryView';
import { CalendarLayout } from '../calendar/CalendarLayout';
import { SmartLoader } from '@/components/Loading';
import { EventsLoadingSkeleton } from '@/components/ui/LoadingStates';
import { useNavigation } from '@/utils/navigation';
import { CalendarProvider } from '@/contexts/CalendarContext';

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
    
    // Calendar state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [_selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const currentDate = new Date();

    // Navigation handlers
    const handleEventSelect = useCallback((event: Event) => {
        setSelectedEvent(event);
    }, []);

    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        nav.toDate(date);
    }, [nav]);

    const handleNavigate = useCallback(() => {
        nav.toCalendar();
    }, [nav]);

    const handleToggleFilters = useCallback(() => {
        nav.toCalendar();
    }, [nav]);

    const handleCloseEventDetail = useCallback(() => {
        setSelectedEvent(null);
    }, []);

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
        <CalendarProvider
            selectedDate={selectedDate}
            currentDate={currentDate}
            events={eventData.filteredEvents}
            categories={initialCategories}
            profile={profile}
            onDateSelect={handleDateSelect}
            onEventSelect={handleEventSelect}
            onCloseEventDetail={handleCloseEventDetail}
        >
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
        </CalendarProvider>
    );
}
