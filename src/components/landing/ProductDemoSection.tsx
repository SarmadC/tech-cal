'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import MockEventDetailPanel from '@/components/calendar/MockEventDetailPanel';
import DiscoveryLayout from '@/components/discovery/DiscoveryLayout';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import EventCard from '@/components/discovery/EventCard';
import DemoCalendarView from './DemoCalendarView';
import { MOCK_EVENTS, MOCK_CATEGORIES, MOCK_MANAGER_JUSTIFICATION_MAP } from './MockData';
import { seedManagerJustificationCache } from '@/components/calendar/ManagerJustificationModal';
import { UnifiedFilterOptions, UpdateFilterHandler, createDefaultUnifiedFilters } from '@/hooks/useUnifiedServerFiltering';
import { calculateFilterCounts, normalizeEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Event } from '@/types';

type DemoTab = 'discovery' | 'calendar';

interface DemoPersonaPreset {
    id: 'frontend' | 'ai' | 'founder';
    label: string;
    rationale: string;
    filters: Partial<UnifiedFilterOptions>;
}

const DEMO_PERSONAS: DemoPersonaPreset[] = [
    {
        id: 'frontend',
        label: 'Frontend Engineer',
        rationale: 'Shows virtual events about UI frameworks, frontend tooling, and hands-on product sessions.',
        filters: {
            searchTerm: 'frontend',
            format: 'virtual',
            sortBy: 'date',
            sortDirection: 'asc',
        },
    },
    {
        id: 'ai',
        label: 'AI Engineer',
        rationale: 'Surfaces AI sessions, model tooling workshops, and high-impact career events, sorted by career relevance.',
        filters: {
            searchTerm: 'ai',
            format: 'all',
            sortBy: 'career-impact',
            sortDirection: 'desc',
        },
    },
    {
        id: 'founder',
        label: 'Founder',
        rationale: 'Free networking events, launch showcases, and investor-facing meetups, sorted by popularity.',
        filters: {
            searchTerm: 'networking',
            cost: 'free',
            sortBy: 'popularity',
            sortDirection: 'desc',
        },
    },
];

type EventWithImpactPreview = Event & { careerImpact?: { overall?: number } };

const getDefaultDemoFilters = (overrides: Partial<UnifiedFilterOptions> = {}): UnifiedFilterOptions =>
    createDefaultUnifiedFilters({
        pageSize: 12,
        sortBy: 'date',
        sortDirection: 'asc',
        format: 'hybrid',
        ...overrides,
    });

const getCareerImpactOverall = (event: Event): number =>
    (event as EventWithImpactPreview).careerImpact?.overall ?? 0;

