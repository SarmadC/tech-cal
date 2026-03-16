'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Event, EventType, AppProfile, CareerImpactScore } from '@/types';
import DiscoveryCard from './DiscoveryCard';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { FilterCounts } from '@/utils/filterCountUtils';
import { MagnifyingGlass, SlidersHorizontal } from '@phosphor-icons/react';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
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
import { DiscoveryFeedbackAction } from '@/components/discovery/discoveryFeedback';
import { calculateFilterCounts } from '@/utils/filterCountUtils';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { useDiscoveryUxMetrics } from '@/hooks/useDiscoveryUxMetrics';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { cn } from '@/lib/utils';
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

function toDateInputValue(date: Date | null): string {
    if (!date) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string, endOfDay = false): Date | null {
    if (!value) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = endOfDay
        ? new Date(year, month - 1, day, 23, 59, 59, 999)
        : new Date(year, month - 1, day, 0, 0, 0, 0);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const MOBILE_PAGE_GUTTER = 'px-4';

const MobileDiscoveryView: React.FC<MobileDiscoveryViewProps> = ({
    events,
    categories,
    profile: _profile,
    onEventSelect,
    filters,
    onUpdateFilter,
    onSearch,
    totalCount: _totalCount,
    onResetFilters,
    activeFilterCount,
    countsFromServer,
    onNearMeClick,
    isDetectingLocation: _isDetectingLocation,
    isSearching: _isSearching
}) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [feedbackHint, setFeedbackHint] = useState<string | null>(null);
    const [explainEvent, setExplainEvent] = useState<EventWithImpact | null>(null);
    const filterDialogRef = useRef<HTMLDivElement | null>(null);

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
            setFeedbackHint('Hidden events are removed immediately from your feed.');
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
            setFeedbackHint('We are reducing similar recommendations.');
            return;
        }

        if (event.eventTypeId) {
            setCategoryPenalty((prev) => ({
                ...prev,
                [event.eventTypeId]: Math.min(60, (prev[event.eventTypeId] ?? 0) + 18),
            }));
        }
        setFeedbackHint('Preference updated. You will see fewer related events.');
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
    }, [metrics, setShortlistIds]);

    const resetPersonalization = useCallback(() => {
        setHiddenEventIds([]);
        setCategoryPenalty({});
        setFeedbackHint(null);
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
        setFeedbackHint(null);
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

    const locationValue = filters.locations[0] ?? '';
    const hiddenCategoryCount = Object.keys(categoryPenalty).length;
    const hasPersonalizationOverrides = hiddenEventIds.length > 0 || hiddenCategoryCount > 0;

    const handleDateFilterChange = useCallback((boundary: 'start' | 'end', value: string) => {
        const parsed = parseDateInputValue(value, boundary === 'end');
        const currentStart = filters.dateRange.start;
        const currentEnd = filters.dateRange.end;

        if (boundary === 'start') {
            if (parsed && currentEnd && parsed > currentEnd) {
                updateFilterTracked('dateRange', { start: parsed, end: parsed });
                return;
            }
            updateFilterTracked('dateRange', { start: parsed, end: currentEnd });
            return;
        }

        if (parsed && currentStart && parsed < currentStart) {
            updateFilterTracked('dateRange', { start: parsed, end: parsed });
            return;
        }

        updateFilterTracked('dateRange', { start: currentStart, end: parsed });
    }, [filters.dateRange.end, filters.dateRange.start, updateFilterTracked]);

    useEffect(() => {
        if (!isFilterOpen || typeof document === 'undefined') {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const frameId = window.requestAnimationFrame(() => {
            filterDialogRef.current?.focus();
        });

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsFilterOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [isFilterOpen]);

    return (
        <div className="min-h-screen bg-[var(--background-main)] pb-24 mobile-discovery-view">
            <UnifiedMobileNavbar
                navItems={APP_MOBILE_NAV_ITEMS}
                fixed={false}
                className="sticky top-0 z-40 bg-[var(--background-main)]/95 backdrop-blur-md"
            />

            <div className={cn('sticky top-[56px] z-30 bg-[var(--background-main)]/95 backdrop-blur-md pt-3 pb-3 space-y-4', MOBILE_PAGE_GUTTER)}>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <MagnifyingGlass
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)] group-focus-within:text-[var(--foreground-primary)] transition-colors"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search..."
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
                            className="w-full bg-[var(--background-elevated)]/50 rounded-xl py-2.5 pl-10 pr-4 text-[15px] text-[var(--foreground-primary)] placeholder:text-[var(--foreground-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)] transition-all h-[44px]"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsFilterOpen(true)}
                        aria-label="Open filters"
                        className={cn(
                            'h-[44px] w-[44px] rounded-xl inline-flex items-center justify-center transition-colors',
                            activeFilterCount > 0
                                ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                                : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-elevated)]'
                        )}
                    >
                        <SlidersHorizontal size={18} weight={activeFilterCount > 0 ? 'fill' : 'regular'} />
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 pl-0 [scrollbar-width:thin]">
                    {DISCOVERY_RANKING_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => applyRankingMode(option.id)}
                            className={cn(
                                'h-8 px-3 text-xs whitespace-nowrap inline-flex items-center transition-colors',
                                rankingMode === option.id
                                    ? 'border-b-2 border-[var(--border-strong)] text-[var(--foreground-primary)]'
                                    : 'border-b-0 text-[#999999] hover:text-[var(--foreground-primary)]'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <ActiveFilterRail
                    chips={filterRailChips}
                    onClearAll={resetFiltersTracked}
                    className={cn('top-[120px]', MOBILE_PAGE_GUTTER)}
                />

            </div>

            {isFilterOpen && (
                <div className="fixed inset-0 z-[140] flex flex-col justify-end isolate">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsFilterOpen(false)}
                    />

                    <div
                        ref={filterDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mobile-discovery-filters-title"
                        tabIndex={-1}
                        className="relative w-full h-[85vh] bg-card rounded-t-[24px] border-t border-border flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
                    >
                        <div className={cn('flex items-center justify-between py-4 border-b border-border', MOBILE_PAGE_GUTTER)}>
                            <h2 id="mobile-discovery-filters-title" className="text-xl font-semibold text-foreground">Filters</h2>
                            <button
                                type="button"
                                onClick={() => setIsFilterOpen(false)}
                                className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className={cn('flex-1 overflow-y-auto py-4', MOBILE_PAGE_GUTTER)}>
                            <DiscoverySidebar
                                filters={{
                                    format: filters.format,
                                    cost: filters.cost,
                                    categories: filters.categories || [],
                                    tags: filters.tags || []
                                }}
                                onUpdateFilter={updateFilterTracked}
                                categories={categories}
                                events={events}
                                counts={counts}
                                mobileMode={true}
                            />

                            <div className="mt-6 space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">Advanced filters</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Manage restored location, date, and preference filters.
                                    </p>
                                </div>

                                {hasPersonalizationOverrides && (
                                    <button
                                        type="button"
                                        onClick={resetPersonalization}
                                        className="w-full rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-left text-xs text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        Reset hidden and recommendation tuning
                                        <span className="ml-1 text-muted-foreground">
                                            ({hiddenEventIds.length} hidden, {hiddenCategoryCount} tuned categories)
                                        </span>
                                    </button>
                                )}

                                <div className="space-y-1.5">
                                    <label htmlFor="mobile-discovery-location" className="text-xs font-medium text-muted-foreground">Location</label>
                                    <input
                                        id="mobile-discovery-location"
                                        type="text"
                                        value={locationValue}
                                        onChange={(e) => updateFilterWithoutTelemetry('locations', e.target.value ? [e.target.value] : [])}
                                        onBlur={(e) => {
                                            const trimmed = e.target.value.trim();
                                            updateFilterTracked('locations', trimmed ? [trimmed] : []);
                                        }}
                                        placeholder="City or region"
                                        maxLength={100}
                                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border-strong"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label htmlFor="mobile-discovery-start-date" className="text-xs font-medium text-muted-foreground">Start date</label>
                                        <input
                                            id="mobile-discovery-start-date"
                                            type="date"
                                            value={toDateInputValue(filters.dateRange.start)}
                                            onChange={(e) => handleDateFilterChange('start', e.target.value)}
                                            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-border-strong"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="mobile-discovery-end-date" className="text-xs font-medium text-muted-foreground">End date</label>
                                        <input
                                            id="mobile-discovery-end-date"
                                            type="date"
                                            value={toDateInputValue(filters.dateRange.end)}
                                            onChange={(e) => handleDateFilterChange('end', e.target.value)}
                                            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-border-strong"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                                    <label className="flex items-center justify-between gap-3 text-sm text-foreground">
                                        <span>Recommended only</span>
                                        <input
                                            type="checkbox"
                                            checked={filters.recommended}
                                            onChange={(e) => updateFilterTracked('recommended', e.target.checked)}
                                            className="h-4 w-4 rounded border-border"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 text-sm text-foreground">
                                        <span>Tracked events only</span>
                                        <input
                                            type="checkbox"
                                            checked={filters.myTracked}
                                            onChange={(e) => updateFilterTracked('myTracked', e.target.checked)}
                                            className="h-4 w-4 rounded border-border"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-3 text-sm text-foreground">
                                        <span>My network only</span>
                                        <input
                                            type="checkbox"
                                            checked={filters.myNetwork}
                                            onChange={(e) => updateFilterTracked('myNetwork', e.target.checked)}
                                            className="h-4 w-4 rounded border-border"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-card pb-8 flex gap-3">
                            <button
                                type="button"
                                onClick={resetFiltersTracked}
                                className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-black text-white font-bold hover:bg-black/90 dark:bg-[#fdfdfd] dark:text-gray-900 dark:hover:bg-[#fdfdfd]/90 shadow-lg transition-colors"
                            >
                                Show Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={cn('py-4 space-y-4', MOBILE_PAGE_GUTTER)}>
                {eventsForFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--background-elevated)] flex items-center justify-center mb-4">
                            <MagnifyingGlass size={32} className="text-[var(--foreground-tertiary)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--foreground-primary)] mb-2">
                            {shortlistMode ? 'No shortlisted events in current results' : 'No events found'}
                        </h3>
                        <p className="text-[var(--foreground-secondary)] max-w-xs">
                            {shortlistMode
                                ? 'Add events to your shortlist, then enable compare mode to see them here.'
                                : 'Try adjusting your filters or search terms to find what you\'re looking for.'}
                        </p>
                        <button
                            type="button"
                            onClick={shortlistMode ? () => setShortlistMode(false) : resetFiltersTracked}
                            className="mt-6 px-6 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-foreground)] font-semibold text-sm hover:opacity-90"
                        >
                            {shortlistMode ? 'Exit shortlist mode' : 'Clear all filters'}
                        </button>
                    </div>
                ) : (
                    eventsForFeed.map((event, index) => (
                        <DiscoveryCard
                            key={event.id}
                            event={event}
                            onClick={() => {
                                metrics.trackCardClick({
                                    eventId: event.id,
                                    position: index,
                                    section: shortlistMode ? 'shortlist' : 'mobile-feed',
                                });
                                onEventSelect?.(event);
                            }}
                            className="w-full"
                            onFeedbackAction={handleFeedbackAction}
                            onExplainRecommendation={setExplainEvent}
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
                    ))
                )}
            </div>

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
