'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Event, EventType, AppProfile } from '@/types';
import { isProfileEmpty, extractCareerProfile } from '@/utils/profileTypeGuards';
import { useUnifiedServerFiltering, UnifiedFilterOptions } from '@/hooks/useUnifiedServerFiltering';
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
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

// IMPORTANT: Dynamic import must be outside component to prevent re-creation on each render
const MobileDiscoveryViewDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileDiscoveryView'),
    { ssr: false } // No loading skeleton - prevents jarring flashes during search
);

// Shared Desktop Sidebar
const EventDetailSidebarDynamic = dynamic(
    () => import('@/components/calendar/EventDetailSidebar'),
    { ssr: false }
);

const MobileEventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileEventDetailPanel'),
    { ssr: false }
);

interface DiscoverClientViewProps {
    initialCategories: EventType[];
    profile: AppProfile | null;
}

const DISCOVERY_RESUME_STATE_KEY = 'discover-resume-state-v1';

type SerializableFilters = Omit<UnifiedFilterOptions, 'dateRange'> & {
    dateRange: {
        start: string | null;
        end: string | null;
    };
};

interface DiscoveryResumeState {
    filters: SerializableFilters;
    scrollY: number;
    savedAt: string;
}

function serializeFilters(filters: UnifiedFilterOptions): SerializableFilters {
    return {
        ...filters,
        dateRange: {
            start: filters.dateRange.start ? filters.dateRange.start.toISOString() : null,
            end: filters.dateRange.end ? filters.dateRange.end.toISOString() : null,
        },
    };
}

function deserializeFilters(filters: SerializableFilters): UnifiedFilterOptions {
    return {
        ...filters,
        dateRange: {
            start: filters.dateRange.start ? new Date(filters.dateRange.start) : null,
            end: filters.dateRange.end ? new Date(filters.dateRange.end) : null,
        },
    };
}

