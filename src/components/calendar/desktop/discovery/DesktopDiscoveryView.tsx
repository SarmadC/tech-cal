'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Event, EventType, AppProfile, TrackedEvent, CareerImpactScore } from '@/types';
import DiscoveryLayout from '@/components/discovery/DiscoveryLayout';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import EventCard from '@/components/discovery/EventCard';
import HeroSpotlight from '@/components/discovery/HeroSpotlight';
import DiscoverySectionBlock from '@/components/discovery/DiscoverySectionBlock';
import ActiveFilterRail from '@/components/discovery/ActiveFilterRail';
import RecommendationExplainDrawer from '@/components/discovery/RecommendationExplainDrawer';
import ShortlistCompareTray from '@/components/discovery/ShortlistCompareTray';
import {
    DiscoveryRankingMode,
    DISCOVERY_RANKING_OPTIONS,
    diversifyFirstViewport,
    rankEventsByMode,
} from '@/components/discovery/discoveryRanking';
import { buildActiveFilterChips, DiscoveryFilterChip } from '@/components/discovery/discoveryFilterChips';
import { getQuickFitBadges } from '@/components/discovery/quickFitBadges';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { calculateFilterCounts, FilterCounts } from '@/utils/filterCountUtils';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useRemoteSearchSuggestions } from '@/hooks/useRemoteSearchSuggestions';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useDiscoverySections } from '@/hooks/useDiscoverySections';
import { useDiscoveryUxMetrics } from '@/hooks/useDiscoveryUxMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { extractCareerProfile } from '@/utils/profileTypeGuards';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { DiscoveryFeedbackAction } from '@/components/discovery/discoveryFeedback';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

export interface DesktopDiscoveryViewProps {
    events: Event[];
    categories: EventType[];
    profile: AppProfile | null;
    trackedEvents?: TrackedEvent[];
    onEventSelect?: (event: Event) => void;
    className?: string;
    filters: UnifiedFilterOptions;
    onUpdateFilter: UpdateFilterHandler;
    onSearch: () => void;
    totalCount: number;
    onResetFilters: () => void;
    activeFilterCount: number;
    onNearMeClick?: () => void;
    isDetectingLocation?: boolean;
    isSearching?: boolean;
    countsFromServer?: FilterCounts | null;
}

function appendUnique(values: string[], value: string): string[] {
    if (values.includes(value)) {
        return values;
    }
    return [...values, value].slice(-150);
}