export default function ProductDemoSection() {
    const [activeTab, setActiveTab] = useState<DemoTab>('discovery');
    const [filters, setFilters] = useState<UnifiedFilterOptions>(() => getDefaultDemoFilters());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(() => new Set());
    const [activePersonaId, setActivePersonaId] = useState<DemoPersonaPreset['id'] | null>(null);

    const { showInfo } = useSnackbar();

    useEffect(() => {
        MOCK_MANAGER_JUSTIFICATION_MAP.forEach((data, eventId) => {
            seedManagerJustificationCache(eventId, data);
        });
    }, []);

    const activePersona = useMemo(
        () => DEMO_PERSONAS.find((preset) => preset.id === activePersonaId) ?? null,
        [activePersonaId]
    );

    const activeFilterCount = useMemo(() => [
        filters.searchTerm ? 1 : 0,
        filters.locations.length > 0 ? 1 : 0,
        filters.format !== 'all' ? 1 : 0,
        filters.cost !== 'all' ? 1 : 0,
        filters.categories.length > 0 ? 1 : 0,
        filters.tags.length > 0 ? 1 : 0,
        (filters.dateRange.start || filters.dateRange.end) ? 1 : 0
    ].reduce((a, b) => a + b, 0), [filters]);

    const filteredEvents = useMemo(() => MOCK_EVENTS.filter((event) => {
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            const inTitle = event.title.toLowerCase().includes(term);
            const inDesc = event.description?.toLowerCase().includes(term);
            const inTags = (event.tags || []).some((tag) => tag.name?.toLowerCase().includes(term));
            if (!inTitle && !inDesc && !inTags) {
                return false;
            }
        }

        if (filters.locations.length > 0) {
            const location = event.location.toLowerCase();
            const hasLocationMatch = filters.locations.some((selectedLocation) =>
                location.includes(selectedLocation.toLowerCase())
            );
            if (!hasLocationMatch) {
                return false;
            }
        }

        if (filters.dateRange.start || filters.dateRange.end) {
            const eventDate = new Date(event.startTime);

            if (filters.dateRange.start) {
                const start = new Date(filters.dateRange.start);
                start.setHours(0, 0, 0, 0);
                if (eventDate < start) {
                    return false;
                }
            }

            if (filters.dateRange.end) {
                const end = new Date(filters.dateRange.end);
                end.setHours(23, 59, 59, 999);
                if (eventDate > end) {
                    return false;
                }
            }
        }

        if (filters.format !== 'all') {
            const eventFormat = normalizeEventFormat(event.eventFormat);
            if (eventFormat !== filters.format) {
                return false;
            }
        }

        if (filters.cost !== 'all') {
            const isFreeEvent = isEventFree(event);
            if (filters.cost === 'free' && !isFreeEvent) {
                return false;
            }
            if (filters.cost === 'paid' && isFreeEvent) {
                return false;
            }
        }

        if (filters.categories.length > 0) {
            const eventCategoryId = event.eventTypeId || event.category?.id;
            if (!eventCategoryId || !filters.categories.includes(eventCategoryId)) {
                return false;
            }
        }

        if (filters.tags.length > 0) {
            const eventTags = (event.tags || []).map((tag) => tag.name?.toLowerCase().trim()).filter(Boolean);
            const filterTags = filters.tags.map((tag) => tag.toLowerCase().trim());
            const hasMatchingTag = filterTags.some((filterTag) =>
                eventTags.some((eventTag) => eventTag === filterTag)
            );
            if (!hasMatchingTag) {
                return false;
            }
        }

        return true;
    }), [filters]);

    const sortedEvents = useMemo(() => {
        const next = [...filteredEvents];

        switch (filters.sortBy) {
            case 'popularity':
                return next.sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0));
            case 'career-impact':
                return next.sort((a, b) => getCareerImpactOverall(b) - getCareerImpactOverall(a));
            case 'title':
                return next.sort((a, b) => a.title.localeCompare(b.title));
            case 'location':
                return next.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
            case 'default':
            case 'date':
            default:
                return next.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        }
    }, [filteredEvents, filters.sortBy]);

    const displayCounts = useMemo(
        () => calculateFilterCounts(MOCK_EVENTS, MOCK_CATEGORIES),
        []
    );

    const visibleEvents = sortedEvents;

    const activeSelectedEvent = selectedEvent;

    const handleUpdateFilter: UpdateFilterHandler = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleApplyPersona = (persona: DemoPersonaPreset) => {
        setActivePersonaId(persona.id);
        setFilters(getDefaultDemoFilters(persona.filters));
        showInfo(`Applied ${persona.label} preset.`, 3500);
    };

    const handleClearPersona = () => {
        setActivePersonaId(null);
        setFilters(getDefaultDemoFilters());
    };

    const handleBookmark = (event: Event) => {
        const alreadyBookmarked = bookmarkedEventIds.has(event.id);

        setBookmarkedEventIds((prev) => {
            const next = new Set(prev);
            if (alreadyBookmarked) {
                next.delete(event.id);
            } else {
                next.add(event.id);
            }
            return next;
        });

        showInfo(
            alreadyBookmarked
                ? `Removed "${event.title}" from bookmarks (demo only).`
                : `Saved "${event.title}" to bookmarks (demo only).`,
            3500
        );
    };

    const handleResetDemo = () => {
        setFilters(getDefaultDemoFilters());
        setSelectedEvent(null);
        setBookmarkedEventIds(new Set());
        setActivePersonaId(null);
        showInfo('Demo reset to default state.', 3000);
    };

    return (
        <section id="product-demo" className="product-demo-section relative w-full overflow-hidden bg-background flex flex-col items-center justify-center px-4 sm:px-6 py-20 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_0)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:60px_60px]" />
            <div className="absolute h-full w-full bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />

            <div className="container mx-auto px-0 sm:px-4 relative z-10">
                <div className="text-center max-w-4xl mx-auto mb-12">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        <span className="text-gradient-mono">Try the real product</span>
                    </h2>

                    <p className="text-lg text-muted-foreground leading-relaxed whitespace-nowrap">
                        This is the actual UI, loaded with sample data. Search, filter, and inspect full event details
                    </p>


                    {/* ── Persona presets (Discovery only) ─────────────── */}
                    {activeTab === 'discovery' && (
                        <>
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                {DEMO_PERSONAS.map((persona) => (
                                    <button
                                        key={persona.id}
                                        type="button"
                                        onClick={() => handleApplyPersona(persona)}
                                        className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${activePersonaId === persona.id
                                            ? 'border-primary/60 bg-primary/15 text-foreground'
                                            : 'border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-accent/30'
                                            }`}
                                    >
                                        {persona.label}
                                    </button>
                                ))}
                                {activePersonaId && (
                                    <button
                                        type="button"
                                        onClick={handleClearPersona}
                                        className="px-3.5 py-2 rounded-full text-xs font-medium border border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
                                    >
                                        Clear Persona
                                    </button>
                                )}
                            </div>
                            {activePersona && (
                                <p className="mt-3 text-sm text-muted-foreground">
                                    {activePersona.rationale}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="w-full max-w-[1400px] mx-auto">

                {/* ── Tabs sticking out of the demo container ─────────── */}
                <div className="flex items-end gap-px pl-8 relative z-10">
                    {(['discovery', 'calendar'] as const).map(tab => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-t-xl border transition-all duration-200 capitalize ${
                                activeTab === tab
                                    ? 'bg-card/95 dark:bg-[#0a0a0a]/80 border-border/70 dark:border-white/10 border-b-transparent text-foreground translate-y-px'
                                    : 'bg-transparent border-border/40 dark:border-white/5 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab === 'discovery' ? 'Discovery' : 'Calendar'}
                        </button>
                    ))}
                </div>

            <div className="product-demo-shell relative group perspective-1000">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-[35px] blur-xl opacity-30 dark:opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

                <div className="product-demo-frame relative rounded-[32px] border border-border/70 dark:border-white/10 shadow-2xl bg-card/95 dark:bg-[#0a0a0a]/80 backdrop-blur-xl overflow-hidden transform transition-all duration-700 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(0,0,0,0.45)] dark:hover:shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-colors">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-30 dark:opacity-60" />

                    <div className="product-demo-content p-2 md:p-4 lg:p-6 opacity-95 hover:opacity-100 transition-opacity">
                        {activeTab === 'discovery' ? (
                            <DiscoveryLayout
                                className="min-h-0 product-demo-layout product-demo-contrast"
                                minHeightClassName="min-h-0"
                                isSidebarOpen={isSidebarOpen}
                                onSidebarClose={() => setIsSidebarOpen(false)}
                                gridClassName="product-demo-grid"
                                sidebar={
                                    <DiscoverySidebar
                                        filters={{
                                            format: filters.format,
                                            cost: filters.cost,
                                            categories: filters.categories,
                                            tags: filters.tags
                                        }}
                                        onUpdateFilter={handleUpdateFilter}
                                        categories={MOCK_CATEGORIES}
                                        events={sortedEvents}
                                        counts={displayCounts}
                                    />
                                }
                                header={
                                    <DiscoveryHeader
                                        searchTerm={filters.searchTerm}
                                        onSearchChange={(value) => handleUpdateFilter('searchTerm', value)}
                                        location={filters.locations[0] || ''}
                                        onLocationChange={(value) => handleUpdateFilter('locations', value ? [value] : [])}
                                        dateRange={filters.dateRange}
                                        onDateRangeChange={(range) => handleUpdateFilter('dateRange', range)}
                                        onSearch={() => { }}
                                        onResetFilters={handleClearPersona}
                                        activeFilterCount={activeFilterCount}
                                        onFilterClick={() => setIsSidebarOpen(true)}
                                        isDetectingLocation={false}
                                    />
                                }
                                resultCount={visibleEvents.length}
                                actionControls={
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleResetDemo}
                                            className="product-demo-reset-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-primary/45 bg-primary/12 text-foreground text-xs font-medium hover:border-primary/70 hover:bg-primary/20 transition-colors"
                                        >
                                            <ArrowCounterClockwise size={12} weight="bold" />
                                            Reset demo state
                                        </button>
                                    </div>
                                }
                            >
                                {visibleEvents.length === 0 ? (
                                    <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/70 p-6 text-center bg-card/40">
                                        <h3 className="text-base font-semibold text-foreground">No events in this view</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Adjust filters or reset persona to repopulate the demo instantly.
                                        </p>
                                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleClearPersona}
                                                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                                            >
                                                Reset filters
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    visibleEvents.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onClick={() => setSelectedEvent(event)}
                                            onBookmark={handleBookmark}
                                            isBookmarked={bookmarkedEventIds.has(event.id)}
                                            showWeekday={false}
                                            whiteLogoBackgroundInDark
                                            showActionControls
                                            showShortlistAction={false}
                                            showRecommendationContext
                                        />
                                    ))
                                )}
                            </DiscoveryLayout>
                        ) : (
                            <div
                                className="product-demo-calendar"
                                style={{ minHeight: '600px', ['--demo-day-height' as string]: '130px' }}
                            >
                                <DemoCalendarView
                                    onEventSelect={(event) => setSelectedEvent(event)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>{/* end tabs + demo wrapper */}

            <MockEventDetailPanel
                isOpen={Boolean(activeSelectedEvent)}
                onClose={() => setSelectedEvent(null)}
                event={activeSelectedEvent ?? undefined}
                categories={MOCK_CATEGORIES}
            />
        </section>
    );
}
