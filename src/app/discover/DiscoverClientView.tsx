'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event, EventType, AppProfile } from '@/types';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';
import DesktopDiscoveryView from '@/components/calendar/desktop/discovery/DesktopDiscoveryView';
import { CalendarLayout } from '../calendar/CalendarLayout';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { SmartLoader } from '@/components/Loading';
import { EventsLoadingSkeleton } from '@/components/ui/LoadingStates';
import { useNavigation } from '@/utils/navigation';
import { useSnackbar } from '@/contexts/SnackbarContext';

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
    const initialFilters = useMemo(() => {
        try {
            const budget = (profile as unknown as { careerProfile?: { budget?: string } } | null)?.careerProfile?.budget;
            if (budget && typeof budget === 'string') {
                return { budget } as Partial<ReturnType<typeof useUnifiedServerFiltering>['filters']>;
            }
        } catch {
            // no-op
        }
        return {};
    }, [profile]);

    const eventData = useUnifiedServerFiltering(profile, initialFilters);
    const { showInfo } = useSnackbar();
    
    // Calendar state for CalendarProvider
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [_selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const currentDate = new Date();

    // Navigation handlers
    const handleEventSelect = useCallback((event: Event) => {
        nav.toEvent(event.id);
    }, [nav]);

    const handleNavigate = useCallback(() => {
        nav.toCalendar();
    }, [nav]);

    const handleToggleFilters = useCallback(() => {
        nav.toCalendar();
    }, [nav]);

    // Calendar context handlers
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        nav.toDate(date);
    }, [nav]);

    const handleEventSelectForContext = useCallback((event: Event) => {
        setSelectedEvent(event);
        nav.toEvent(event.id);
    }, [nav]);

    const handleCloseEventDetail = useCallback(() => {
        setSelectedEvent(null);
    }, []);

    // Optional: surface hint about USD-only budget gating (once per session)
    useEffect(() => {
        try {
            const hintEnabled = process.env.NEXT_PUBLIC_SHOW_BUDGET_HINT === 'true';
            const hasBudgetPreference = Boolean((profile as any)?.careerProfile?.budget); // eslint-disable-line @typescript-eslint/no-explicit-any
            const alreadyShown = typeof window !== 'undefined' && sessionStorage.getItem('usd-budget-hint-shown') === '1';

            if (hintEnabled && hasBudgetPreference && !alreadyShown) {
                showInfo('Heads up: Budget filtering is USD-only for now. Events priced in other currencies are excluded when a budget tier is active.', 7000);
                sessionStorage.setItem('usd-budget-hint-shown', '1');
            }
        } catch {
            // no-op
        }
    }, [profile, showInfo]);

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
            onEventSelect={handleEventSelectForContext}
            onCloseEventDetail={handleCloseEventDetail}
        >
            <CalendarLayout
                onNavigate={handleNavigate}
                onDateChange={handleDateSelect}
                onToggleFilters={handleToggleFilters}
                isFilterPanelOpen={false}
                activeFilterCount={eventData.activeFilterCount}
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
                        <div aria-busy={eventData.rateLimitWaitMs > 0 || eventData.isLoading}>
                            {/* Rate limit wait feedback */}
                            {eventData.rateLimitWaitMs > 0 && (
                                <div
                                    className="mb-4 rounded-md border border-border-subtle bg-background-elevated p-3 text-sm text-text-secondary"
                                    role="status"
                                    aria-live="polite"
                                >
                                    Fetching results... (waiting {Math.ceil(eventData.rateLimitWaitMs / 1000)}s to avoid rate limit)
                                </div>
                            )}
                        {/* Empty-results hint for budget tiers */}
                        {!eventData.isLoading && eventData.filteredEvents.length === 0 && eventData.filters.budget !== 'all' && (
                            <div className="mb-4 rounded-md border border-border-subtle bg-background-elevated p-3">
                                <p className="text-sm text-foreground-secondary">No events found for the selected budget tier. Budget filtering is USD-only.</p>
                                <div className="mt-2">
                                    <button
                                        onClick={() => eventData.updateFilter('budget', 'all' as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                                        className="inline-flex items-center rounded-md border border-border-default px-3 py-1 text-sm text-foreground-primary hover:bg-background-muted"
                                    >
                                        Show all budgets
                                    </button>
                                </div>
                            </div>
                        )}
                        {mainContent}
                        </div>
                    </SmartLoader>
                )}
            />
        </CalendarProvider>
    );
}