const DesktopDiscoveryView: React.FC<DesktopDiscoveryViewProps> = ({
    events,
    categories,
    profile,
    trackedEvents = [],
    onEventSelect,
    className = '',
    filters,
    onUpdateFilter,
    onSearch,
    totalCount,
    onResetFilters,
    activeFilterCount,
    onNearMeClick,
    isDetectingLocation,
    isSearching,
    countsFromServer
}) => {
    const { isBookmarked, toggleBookmark, getAttendanceStatus, setAttendanceStatus } = useEventEngagement();
    const { showError, showInfo } = useSnackbar();

    const [pendingBookmarkIds, setPendingBookmarkIds] = useState<Set<string>>(new Set());
    const [pendingAttendanceIds, setPendingAttendanceIds] = useState<Set<string>>(new Set());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [feedbackHint, setFeedbackHint] = useState<string | null>(null);
    const [explainEvent, setExplainEvent] = useState<EventWithImpact | null>(null);

    const [rankingMode, setRankingMode] = useLocalStorage<DiscoveryRankingMode>('discovery-ranking-mode', 'best-match');
    const [hiddenEventIds, setHiddenEventIds] = useLocalStorage<string[]>('discovery-hidden-events', []);
    const [categoryPenalty, setCategoryPenalty] = useLocalStorage<Record<string, number>>('discovery-category-penalty', {});
    const [shortlistIds, setShortlistIds] = useLocalStorage<string[]>('discovery-shortlist-ids', []);
    const [shortlistMode, setShortlistMode] = useLocalStorage<boolean>('discovery-shortlist-mode', false);
    const [sectionExpansion, setSectionExpansion] = useLocalStorage<Record<string, boolean>>('discovery-section-expansion', {});

    const hiddenEventIdSet = useMemo(() => new Set(hiddenEventIds), [hiddenEventIds]);
    const shortlistIdSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);

    const metrics = useDiscoveryUxMetrics({
        surface: 'desktop',
        initialRankingMode: rankingMode,
    });

    const typedEvents = useMemo(() => events as EventWithImpact[], [events]);

    const updateFilterTracked: UpdateFilterHandler = useCallback((key, value) => {
        onUpdateFilter(key, value);
        metrics.trackFilterChange({
            activeFilterCount,
            changedFilter: String(key),
        });
    }, [onUpdateFilter, metrics, activeFilterCount]);

    const applyRankingMode = useCallback((
        mode: DiscoveryRankingMode,
        trackTelemetry = true,
        allowNearMeDetection = true
    ) => {
        setRankingMode(mode);

        if (trackTelemetry) {
            metrics.trackRankingChange(mode);
        }

        if (mode !== 'trending' && filters.popularity === 'trending') {
            onUpdateFilter('popularity', 'all');
        }

        if (mode === 'best-match') {
            onUpdateFilter('sortBy', 'career-impact');
            onUpdateFilter('sortDirection', 'desc');
            return;
        }

        if (mode === 'trending') {
            onUpdateFilter('sortBy', 'popularity');
            onUpdateFilter('sortDirection', 'desc');
            onUpdateFilter('popularity', 'trending');
            return;
        }

        if (mode === 'near-me') {
            onUpdateFilter('sortBy', 'date');
            onUpdateFilter('sortDirection', 'asc');
            if (allowNearMeDetection && !filters.locations[0]) {
                void onNearMeClick?.();
            }
            return;
        }

        onUpdateFilter('sortBy', 'date');
        onUpdateFilter('sortDirection', 'asc');
    }, [
        filters.locations,
        filters.popularity,
        metrics,
        onNearMeClick,
        onUpdateFilter,
        setRankingMode,
    ]);

    const rankingInitializedRef = useRef(false);
    useEffect(() => {
        if (rankingInitializedRef.current) {
            return;
        }

        rankingInitializedRef.current = true;
        applyRankingMode(rankingMode, false, false);
    }, [applyRankingMode, rankingMode]);

    const rankedEvents = useMemo(() => {
        return rankEventsByMode(typedEvents, rankingMode, {
            locationHint: filters.locations[0],
            hiddenEventIds: hiddenEventIdSet,
            categoryPenalty,
        });
    }, [typedEvents, rankingMode, filters.locations, hiddenEventIdSet, categoryPenalty]);

    const diversifiedEvents = useMemo(() => {
        return diversifyFirstViewport(rankedEvents, { viewportSize: 9 });
    }, [rankedEvents]);

    const shortlistEvents = useMemo(() => {
        return typedEvents.filter((event) => shortlistIdSet.has(event.id));
    }, [typedEvents, shortlistIdSet]);

    useEffect(() => {
        metrics.trackImpressions(shortlistMode ? shortlistEvents.length : diversifiedEvents.length);
    }, [metrics, shortlistMode, shortlistEvents.length, diversifiedEvents.length]);

    // Search suggestions and history for autocomplete
    const { suggestions, isLoading: isSuggestionsLoading } = useRemoteSearchSuggestions({
        searchTerm: filters.searchTerm,
        maxSuggestions: 6
    });

    const { history: searchHistory, addSearch } = useSearchHistory({
        respectAnalyticsConsent: true
    });

    const handleSearchWithHistory = useCallback(() => {
        if (filters.searchTerm || filters.locations[0]) {
            addSearch(
                filters.searchTerm,
                filters.locations[0] || '',
                filters.dateRange
            );
        }
        onSearch();
    }, [filters.searchTerm, filters.locations, filters.dateRange, addSearch, onSearch]);

    const handleBookmarkToggle = useCallback(async (event: EventWithImpact) => {
        if (!event?.id || pendingBookmarkIds.has(event.id)) {
            return;
        }

        const wasBookmarked = isBookmarked(event.id);
        setPendingBookmarkIds((prev) => new Set(prev).add(event.id));

        try {
            await toggleBookmark(event.id, event as unknown as Record<string, unknown>);
            if (!wasBookmarked) {
                metrics.trackSave({ eventId: event.id, source: 'bookmark' });
            }
        } catch (error) {
            const isLimit = error instanceof Error && error.message === 'BOOKMARK_LIMIT_REACHED';
            showError(isLimit ? 'Bookmark limit reached. Upgrade to add more.' : 'Failed to save bookmark');
            if (!isLimit) {
                console.error('Failed to toggle bookmark from discovery card:', error);
            }
        } finally {
            setPendingBookmarkIds((prev) => {
                const next = new Set(prev);
                next.delete(event.id);
                return next;
            });
        }
    }, [pendingBookmarkIds, isBookmarked, toggleBookmark, metrics, showError]);

    const handleCardClick = useCallback((event: EventWithImpact, position?: number, section?: string) => {
        metrics.trackCardClick({
            eventId: event.id,
            position,
            section,
        });
        onEventSelect?.(event);
    }, [metrics, onEventSelect]);

    const isAttending = useCallback((eventId: string) => {
        return getAttendanceStatus(eventId) === 'attending';
    }, [getAttendanceStatus]);

    const handleAttendanceToggle = useCallback(async (
        event: EventWithImpact,
        source: 'card_icon' | 'hero_icon' = 'card_icon'
    ) => {
        if (!event?.id || pendingAttendanceIds.has(event.id)) {
            return;
        }

        const currentlyAttending = getAttendanceStatus(event.id) === 'attending';
        setPendingAttendanceIds((prev) => new Set(prev).add(event.id));

        try {
            await setAttendanceStatus(event.id, currentlyAttending ? null : 'attending');
            metrics.trackAttendanceToggle({
                eventId: event.id,
                source,
                action: currentlyAttending ? 'clear_attending' : 'set_attending',
            });
        } catch (error) {
            showError('Failed to update attendance');
            console.error('Failed to toggle attendance from discovery card:', error);
        } finally {
            setPendingAttendanceIds((prev) => {
                const next = new Set(prev);
                next.delete(event.id);
                return next;
            });
        }
    }, [pendingAttendanceIds, getAttendanceStatus, setAttendanceStatus, showError, metrics]);

    const handleFeedbackAction = useCallback((event: EventWithImpact, action: DiscoveryFeedbackAction) => {
        metrics.trackFeedbackAction(event.id, action);

        if (action === 'hide') {
            setHiddenEventIds((prev) => appendUnique(prev, event.id));
            setFeedbackHint('Hidden events are deprioritized immediately.');
            showInfo('Event hidden from discovery feed.');
            return;
        }

        if (action === 'not-relevant') {
            setHiddenEventIds((prev) => appendUnique(prev, event.id));
            if (event.eventTypeId) {
                setCategoryPenalty((prev) => ({
                    ...prev,
                    [event.eventTypeId]: Math.min(75, (prev[event.eventTypeId] ?? 0) + 30),
                }));
            }
            setFeedbackHint('We adjusted recommendations away from this type of event.');
            showInfo('Marked as not relevant. Recommendations will adapt.');
            return;
        }

        if (event.eventTypeId) {
            setCategoryPenalty((prev) => ({
                ...prev,
                [event.eventTypeId]: Math.min(60, (prev[event.eventTypeId] ?? 0) + 18),
            }));
        }
        setFeedbackHint('We are showing fewer events similar to your feedback.');
        showInfo('Preference saved. We will show less like this.');
    }, [metrics, setHiddenEventIds, showInfo, setCategoryPenalty]);

    const handleShortlistToggle = useCallback((event: EventWithImpact) => {
        const currentlyShortlisted = shortlistIdSet.has(event.id);

        setShortlistIds((prev) => {
            if (prev.includes(event.id)) {
                return prev.filter((id) => id !== event.id);
            }
            return [...prev, event.id].slice(-25);
        });

        if (currentlyShortlisted) {
            metrics.trackShortlistAction('remove', Math.max(0, shortlistIds.length - 1), event.id);
            return;
        }

        metrics.trackShortlistAction('add', shortlistIds.length + 1, event.id);
        metrics.trackSave({ eventId: event.id, source: 'shortlist' });
    }, [metrics, shortlistIdSet, shortlistIds.length, setShortlistIds]);

    const removeFromShortlist = useCallback((eventId: string) => {
        setShortlistIds((prev) => prev.filter((id) => id !== eventId));
        metrics.trackShortlistAction('remove', Math.max(0, shortlistIds.length - 1), eventId);
    }, [metrics, setShortlistIds, shortlistIds.length]);

    const clearShortlist = useCallback(() => {
        setShortlistIds([]);
        metrics.trackShortlistAction('clear', 0);
    }, [metrics, setShortlistIds]);

    // Calculate filter counts from current events
    const counts = useMemo(() => {
        return countsFromServer ?? calculateFilterCounts(events, categories);
    }, [countsFromServer, events, categories]);

    const careerProfile = useMemo(() => extractCareerProfile(profile), [profile]);
    const hasActiveFilters = !!(
        filters.searchTerm ||
        filters.locations.some(l => l) ||
        filters.format !== 'all' ||
        filters.cost !== 'all' ||
        (filters.categories && filters.categories.length > 0) ||
        (filters.tags && filters.tags.length > 0)
    );

    const isPersonalizedHome = !shortlistMode && !hasActiveFilters && rankingMode === 'best-match' && !!careerProfile;

    const heroEventIds = useMemo(() => {
        if (!isPersonalizedHome) return new Set<string>();
        return new Set(
            diversifiedEvents
                .filter(e => (e.careerImpact?.overall ?? 0) >= RECOMMENDATION_THRESHOLDS.BUCKETS.HIGH)
                .slice(0, 3)
                .map(e => e.id)
        );
    }, [diversifiedEvents, isPersonalizedHome]);

    const sections = useDiscoverySections({
        events: diversifiedEvents,
        profile: careerProfile,
        heroEventIds,
    });

    const sectionEventIds = useMemo(() => {
        const ids = new Set(heroEventIds);
        sections.forEach(s => s.events.forEach(e => ids.add(e.id)));
        return ids;
    }, [heroEventIds, sections]);

    const remainingEvents = useMemo(() => {
        if (!isPersonalizedHome) return [];
        return diversifiedEvents.filter(e => !sectionEventIds.has(e.id));
    }, [diversifiedEvents, sectionEventIds, isPersonalizedHome]);

    const getBadgesForEvent = useCallback((event: EventWithImpact) => {
        return getQuickFitBadges(event, {
            filters: {
                budget: filters.budget,
                cost: filters.cost,
            },
            scheduledEvents: trackedEvents as Event[],
        });
    }, [filters.budget, filters.cost, trackedEvents]);

    const handleSectionExpansionChange = useCallback((sectionId: string, expanded: boolean) => {
        setSectionExpansion((prev) => ({
            ...prev,
            [sectionId]: expanded,
        }));
    }, [setSectionExpansion]);

    const removeFilterChip = useCallback((chip: DiscoveryFilterChip) => {
        switch (chip.filterKey) {
            case 'searchTerm':
                updateFilterTracked('searchTerm', '');
                break;
            case 'locations':
                updateFilterTracked('locations', filters.locations.filter((location) => location !== chip.value));
                break;
            case 'dateRange':
                updateFilterTracked('dateRange', { start: null, end: null });
                break;
            case 'format':
                updateFilterTracked('format', 'all');
                break;
            case 'cost':
                updateFilterTracked('cost', 'all');
                break;
            case 'budget':
                updateFilterTracked('budget', 'all');
                break;
            case 'difficulty':
                updateFilterTracked('difficulty', 'all');
                break;
            case 'popularity':
                updateFilterTracked('popularity', 'all');
                break;
            case 'duration':
                updateFilterTracked('duration', 'all');
                break;
            case 'availability':
                updateFilterTracked('availability', 'all');
                break;
            case 'recommended':
                updateFilterTracked('recommended', false);
                break;
            case 'categories':
                updateFilterTracked('categories', filters.categories.filter((categoryId) => categoryId !== chip.value));
                break;
            case 'tags':
                updateFilterTracked('tags', filters.tags.filter((tag) => tag !== chip.value));
                break;
            default:
                break;
        }
    }, [updateFilterTracked, filters]);

    const filterChips = useMemo(() => buildActiveFilterChips(filters, categories), [filters, categories]);
    const filterRailChips = useMemo(() => {
        return filterChips.map((chip) => ({
            key: chip.key,
            label: chip.label,
            onRemove: () => removeFilterChip(chip),
        }));
    }, [filterChips, removeFilterChip]);

    const rankingControls = useMemo(() => (
        <div className="inline-flex items-center rounded-xl border border-border/70 bg-background/40 p-1 backdrop-blur-md">
            {DISCOVERY_RANKING_OPTIONS.map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => applyRankingMode(option.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${rankingMode === option.id
                        ? 'bg-[var(--brand-primary)]/20 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                        }`}
                    title={option.description}
                >
                    {option.label}
                </button>
            ))}
        </div>
    ), [applyRankingMode, rankingMode]);

    const actionControls = useMemo(() => (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setShortlistMode((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${shortlistMode
                    ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/40'
                    }`}
            >
                {shortlistMode ? 'Shortlist view' : 'Shortlist mode'}
            </button>

            {hiddenEventIds.length > 0 && (
                <button
                    type="button"
                    onClick={() => setHiddenEventIds([])}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40"
                >
                    Reset hidden
                </button>
            )}
        </div>
    ), [shortlistMode, setShortlistMode, hiddenEventIds.length, setHiddenEventIds]);

    const resetFiltersTracked = useCallback(() => {
        onResetFilters();
        metrics.trackFilterChange({ activeFilterCount: 0, changedFilter: 'reset-all' });
    }, [onResetFilters, metrics]);

    const eventsForGrid = shortlistMode ? shortlistEvents : diversifiedEvents;

    return (
        <div className={`desktop-discovery-view ${className} min-h-full text-foreground`} role="main" aria-label="Discover tech events">
            <DiscoveryLayout
                isSidebarOpen={isSidebarOpen}
                onSidebarClose={() => setIsSidebarOpen(false)}
                sidebar={
                    <DiscoverySidebar
                        filters={{
                            format: filters.format,
                            cost: filters.cost,
                            categories: filters.categories,
                            tags: filters.tags
                        }}
                        onUpdateFilter={updateFilterTracked}
                        categories={categories}
                        events={events}
                        counts={counts}
                    />
                }
                header={
                    <DiscoveryHeader
                        searchTerm={filters.searchTerm}
                        onSearchChange={(val) => updateFilterTracked('searchTerm', val)}
                        location={filters.locations[0] || ''}
                        onLocationChange={(val) => updateFilterTracked('locations', val ? [val] : [])}
                        dateRange={filters.dateRange}
                        onDateRangeChange={(range) => updateFilterTracked('dateRange', range)}
                        onSearch={handleSearchWithHistory}
                        onResetFilters={resetFiltersTracked}
                        activeFilterCount={activeFilterCount}
                        onFilterClick={() => setIsSidebarOpen(true)}
                        onNearMeClick={onNearMeClick}
                        isDetectingLocation={isDetectingLocation}
                        isSearching={isSearching}
                        suggestions={suggestions}
                        searchHistory={searchHistory}
                        isAutocompletLoading={isSuggestionsLoading}
                        rankingControls={rankingControls}
                        actionControls={actionControls}
                    />
                }
                resultCount={shortlistMode ? shortlistEvents.length : totalCount}
                activeFilterRail={
                    <ActiveFilterRail
                        chips={filterRailChips}
                        onClearAll={resetFiltersTracked}
                    />
                }
                layout={isPersonalizedHome ? 'sections' : 'grid'}
            >
                {isPersonalizedHome ? (
                    <>
                        <HeroSpotlight
                            events={eventsForGrid}
                            onEventSelect={(event) => handleCardClick(event as EventWithImpact, 0, 'hero')}
                            onBookmark={handleBookmarkToggle}
                            onAttendanceToggle={(event) => handleAttendanceToggle(event as EventWithImpact, 'hero_icon')}
                            onFeedbackAction={handleFeedbackAction}
                            onShortlistToggle={handleShortlistToggle}
                            isInShortlist={(eventId) => shortlistIdSet.has(eventId)}
                            isBookmarked={isBookmarked}
                            isAttending={isAttending}
                            pendingBookmarkIds={pendingBookmarkIds}
                            pendingAttendanceIds={pendingAttendanceIds}
                        />

                        {sections.map((section) => (
                            <DiscoverySectionBlock
                                key={section.id}
                                id={section.id}
                                title={section.title}
                                subtitle={section.subtitle}
                                events={section.events}
                                onEventSelect={(event) => handleCardClick(event as EventWithImpact, undefined, section.id)}
                                onBookmark={handleBookmarkToggle}
                                onAttendanceToggle={handleAttendanceToggle}
                                isBookmarked={isBookmarked}
                                isAttending={isAttending}
                                pendingBookmarkIds={pendingBookmarkIds}
                                pendingAttendanceIds={pendingAttendanceIds}
                                expanded={sectionExpansion[section.id] ?? false}
                                onExpandedChange={(expanded) => handleSectionExpansionChange(section.id, expanded)}
                                getQuickFitBadges={getBadgesForEvent}
                                onFeedbackAction={handleFeedbackAction}
                                onExplainRecommendation={setExplainEvent}
                                onShortlistToggle={handleShortlistToggle}
                                isInShortlist={(eventId) => shortlistIdSet.has(eventId)}
                            />
                        ))}

                        {remainingEvents.length > 0 && (
                            <DiscoverySectionBlock
                                id="more-events"
                                title="More Events"
                                events={remainingEvents}
                                onEventSelect={(event) => handleCardClick(event as EventWithImpact, undefined, 'more-events')}
                                onBookmark={handleBookmarkToggle}
                                onAttendanceToggle={handleAttendanceToggle}
                                isBookmarked={isBookmarked}
                                isAttending={isAttending}
                                pendingBookmarkIds={pendingBookmarkIds}
                                pendingAttendanceIds={pendingAttendanceIds}
                                defaultVisibleCount={6}
                                expanded={sectionExpansion['more-events'] ?? false}
                                onExpandedChange={(expanded) => handleSectionExpansionChange('more-events', expanded)}
                                getQuickFitBadges={getBadgesForEvent}
                                onFeedbackAction={handleFeedbackAction}
                                onExplainRecommendation={setExplainEvent}
                                onShortlistToggle={handleShortlistToggle}
                                isInShortlist={(eventId) => shortlistIdSet.has(eventId)}
                            />
                        )}
                    </>
                ) : (
                    eventsForGrid.map((event, index) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            onClick={() => handleCardClick(event, index, shortlistMode ? 'shortlist' : 'grid')}
                            onBookmark={handleBookmarkToggle}
                            onAttendanceToggle={handleAttendanceToggle}
                            isBookmarked={isBookmarked(event.id)}
                            isBookmarking={pendingBookmarkIds.has(event.id)}
                            isAttending={isAttending(event.id)}
                            isAttendanceUpdating={pendingAttendanceIds.has(event.id)}
                            showRecommendationContext
                            quickFitBadges={getBadgesForEvent(event)}
                            onFeedbackAction={handleFeedbackAction}
                            onExplainRecommendation={setExplainEvent}
                            onShortlistToggle={handleShortlistToggle}
                            isInShortlist={shortlistIdSet.has(event.id)}
                        />
                    ))
                )}
            </DiscoveryLayout>

            <RecommendationExplainDrawer
                open={Boolean(explainEvent)}
                event={explainEvent}
                rankingMode={rankingMode}
                activeFilterCount={activeFilterCount}
                feedbackHint={feedbackHint}
                onClose={() => setExplainEvent(null)}
            />

            <ShortlistCompareTray
                events={shortlistEvents}
                onRemove={removeFromShortlist}
                onClear={clearShortlist}
                onSelectEvent={(event) => handleCardClick(event, undefined, 'shortlist-compare')}
            />
        </div>
    );
};

export default DesktopDiscoveryView;
