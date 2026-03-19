'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaretRight, MagnifyingGlass, SlidersHorizontal } from '@phosphor-icons/react';
import { Event, EventType, AppProfile, CareerImpactScore } from '@/types';
import DiscoveryCard from './DiscoveryCard';
import MobileQuickDatePicker from './MobileQuickDatePicker';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { FilterCounts } from '@/utils/filterCountUtils';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import ShortlistCompareTray from '@/components/discovery/ShortlistCompareTray';
import {
    DiscoveryRankingMode,
    DISCOVERY_RANKING_OPTIONS,
    diversifyFirstViewport,
    rankEventsByMode,
} from '@/components/discovery/discoveryRanking';
import { buildActiveFilterChips, DiscoveryFilterChip } from '@/components/discovery/discoveryFilterChips';
import { DiscoveryFeedbackAction } from '@/components/discovery/discoveryFeedback';
import { calculateFilterCounts } from '@/utils/filterCountUtils';
import MobileAppShell from '@/components/common/mobile/MobileAppShell';
import MobileHeader from '@/components/common/mobile/MobileHeader';
import MobileSectionHeader from '@/components/common/mobile/MobileSectionHeader';
import MobileSheet from '@/components/common/mobile/MobileSheet';
import MobileSurfaceCard from '@/components/common/mobile/MobileSurfaceCard';
import { useDiscoveryUxMetrics } from '@/hooks/useDiscoveryUxMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { MOBILE_DISCOVERY_RANKING_MODE_KEY } from '@/constants/discoveryPersistence';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

export interface MobileDiscoveryViewProps {
    events: Event[];
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
    filters: UnifiedFilterOptions;
    onUpdateFilter: UpdateFilterHandler;
    onSearch: () => void;
    totalCount: number;
    onResetFilters: () => void;
    activeFilterCount: number;
    countsFromServer?: FilterCounts | null;
    onNearMeClick?: () => void;
    isDetectingLocation?: boolean;
    isSearching?: boolean;
}

function appendUnique(values: string[], value: string): string[] {
    if (values.includes(value)) {
        return values;
    }
    return [...values, value].slice(-150);
}

function formatDateRangeLabel(range: { start: Date | null; end: Date | null }): string {
    if (!range.start && !range.end) {
        return 'Any date';
    }

    const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });

    if (range.start && range.end) {
        const sameYear = range.start.getFullYear() === range.end.getFullYear();
        const sameMonth = sameYear && range.start.getMonth() === range.end.getMonth();

        if (sameMonth) {
            return `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${range.end.getDate()}, ${range.end.getFullYear()}`;
        }

        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
    }

    if (range.start) {
        return `From ${formatDate(range.start)}`;
    }

    return `Until ${formatDate(range.end as Date)}`;
}

function getScrollableParent(node: HTMLElement | null): HTMLElement | Window {
    let current = node?.parentElement ?? null;

    while (current) {
        const { overflowY } = window.getComputedStyle(current);
        if (overflowY.includes('auto') || overflowY.includes('scroll') || overflowY.includes('overlay')) {
            return current;
        }
        current = current.parentElement;
    }

    return window;
}