export default function DiscoverClientView({
    initialCategories,
    profile
}: DiscoverClientViewProps) {
    const router = useRouter();
    const nav = useNavigation(router);
    const { isMobile, isReady: isDeviceReady } = useDeviceDetection();

    const initialFilters = useMemo(() => {
        const filters: Partial<ReturnType<typeof useUnifiedServerFiltering>['filters']> = {};

        try {
            // Safely extract career profile using the shared utility
            // This handles the correct path: profile.preferences.careerProfile
            // Note: We deliberately do NOT set the budget filter here anymore.
            // Users should start with "All Budgets" and apply filters manually if desired.
            // This prevents the "No events found for budget tier" message on initial load.
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
    const [showPersonalizedHint, setShowPersonalizedHint] = useState(true);
    const currentDate = new Date();
    const hasRestoredResumeRef = useRef(false);
    const filtersRef = useRef(eventData.filters);

    useEffect(() => {
        filtersRef.current = eventData.filters;
    }, [eventData.filters]);

    const persistResumeState = useCallback((scrollY?: number) => {
        if (typeof window === 'undefined') {
            return;
        }

        const payload: DiscoveryResumeState = {
            filters: serializeFilters(filtersRef.current),
            scrollY: typeof scrollY === 'number' ? scrollY : window.scrollY,
            savedAt: new Date().toISOString(),
        };

        try {
            sessionStorage.setItem(DISCOVERY_RESUME_STATE_KEY, JSON.stringify(payload));
        } catch {
            // no-op
        }
    }, []);

    useEffect(() => {
        if (hasRestoredResumeRef.current || typeof window === 'undefined') {
            return;
        }

        hasRestoredResumeRef.current = true;

        try {
            const raw = sessionStorage.getItem(DISCOVERY_RESUME_STATE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as DiscoveryResumeState;
            if (!parsed?.filters) {
                return;
            }

            const restoredFilters = deserializeFilters(parsed.filters);

            eventData.updateFilter('searchTerm', restoredFilters.searchTerm);
            eventData.updateFilter('categories', restoredFilters.categories);
            eventData.updateFilter('tags', restoredFilters.tags);
            eventData.updateFilter('locations', restoredFilters.locations);
            eventData.updateFilter('dateRange', restoredFilters.dateRange);
            eventData.updateFilter('budget', restoredFilters.budget);
            eventData.updateFilter('format', restoredFilters.format);
            eventData.updateFilter('cost', restoredFilters.cost);
            eventData.updateFilter('difficulty', restoredFilters.difficulty);
            eventData.updateFilter('availability', restoredFilters.availability);
            eventData.updateFilter('popularity', restoredFilters.popularity);
            eventData.updateFilter('duration', restoredFilters.duration);
            eventData.updateFilter('myTracked', restoredFilters.myTracked);
            eventData.updateFilter('myNetwork', restoredFilters.myNetwork);
            eventData.updateFilter('recommended', restoredFilters.recommended);
            eventData.updateFilter('sortBy', restoredFilters.sortBy);
            eventData.updateFilter('sortDirection', restoredFilters.sortDirection);

            if (typeof parsed.scrollY === 'number' && parsed.scrollY > 0) {
                requestAnimationFrame(() => {
                    window.scrollTo({ top: parsed.scrollY, behavior: 'auto' });
                });
            }
        } catch {
            // no-op
        }
    }, [eventData, eventData.updateFilter]);

    useEffect(() => {
        persistResumeState();
    }, [eventData.filters, persistResumeState]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const handleScroll = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                persistResumeState(window.scrollY);
            }, 160);
        };

        const handleBeforeUnload = () => {
            persistResumeState(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [persistResumeState]);

    // Navigation handlers
    const handleEventSelect = useCallback((event: Event) => {
        setSelectedEvent(event);
    }, []);

    // Calendar context handlers
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(date);
        nav.toDate(date);
    }, [nav]);

    const handleEventSelectForContext = useCallback((event: Event) => {
        setSelectedEvent(event);
    }, []);

    const handleCloseEventDetail = useCallback(() => {
        setSelectedEvent(null);
    }, []);

    // Optional: surface hint about USD-only budget gating (once per session)
    useEffect(() => {
        try {
            const hintEnabled = process.env.NEXT_PUBLIC_SHOW_BUDGET_HINT === 'true';
            const careerProfile = extractCareerProfile(profile);
            const hasBudgetPreference = Boolean(careerProfile?.budget);
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
    const mainContent = !isDeviceReady ? loadingSkeleton : isMobile ? (
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
                    <h1 className="sr-only">Discover tech events</h1>
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

                                <div className="relative max-w-[1600px] mx-auto px-0 pt-0 pb-0 md:px-6 md:pt-24 md:pb-8 space-y-6">
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
                                                {eventData.isColdStart && !eventData.isLoading && showPersonalizedHint && (
                                                    <div className="group relative mb-4 rounded-xl border border-border/50 bg-card/40 p-3 text-sm backdrop-blur-sm transition-all hover:bg-card/60">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowPersonalizedHint(false);
                                                            }}
                                                            className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-background/80 hover:text-foreground"
                                                            aria-label="Dismiss"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                                            </svg>
                                                        </button>
                                                        <div className="flex items-start pr-8">
                                                            <div className="flex-shrink-0 pt-0.5">
                                                                <svg className="h-4 w-4 text-primary/70" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="font-medium text-foreground/90">Personalized for You</h3>
                                                                <p className="mt-1 text-muted-foreground/90">
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
                    {selectedEvent && isDeviceReady && (
                        isMobile ? (
                            <MobileEventDetailPanelDynamic
                                event={selectedEvent}
                                onClose={handleCloseEventDetail}
                                categories={initialCategories}
                            />
                        ) : (
                            <EventDetailSidebarDynamic
                                event={selectedEvent}
                                onClose={handleCloseEventDetail}
                                categories={initialCategories}
                            />
                        )
                    )}
                </div>
            </SidebarProvider>
        </CalendarProvider>
    );
}
