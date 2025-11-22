'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { CalendarBlank, FunnelSimple, Repeat } from '@phosphor-icons/react';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import Navbar from '@/components/common/Navbar';
import MobileNavbar from '@/components/common/MobileNavbar';
import { Button } from '@/components/ui/button';
import MultiSelectDropdown, { MultiSelectOption } from '@/components/ui/MultiSelectDropdown';
import { AdminDataTable, AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { AdminToolbarProvider } from '@/contexts/AdminToolbarContext';
import type { EventType, AppProfile, TrackedEvent } from '@/types';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { Badge } from '@/components/ui/badge';
import { generateEventSlug } from '@/utils/slugUtils';
import Loading from '@/components/Loading';
import { useIsMobile } from '@/hooks/useDeviceDetection';

interface EventListViewProps {
    initialCategories: EventType[];
    profile: AppProfile | null;
    locationOptions: string[];
}

interface EventRow {
    id: string;
    title: string;
    organizer: string;
    startDisplay: string;
    endDisplay?: string | null;
    location: string;
    categoryLabel?: string;
    categoryColor?: string;
    priceRange?: string | null;
    status: string;
    slug: string;
    event: TrackedEvent;
}

function toInputValue(date: Date | null): string {
    if (!date) return '';
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const EventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> },
);

const MobileEventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileEventDetailPanel'),
    { loading: () => <Loading /> },
);

