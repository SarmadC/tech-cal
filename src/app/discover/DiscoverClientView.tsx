'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Event, EventType, AppProfile } from '@/types';
import { isProfileEmpty } from '@/utils/profileTypeGuards';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';
import DesktopDiscoveryView from '@/components/calendar/desktop/discovery/DesktopDiscoveryView';

import { CalendarProvider } from '@/contexts/CalendarContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import Navbar from '@/components/common/Navbar';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import { SmartLoader } from '@/components/Loading';
import { EventsLoadingSkeleton } from '@/components/ui/LoadingStates';
import { useNavigation } from '@/utils/navigation';
import { useSnackbar } from '@/contexts/SnackbarContext';
import Loading from '@/components/Loading';
import { useIsMobile } from '@/hooks/useDeviceDetection';

const EventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> }
);

const MobileEventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileEventDetailPanel'),
    { loading: () => <Loading /> }
);

// IMPORTANT: Dynamic import must be outside component to prevent re-creation on each render
const MobileDiscoveryViewDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileDiscoveryView'),
    { ssr: false } // No loading skeleton - prevents jarring flashes during search
);

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
    const isMobile = useIsMobile();

    const initialFilters = useMemo(() => {
        const filters: Partial<ReturnType<typeof useUnifiedServerFiltering>['filters']> = {};

        try {
            const budget = (profile as unknown as { careerProfile?: { budget?: string } } | null)?.careerProfile?.budget;
            if (budget && typeof budget === 'string') {
                // Validate budget is one of the allowed values
                const validBudgets = ['all', 'free-only', 'low', 'moderate', 'high', 'unlimited'] as const;
                if (validBudgets.includes(budget as typeof validBudgets[number])) {
                    filters.budget = budget as typeof validBudgets[number];
                }
            }
        } catch {
            // no-op
        }

        // Set default sort to career-impact for users with profiles (not empty)
        // This ensures best recommendations appear first in discovery view
        if (profile && !isProfileEmpty(profile)) {
            filters.sortBy = 'career-impact';
            filters.sortDirection = 'desc'; // Highest scores first
        }

        return filters;
    }, [profile]);

    const eventData = useUnifiedServerFiltering(profile, initialFilters, { surface: 'discover' });
    const { showInfo } = useSnackbar();

    // Calendar state for CalendarProvider
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const currentDate = new Date();

    // Navigation handlers
    const handleEventSelect = useCallback((event: Event) => {
        setIsClosing(false);
        setSelectedEvent(event);
    }, []);

    // Calendar context handlers
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        nav.toDate(date);
    }, [nav]);

    const handleEventSelectForContext = useCallback((event: Event) => {
        setIsClosing(false);
        setSelectedEvent(event);
    }, []);

    const handleCloseEventDetail = useCallback(() => {
        setIsClosing(true);
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            setSelectedEvent(null);
            setIsClosing(false);
        }, 300); // Match the animation duration
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

    // Loading skeleton for initial page load only
    const loadingSkeleton = <EventsLoadingSkeleton />;

    // Main content - Unified responsive view
    const mainContent = isMobile ? (
        <MobileDiscoveryViewDynamic
            events={eventData.filteredEvents}
            categories={initialCategories}
            profile={profile}
            onEventSelect={handleEventSelect}
            filters={eventData.filters}
            onUpdateFilter={eventData.updateFilter}
            onSearch={eventData.refetch}
            totalCount={eventData.totalCount}
            onResetFilters={eventData.resetFilters}
            activeFilterCount={eventData.activeFilterCount}
            onNearMeClick={eventData.applyNearMe}
            isDetectingLocation={eventData.isDetectingLocation}
            isSearching={eventData.isBackgroundRefetch}
            countsFromServer={eventData.counts}
        />
    ) : (
        <DesktopDiscoveryView
            events={eventData.filteredEvents}
            categories={initialCategories}
            profile={profile}
            trackedEvents={eventData.filteredEvents.filter(e => e.isTracked)}
            onEventSelect={handleEventSelect}
            filters={eventData.filters}
            onUpdateFilter={eventData.updateFilter}
            onSearch={eventData.refetch}
            totalCount={eventData.totalCount}
            onResetFilters={eventData.resetFilters}
            activeFilterCount={eventData.activeFilterCount}
            onNearMeClick={eventData.applyNearMe}
            isDetectingLocation={eventData.isDetectingLocation}
            isSearching={eventData.isBackgroundRefetch}
            countsFromServer={eventData.counts}
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
            <SidebarProvider>
                {/* Mobile Navigation - Only visible on mobile */}
                <MobileBottomNav />
                <div className="flex h-screen bg-background">
                    <AppSidebar />
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {/* Main Navbar - Hidden on mobile */}
                        <div className="hidden md:block">
                            <Navbar />
                        </div>
                        <div className="flex-1 overflow-auto">
                            {/* Main background - Notion/Linear dark theme */}
                            <div className="min-h-screen bg-background relative font-sans">
                                {/* Subtle noise or grain could be added here if desired, but keeping it clean for now */}

                                <div className="relative max-w-[1600px] mx-auto px-0 py-0 md:px-6 md:py-8 space-y-6">
                                    {/* Header */}
                                    <div className="mb-8 hidden md:block">
                                        <h1 className="text-3xl font-medium text-foreground mb-2 tracking-tight">
                                            Discover
                                        </h1>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 flex flex-col" data-view="discovery">
                                        <SmartLoader
                                            loading={eventData.isLoading}
                                            isBackgroundRefetch={eventData.isBackgroundRefetch}
                                            error={eventData.error}
                                            onRetry={eventData.refetch}
                                            skeleton={loadingSkeleton}
                                        >
                                            <div aria-busy={eventData.rateLimitWaitMs > 0 || eventData.isLoading}>
                                                {/* Rate limit wait feedback */}
                                                {eventData.rateLimitWaitMs > 0 && (
                                                    <div
                                                        className="mb-4 rounded-xl border border-border bg-background/70 dark:bg-background/30 text-sm text-muted-foreground p-3 backdrop-blur shadow-sm"
                                                        role="status"
                                                        aria-live="polite"
                                                    >
                                                        Fetching results... (waiting {Math.ceil(eventData.rateLimitWaitMs / 1000)}s to avoid rate limit)
                                                    </div>
                                                )}

                                                {/* Cold start indicator */}
                                                {eventData.isColdStart && !eventData.isLoading && (
                                                    <div className="mb-4 rounded-xl border border-border bg-card/80 dark:bg-card/30 p-3 text-sm text-foreground shadow-sm backdrop-blur">
                                                        <div className="flex items-start">
                                                            <div className="flex-shrink-0">
                                                                <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="text-sm font-semibold text-foreground">Personalized for You</h3>
                                                                <p className="mt-1 text-sm text-muted-foreground">
                                                                    We&apos;re showing you events that similar professionals found valuable.
                                                                    As you interact with events, we&apos;ll learn your preferences and improve recommendations.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Empty-results hint for budget tiers */}
                                                {!eventData.isLoading && eventData.filteredEvents.length === 0 && eventData.filters.budget !== 'all' && (
                                                    <div className="mb-4 rounded-xl border border-border bg-background/70 dark:bg-background/30 p-3 backdrop-blur">
                                                        <p className="text-sm text-muted-foreground">No events found for the selected budget tier. Budget filtering is USD-only.</p>
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => eventData.updateFilter('budget', 'all' as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                                                                className="inline-flex items-center rounded-md border border-border px-3 py-1 text-sm text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                Show all budgets
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {mainContent}
                                            </div>
                                        </SmartLoader>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Event Detail Panel */}
                    {selectedEvent && (
                        <>
                            {isMobile ? (
                                <MobileEventDetailPanelDynamic
                                    event={selectedEvent}
                                    onClose={handleCloseEventDetail}
                                    categories={initialCategories}
                                />
                            ) : (
                                <div
                                    className={`fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'
                                        }`}
                                    onClick={handleCloseEventDetail}
                                >
                                    <div
                                        className={`fixed right-0 top-0 h-full w-full sm:w-[28rem] md:w-[40rem] lg:w-[48rem] xl:w-[56rem] max-w-[95vw] z-[150] transform duration-300 ease-out ${isClosing
                                            ? 'animate-out slide-out-to-right'
                                            : 'animate-in slide-in-from-right'
                                            }`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <EventDetailPanelDynamic
                                            event={selectedEvent}
                                            onClose={handleCloseEventDetail}
                                            categories={initialCategories}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SidebarProvider>
        </CalendarProvider>
    );
}