const MobileDiscoveryView: React.FC<MobileDiscoveryViewProps> = ({
    events,
    categories,
    profile: _profile,
    onEventSelect,
    filters,
    onUpdateFilter,
    onSearch,
    totalCount,
    onResetFilters,
    activeFilterCount,
    countsFromServer,
    onNearMeClick,
    isDetectingLocation = false,
    isSearching: _isSearching = false,
}) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isHeaderCompact, setIsHeaderCompact] = useState(false);

    const [rankingMode, setRankingMode] = useLocalStorage<DiscoveryRankingMode>(MOBILE_DISCOVERY_RANKING_MODE_KEY, 'best-match');
    const [hiddenEventIds, setHiddenEventIds] = useLocalStorage<string[]>('mobile-discovery-hidden-events', []);
    const [categoryPenalty, setCategoryPenalty] = useLocalStorage<Record<string, number>>('mobile-discovery-category-penalty', {});
    const [shortlistIds, setShortlistIds] = useLocalStorage<string[]>('mobile-discovery-shortlist-ids', []);
    const [shortlistMode, setShortlistMode] = useLocalStorage<boolean>('mobile-discovery-shortlist-mode', false);

    const hiddenEventIdSet = useMemo(() => new Set(hiddenEventIds), [hiddenEventIds]);
    const shortlistIdSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);

    const { getAttendanceStatus, setAttendanceStatus } = useEventEngagement();
    const { showInfo, showError } = useSnackbar();
    const [pendingAttendanceIds, setPendingAttendanceIds] = useState<Set<string>>(new Set());

    const metrics = useDiscoveryUxMetrics({
        surface: 'mobile',
        initialRankingMode: rankingMode,
    });

    const updateFilterWithoutTelemetry: UpdateFilterHandler = useCallback((key, value) => {
        onUpdateFilter(key, value);
    }, [onUpdateFilter]);

    const updateFilterTracked: UpdateFilterHandler = useCallback((key, value) => {
        onUpdateFilter(key, value);
        metrics.trackFilterChange({
            activeFilterCount,
            changedFilter: String(key),
        });
    }, [activeFilterCount, metrics, onUpdateFilter]);

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
    }, [filters.locations, filters.popularity, metrics, onNearMeClick, onUpdateFilter, setRankingMode]);

    const rankingInitializedRef = useRef(false);
    useEffect(() => {
        if (rankingInitializedRef.current) {
            return;
        }
        rankingInitializedRef.current = true;
        applyRankingMode(rankingMode, false, false);
    }, [applyRankingMode, rankingMode]);

    useEffect(() => {
        if (!rootRef.current || typeof window === 'undefined') {
            return;
        }

        const scrollParent = getScrollableParent(rootRef.current);
        const readScroll = () => {
            const nextScrollTop = scrollParent instanceof Window ? window.scrollY : scrollParent.scrollTop;
            setIsHeaderCompact(nextScrollTop > 28);
        };

        readScroll();
        scrollParent.addEventListener('scroll', readScroll, { passive: true });

        return () => {
            scrollParent.removeEventListener('scroll', readScroll);
        };
    }, []);

    const typedEvents = useMemo(() => events as EventWithImpact[], [events]);

    const rankedEvents = useMemo(() => {
        return rankEventsByMode(typedEvents, rankingMode, {
            locationHint: filters.locations[0],
            hiddenEventIds: hiddenEventIdSet,
            categoryPenalty,
        });
    }, [typedEvents, rankingMode, filters.locations, hiddenEventIdSet, categoryPenalty]);

    const diversifiedEvents = useMemo(() => {
        return diversifyFirstViewport(rankedEvents, { viewportSize: 8 });
    }, [rankedEvents]);

    const shortlistEvents = useMemo(() => {
        return typedEvents.filter((event) => shortlistIdSet.has(event.id));
    }, [typedEvents, shortlistIdSet]);

    const eventsForFeed = shortlistMode ? shortlistEvents : diversifiedEvents;

    useEffect(() => {
        metrics.trackImpressions(eventsForFeed.length);
    }, [eventsForFeed.length, metrics]);

    const counts = useMemo(() => {
        return countsFromServer ?? calculateFilterCounts(events, categories);
    }, [countsFromServer, events, categories]);

    const handleFeedbackAction = useCallback((event: EventWithImpact, action: DiscoveryFeedbackAction) => {
        metrics.trackFeedbackAction(event.id, action);

        if (action === 'hide') {
            setHiddenEventIds((prev) => appendUnique(prev, event.id));
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
            return;
        }

        if (event.eventTypeId) {
            setCategoryPenalty((prev) => ({
                ...prev,
                [event.eventTypeId]: Math.min(60, (prev[event.eventTypeId] ?? 0) + 18),
            }));
        }
    }, [metrics, setCategoryPenalty, setHiddenEventIds]);

    const isAttending = useCallback((eventId: string) => {
        return getAttendanceStatus(eventId) === 'attending';
    }, [getAttendanceStatus]);

    const handleAttendanceToggle = useCallback(async (event: EventWithImpact) => {
        if (!event?.id || pendingAttendanceIds.has(event.id)) {
            return;
        }

        const currentlyAttending = getAttendanceStatus(event.id) === 'attending';
        setPendingAttendanceIds((prev) => new Set(prev).add(event.id));

        try {
            await setAttendanceStatus(event.id, currentlyAttending ? null : 'attending');
            metrics.trackAttendanceToggle({
                eventId: event.id,
                source: 'card_icon',
                action: currentlyAttending ? 'clear_attending' : 'set_attending',
            });
        } catch (error) {
            showError('Failed to update attendance status.');
            console.error('Failed to toggle attendance from mobile discovery card:', error);
        } finally {
            setPendingAttendanceIds((prev) => {
                const next = new Set(prev);
                next.delete(event.id);
                return next;
            });
        }
    }, [pendingAttendanceIds, getAttendanceStatus, setAttendanceStatus, metrics, showError]);

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
        setShortlistMode(false);
    }, [metrics, setShortlistIds, setShortlistMode]);

    const resetPersonalization = useCallback(() => {
        setHiddenEventIds([]);
        setCategoryPenalty({});
        metrics.trackFilterChange({ activeFilterCount, changedFilter: 'reset-personalization' });
        showInfo('Discovery personalization reset.');
    }, [activeFilterCount, metrics, setCategoryPenalty, setHiddenEventIds, showInfo]);

    const resetFiltersTracked = useCallback(() => {
        onResetFilters();
        if (rankingMode !== 'best-match') {
            setRankingMode('best-match');
            metrics.trackRankingChange('best-match');
        }
        onUpdateFilter('popularity', 'all');
        onUpdateFilter('sortBy', 'career-impact');
        onUpdateFilter('sortDirection', 'desc');
        setHiddenEventIds([]);
        setCategoryPenalty({});
        metrics.trackFilterChange({ activeFilterCount: 0, changedFilter: 'reset-all' });
    }, [metrics, onResetFilters, onUpdateFilter, rankingMode, setCategoryPenalty, setHiddenEventIds, setRankingMode]);

    const handleSearchChange = useCallback((value: string) => {
        updateFilterWithoutTelemetry('searchTerm', value);
    }, [updateFilterWithoutTelemetry]);

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
    }, [filters, updateFilterTracked]);

    const filterChips = useMemo(() => buildActiveFilterChips(filters, categories), [filters, categories]);
    const filterRailChips = useMemo(() => {
        return filterChips.map((chip) => ({
            key: chip.key,
            label: chip.label,
            onRemove: () => removeFilterChip(chip),
        }));
    }, [filterChips, removeFilterChip]);

    const visibleResultCount = shortlistMode ? shortlistEvents.length : totalCount || eventsForFeed.length;
    const locationValue = filters.locations[0] ?? '';
    const hiddenCategoryCount = Object.keys(categoryPenalty).length;
    const hasPersonalizationOverrides = hiddenEventIds.length > 0 || hiddenCategoryCount > 0;
    const hasActiveFilters = filterRailChips.length > 0;
    const dateRangeLabel = useMemo(() => formatDateRangeLabel(filters.dateRange), [filters.dateRange]);
    const datePickerCurrentDate = filters.dateRange.start ?? filters.dateRange.end ?? new Date();

    const searchSurface = (
        <div className="mobile-discovery-searchCard">
            <div className="mobile-discovery-searchRow">
                <div className="mobile-discovery-searchField">
                    <MagnifyingGlass className="mobile-discovery-searchIcon" size={18} />
                    <input
                        type="text"
                        placeholder="Search events, topics, or teams"
                        maxLength={200}
                        value={filters.searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onBlur={(e) => updateFilterTracked('searchTerm', e.target.value.trim())}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                updateFilterTracked('searchTerm', filters.searchTerm.trim());
                                onSearch();
                            }
                        }}
                        className="mobile-discovery-searchInput"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    aria-label="Open filters"
                    className="mobile-discovery-filterButton"
                    data-active={activeFilterCount > 0}
                >
                    <SlidersHorizontal size={18} weight={activeFilterCount > 0 ? 'fill' : 'regular'} />
                    {activeFilterCount > 0 ? (
                        <span className="mobile-discovery-filterBadge">{Math.min(activeFilterCount, 9)}</span>
                    ) : null}
                </button>
            </div>

            {hasActiveFilters ? (
                <div className="mt-3 border-t border-[var(--mobile-app-divider)] pt-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mobile-app-muted)]">
                            Active filters
                        </p>
                        <button
                            type="button"
                            onClick={resetFiltersTracked}
                            className="text-[11px] font-semibold text-[var(--mobile-app-muted)] transition-colors hover:text-[var(--mobile-app-muted-strong)]"
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="mobile-discovery-chipRail">
                        {filterRailChips.map((chip) => (
                            <button
                                key={chip.key}
                                type="button"
                                onClick={chip.onRemove}
                                className="mobile-discovery-chipButton"
                                aria-label={`Remove ${chip.label} filter`}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );

    return (
        <div ref={rootRef} className="mobile-discovery-view min-h-screen">
            <MobileAppShell
                headerClassName="mobile-discovery-shellHeader"
                contentClassName="mobile-discovery-shellContent"
                header={(
                    <MobileHeader
                        className="mobile-discovery-header"
                        isCompact={isHeaderCompact}
                        data-testid="mobile-discovery-header"
                    >
                        {searchSurface}

                        {shortlistMode ? (
                            <MobileSurfaceCard className="px-4 py-3">
                                <MobileSectionHeader
                                    eyebrow="Focused mode"
                                    title="Only your saved comparisons"
                                    subtitle="Exit shortlist mode to jump back into the live discovery feed."
                                    action={(
                                        <button
                                            type="button"
                                            onClick={() => setShortlistMode(false)}
                                            className="mobile-header__metaButton"
                                        >
                                            Return
                                        </button>
                                    )}
                                />
                            </MobileSurfaceCard>
                        ) : (
                            <div className="mobile-discovery-rankingRail" role="tablist" aria-label="Discovery ranking">
                                {DISCOVERY_RANKING_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => applyRankingMode(option.id)}
                                        className="mobile-discovery-rankingPill"
                                        data-active={rankingMode === option.id}
                                        role="tab"
                                        aria-selected={rankingMode === option.id}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </MobileHeader>
                )}
            >
                {eventsForFeed.length === 0 ? (
                    <MobileSurfaceCard className="mobile-discovery-emptyCard">
                        <div className="mobile-discovery-emptyCardIcon mb-4">
                            <MagnifyingGlass size={24} />
                        </div>
                        <MobileSectionHeader
                            eyebrow={shortlistMode ? 'Shortlist' : 'No matches'}
                            title={shortlistMode ? 'Your shortlist is empty here' : 'Adjust the feed and try again'}
                            subtitle={shortlistMode
                                ? 'Save a few events, then switch shortlist mode back on when you are ready to compare.'
                                : 'Broaden your search, clear a few filters, or change the ranking mode to surface more options.'
                            }
                        />
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={shortlistMode ? () => setShortlistMode(false) : resetFiltersTracked}
                                className="mobile-header__metaButton"
                            >
                                {shortlistMode ? 'Back to live feed' : 'Clear all filters'}
                            </button>
                            {!shortlistMode ? (
                                <button
                                    type="button"
                                    onClick={() => setIsFilterOpen(true)}
                                    className="mobile-header__metaButton"
                                >
                                    Open filters
                                </button>
                            ) : null}
                        </div>
                    </MobileSurfaceCard>
                ) : (
                    <div className="mobile-discovery-feed">
                        {eventsForFeed.map((event, index) => (
                            <div key={event.id} className="mobile-discovery-feedItem">
                                <DiscoveryCard
                                    event={event}
                                    onClick={() => {
                                        metrics.trackCardClick({
                                            eventId: event.id,
                                            position: index,
                                            section: shortlistMode ? 'shortlist' : 'mobile-feed',
                                        });
                                        onEventSelect?.(event);
                                    }}
                                    className="w-full mb-0"
                                    onFeedbackAction={handleFeedbackAction}
                                    onShortlistToggle={handleShortlistToggle}
                                    isInShortlist={shortlistIdSet.has(event.id)}
                                    onSaved={(savedEvent, source) => {
                                        metrics.trackSave({ eventId: savedEvent.id, source });
                                        if (source === 'swipe') {
                                            showInfo('Saved with swipe.');
                                        }
                                    }}
                                    isAttending={isAttending(event.id)}
                                    isAttendanceUpdating={pendingAttendanceIds.has(event.id)}
                                    onAttendanceToggle={handleAttendanceToggle}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </MobileAppShell>

            <MobileSheet
                open={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                title="Refine your feed"
                subtitle="Keep discovery focused without losing momentum."
                showHeader={false}
                footer={(
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={resetFiltersTracked}
                            className="min-h-12 rounded-[1rem] border border-[var(--mobile-app-surface-border)] bg-transparent px-4 text-sm font-semibold text-[var(--mobile-app-muted-strong)] transition-colors hover:bg-[var(--mobile-app-pill-bg)]"
                        >
                            Reset all
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(false)}
                            className="min-h-12 rounded-[1rem] bg-[var(--mobile-app-pill-active-text)] px-4 text-sm font-semibold text-[var(--mono-bg-main)] shadow-[0_14px_24px_rgba(2,6,23,0.18)] transition-opacity hover:opacity-90"
                        >
                            Show {visibleResultCount}
                        </button>
                    </div>
                )}
            >
                <div className="space-y-4">
                    <div className="space-y-4">
                        <MobileSectionHeader
                            title="Categories and format"
                            className="mb-4"
                        />
                        <DiscoverySidebar
                            filters={{
                                format: filters.format,
                                cost: filters.cost,
                                categories: filters.categories || [],
                                tags: filters.tags || [],
                            }}
                            onUpdateFilter={updateFilterTracked}
                            categories={categories}
                            events={events}
                            counts={counts}
                            mobileMode={true}
                        />
                    </div>

                    <div className="space-y-4">
                        <MobileSectionHeader
                            title="Location and timing"
                            className="mb-4"
                        />

                        {hasPersonalizationOverrides ? (
                            <button
                                type="button"
                                onClick={resetPersonalization}
                                className="mobile-header__metaButton mb-4"
                            >
                                Reset hidden and tuned categories ({hiddenEventIds.length + hiddenCategoryCount})
                            </button>
                        ) : null}

                        <div className="space-y-3.5">
                            <div className="space-y-1.5">
                                <label htmlFor="mobile-discovery-location" className="mobile-discovery-filterLabel">
                                    Location
                                </label>
                                <label htmlFor="mobile-discovery-location" className="mobile-discovery-filterField">
                                    <input
                                        id="mobile-discovery-location"
                                        type="text"
                                        value={locationValue}
                                        onChange={(e) => updateFilterWithoutTelemetry('locations', e.target.value ? [e.target.value] : [])}
                                        onBlur={(e) => {
                                            const trimmed = e.target.value.trim();
                                            updateFilterTracked('locations', trimmed ? [trimmed] : []);
                                        }}
                                        placeholder={isDetectingLocation ? 'Finding nearby events...' : 'City or region'}
                                        maxLength={100}
                                        className="mobile-discovery-filterInput"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => onNearMeClick?.()}
                                    className="mobile-discovery-inlineAction"
                                    disabled={isDetectingLocation}
                                >
                                    {isDetectingLocation ? 'Detecting location...' : 'Use current location'}
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="mobile-discovery-date-range" className="mobile-discovery-filterLabel">
                                    Date range
                                </label>
                                <button
                                    id="mobile-discovery-date-range"
                                    type="button"
                                    onClick={() => setIsDatePickerOpen(true)}
                                    className="mobile-discovery-filterField"
                                    aria-label="Select date range"
                                    data-empty={dateRangeLabel === 'Any date'}
                                >
                                    <span className="mobile-discovery-filterFieldValue">{dateRangeLabel}</span>
                                    <CaretRight size={14} className="mobile-discovery-filterFieldChevron" />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </MobileSheet>

            <MobileQuickDatePicker
                currentDate={datePickerCurrentDate}
                onDateChange={() => { }}
                view="month"
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                mode="range"
                dateRange={filters.dateRange}
                onDateRangeChange={(range) => updateFilterTracked('dateRange', range)}
            />

            <ShortlistCompareTray
                events={shortlistEvents}
                onRemove={removeFromShortlist}
                onClear={clearShortlist}
                onSelectEvent={(event) => {
                    metrics.trackCardClick({
                        eventId: event.id,
                        section: 'shortlist-compare',
                    });
                    onEventSelect?.(event);
                }}
            />
        </div>
    );
};

export default MobileDiscoveryView;