export default function EventListView({ initialCategories, profile, locationOptions }: EventListViewProps) {
    const startOfToday = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const initialFilters = useMemo(() => ({
        sortBy: 'date' as const,
        sortDirection: 'asc' as const,
        pageSize: 20,
        dateRange: { start: startOfToday, end: null as Date | null },
    }), [startOfToday]);

    const categoryOptions = useMemo<MultiSelectOption[]>(() => initialCategories.map((category) => ({
        value: category.id,
        label: category.name,
    })), [initialCategories]);

    const locationSelectOptions = useMemo<MultiSelectOption[]>(() => locationOptions.map((value) => ({
        value,
        label: value,
    })), [locationOptions]);

    const {
        filteredEvents,
        isLoading,
        error,
        filters,
        activeFilterCount,
        updateFilter,
        resetFilters,
        refetch,
        pagination,
        totalCount,
    } = useUnifiedServerFiltering(profile, initialFilters, { surface: 'discover' });

    const [selectedEvent, setSelectedEvent] = useState<TrackedEvent | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const isMobile = useIsMobile();

    const rows: EventRow[] = useMemo(() => filteredEvents.map((event: TrackedEvent) => {
        const startDisplay = formatDate(event.startTime, event.timezone);
        const timeDisplay = formatTime(event.startTime, event.timezone);
        const endDisplay = event.endTime ? formatTime(event.endTime, event.timezone) : null;
        const slug = generateEventSlug(event.title, event.id);
        return {
            id: event.id,
            title: event.title,
            organizer: event.organizer,
            startDisplay: `${startDisplay} · ${timeDisplay}`,
            endDisplay,
            location: event.location || 'TBD',
            categoryLabel: event.category?.name,
            categoryColor: event.category?.color,
            priceRange: event.priceRange,
            status: event.status,
            slug,
            event,
        };
    }), [filteredEvents]);

    const handleOpenDetails = useCallback((event: TrackedEvent) => {
        setIsClosing(false);
        setSelectedEvent(event);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setIsClosing(true);
        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            setSelectedEvent(null);
            setIsClosing(false);
        }, 300); // Match the animation duration
    }, []);

    const columns: AdminDataTableColumn<EventRow>[] = useMemo(() => [
        {
            key: 'title',
            header: 'Event',
            sortable: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground-primary">{row.title}</span>
                    <span className="text-xs text-foreground-secondary">{row.organizer}</span>
                </div>
            ),
            width: '35%',
        },
        {
            key: 'startDisplay',
            header: 'Start',
            sortable: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm text-foreground-primary">{row.startDisplay}</span>
                    {row.endDisplay && (
                        <span className="text-xs text-foreground-secondary">Ends {row.endDisplay}</span>
                    )}
                </div>
            ),
            width: '25%',
        },
        {
            key: 'location',
            header: 'Location',
            sortable: true,
            render: (row) => (
                <span className="text-sm text-foreground-primary">{row.location}</span>
            ),
            width: '20%',
        },
        {
            key: 'category',
            header: 'Category',
            render: (row) => (
                row.categoryLabel ? (
                    <Badge
                        style={{
                            backgroundColor: `${row.categoryColor ?? 'var(--accent-primary)'}33`,
                            color: row.categoryColor ?? 'var(--accent-primary)',
                        }}
                        className="rounded-full text-xs font-medium px-2 py-1"
                    >
                        {row.categoryLabel}
                    </Badge>
                ) : (
                    <span className="text-sm text-foreground-secondary">—</span>
                )
            ),
            width: '20%',
        },
    ], []);

    const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
        switch (key) {
            case 'title':
                updateFilter('sortBy', 'title');
                break;
            case 'location':
                updateFilter('sortBy', 'location');
                break;
            case 'startDisplay':
            default:
                updateFilter('sortBy', 'date');
                break;
        }
        updateFilter('sortDirection', direction);
        updateFilter('page', 1);
    };

    const appliedFiltersLabel = activeFilterCount > 0 ? `${activeFilterCount} filters applied` : 'No filters applied';

    const pageSizeOptions = useMemo(() => {
        const base = new Set<number>([10, 20, 50, 100, pagination.pageSize]);
        return Array.from(base).filter((value) => value > 0).sort((a, b) => a - b);
    }, [pagination.pageSize]);

    const handlePageSizeChange = useCallback((size: number) => {
        updateFilter('page', 1);
        updateFilter('pageSize', size);
    }, [updateFilter]);

    const handlePageChange = useCallback((page: number) => {
        const nextPage = Math.max(1, Math.min(page, pagination.totalPages));
        updateFilter('page', nextPage);
    }, [pagination.totalPages, updateFilter]);

    const hasResults = totalCount > 0 && rows.length > 0;
    const rangeStart = hasResults ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
    const rangeEnd = hasResults ? Math.min(rangeStart + rows.length - 1, totalCount) : 0;

    const tableSortKey = useMemo(() => {
        switch (filters.sortBy) {
            case 'title':
                return 'title';
            case 'location':
                return 'location';
            case 'default':
            case 'date':
            default:
                return 'startDisplay';
        }
    }, [filters.sortBy]);

    const sortLabel = useMemo(() => {
        const direction = filters.sortDirection === 'desc';
        switch (filters.sortBy) {
            case 'title':
                return direction ? 'Event (Z→A)' : 'Event (A→Z)';
            case 'location':
                return direction ? 'Location (Z→A)' : 'Location (A→Z)';
            case 'popularity':
                return direction ? 'Popularity (low first)' : 'Popularity (high first)';
            case 'career-impact':
                return direction ? 'Career impact (low first)' : 'Career impact (high first)';
            case 'default':
            case 'date':
            default:
                return direction ? 'Start date (Newest first)' : 'Start date (Soonest first)';
        }
    }, [filters.sortBy, filters.sortDirection]);

    return (
        <SidebarProvider>
            <MobileNavbar />
            <div className="flex h-screen bg-background">
                <AppSidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />
                    <div className="flex-1 overflow-auto">
                        <div className="min-h-screen glass-bg-gradient relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/10 dark:from-black/0 dark:via-white/5 dark:to-white/10 pointer-events-none" />
                            <div className="relative max-w-[1600px] mx-auto px-6 pt-16 pb-8 space-y-6">
                                <header className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                                            <CalendarBlank weight="bold" size={20} />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-semibold text-foreground-primary">Event Listings</h1>
                                            <p className="text-sm text-foreground-secondary">
                                                Browse and organize upcoming events with advanced filtering controls.
                                            </p>
                                        </div>
                                    </div>
                                </header>

                                <section
                                    className="glass-card border border-white/10 p-6 shadow-2xl space-y-4"
                                    aria-labelledby="event-filters"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                            <FunnelSimple size={16} />
                                            <span id="event-filters">{appliedFiltersLabel}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                resetFilters();
                                            }}
                                        >
                                            <Repeat size={16} className="mr-2" />
                                            Reset
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="start-date" className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">Start Date</label>
                                            <input
                                                id="start-date"
                                                type="date"
                                                value={toInputValue(filters.dateRange.start)}
                                                onChange={(event) => {
                                                    const value = event.target.value ? new Date(`${event.target.value}T00:00:00`) : null;
                                                    updateFilter('dateRange', { start: value, end: filters.dateRange.end });
                                                    updateFilter('page', 1);
                                                }}
                                                className="rounded-lg border border-border-color/60 bg-background-secondary/70 px-3 py-2 text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/60 focus:border-accent-primary/60 transition-colors"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label htmlFor="end-date" className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">End Date</label>
                                            <input
                                                id="end-date"
                                                type="date"
                                                value={toInputValue(filters.dateRange.end)}
                                                onChange={(event) => {
                                                    const value = event.target.value ? new Date(`${event.target.value}T23:59:59`) : null;
                                                    updateFilter('dateRange', { start: filters.dateRange.start, end: value });
                                                    updateFilter('page', 1);
                                                }}
                                                className="rounded-lg border border-border-color/60 bg-background-secondary/70 px-3 py-2 text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/60 focus:border-accent-primary/60 transition-colors"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <MultiSelectDropdown
                                                label="Categories"
                                                options={categoryOptions}
                                                selectedValues={filters.categories}
                                                onChange={(values) => {
                                                    updateFilter('categories', values);
                                                    updateFilter('page', 1);
                                                }}
                                                placeholder="Select categories"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <MultiSelectDropdown
                                                label="Locations"
                                                options={locationSelectOptions}
                                                selectedValues={filters.locations}
                                                onChange={(values) => {
                                                    updateFilter('locations', values);
                                                    updateFilter('page', 1);
                                                }}
                                                placeholder="Select locations"
                                                className="bg-transparent"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-foreground-secondary">
                                                Showing {rangeStart}-{rangeEnd} of {totalCount} events
                                            </p>
                                            {error && (
                                                <p className="text-xs text-destructive mt-1">
                                                    Failed to refresh events.{' '}
                                                    <button className="underline" onClick={() => refetch()}>Try again</button>
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                                            <span>Sorted by</span>
                                            <Badge variant="outline" className="border-border-color/60 bg-background-secondary/60 text-foreground-secondary">
                                                {sortLabel}
                                            </Badge>
                                        </div>
                                    </div>

                                    <AdminToolbarProvider>
                                    <AdminDataTable<EventRow>
                                            columns={columns}
                                            rows={rows}
                                            getRowId={(row) => row.id}
                                            sortKey={tableSortKey}
                                            sortDirection={filters.sortDirection}
                                            onSortChange={handleSortChange}
                                            isLoading={isLoading}
                                            onRowClick={(row) => handleOpenDetails(row.event)}
                                            className="glass-card border border-white/10 px-6 py-6 text-foreground-primary backdrop-blur-xl"
                                            containerClassName="glass-card border border-white/10 bg-white/[0.04] backdrop-blur-xl [&_thead]:bg-white/[0.08] [&_tbody_tr]:border-white/[0.05] [&_tbody_tr:hover]:bg-white/[0.06]"
                                            footerClassName="glass-card border border-white/10 bg-white/[0.04] text-foreground-secondary"
                                            tableClassName="text-foreground-primary"
                                            headerClassName="bg-transparent text-foreground-secondary"
                                            headerRowClassName="border-white/[0.06]"
                                            bodyRowClassName="border-white/[0.04] hover:bg-white/[0.06] text-foreground-primary"
                                            pageSize={pagination.pageSize}
                                            pageSizeOptions={pageSizeOptions}
                                            onPageSizeChange={handlePageSizeChange}
                                            page={pagination.page}
                                            onPageChange={handlePageChange}
                                            total={totalCount}
                                            emptyState={(
                                                <div className="py-12 text-center">
                                                    <h3 className="text-lg font-semibold text-foreground-primary mb-2">No events match the current filters</h3>
                                                    <p className="text-sm text-foreground-secondary mb-4">
                                                        Adjust your date range, categories, or locations to discover more events.
                                                    </p>
                                                    <Button size="sm" onClick={() => { resetFilters(); }}>
                                                        Reset filters
                                                    </Button>
                                                </div>
                                            )}
                                        />
                                    </AdminToolbarProvider>

                                </section>
                            </div>
                        </div>
                    </div>
                </main>

                {selectedEvent && (
                    <>
                        {isMobile ? (
                            <MobileEventDetailPanelDynamic
                                event={selectedEvent}
                                categories={initialCategories}
                                onClose={handleCloseDetails}
                            />
                        ) : (
                            <div
                                className={`fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
                                    isClosing ? 'opacity-0' : 'opacity-100'
                                }`}
                                onClick={handleCloseDetails}
                                role="presentation"
                            >
                                <div
                                    className={`h-full w-full sm:w-[28rem] md:w-[40rem] lg:w-[48rem] xl:w-[56rem] max-w-[95vw] transform translate-x-0 duration-300 ease-out ${
                                        isClosing 
                                            ? 'animate-out slide-out-to-right' 
                                            : 'animate-in slide-in-from-right'
                                    }`}
                                    onClick={(event) => event.stopPropagation()}
                                    role="dialog"
                                    aria-modal="true"
                                    aria-label="Event details"
                                >
                                    <EventDetailPanelDynamic
                                        event={selectedEvent}
                                        categories={initialCategories}
                                        onClose={handleCloseDetails}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </SidebarProvider>
    );
}

