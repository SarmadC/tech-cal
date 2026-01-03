'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { cn } from '@/lib/utils';
import type { EventListItem } from './page';

const COLUMNS_STORAGE_KEY = 'techcal.admin.events.columns';

type ColumnVisibility = {
    startTime: boolean;
    location: boolean;
    eventType: boolean;
    sourceUrl: boolean;
};

interface AllEventsListClientProps {
    initialEvents: EventListItem[];
    initialTotal: number;
    initialPageSize: number;
}

export default function AllEventsListClient({
    initialEvents,
    initialTotal,
    initialPageSize,
}: AllEventsListClientProps) {
    const router = useRouter();
    const [events, setEvents] = useState<EventListItem[]>(initialEvents);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [searchValue, setSearchValue] = useState('');
    const [sortBy, setSortBy] = useState('start_time');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [loading, setLoading] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
        startTime: true,
        location: true,
        eventType: true,
        sourceUrl: true,
    });
    const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
    const columnsPanelRef = useRef<HTMLDivElement>(null);

    const { setTitle, setSubtitle } = useAdminToolbar();
    const { showError } = useSnackbar();

    // Load column visibility from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored) as Partial<ColumnVisibility>;
            setVisibleColumns((prev) => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(parsed).map(([key, value]) => [key, Boolean(value)])
                ) as ColumnVisibility,
            }));
        } catch {
            // ignore parse errors
        }
    }, []);

    // Save column visibility to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Close columns panel on outside click
    useEffect(() => {
        if (!columnsPanelOpen) return;
        const handleClick = (event: MouseEvent) => {
            if (columnsPanelRef.current && !columnsPanelRef.current.contains(event.target as Node)) {
                setColumnsPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [columnsPanelOpen]);

    const toggleColumnVisibility = useCallback((key: keyof ColumnVisibility) => {
        setVisibleColumns((prev) => {
            const activeCount = Object.values(prev).filter(Boolean).length;
            const nextValue = !prev[key];
            if (!nextValue && activeCount <= 1) {
                return prev; // Prevent hiding all columns
            }
            return {
                ...prev,
                [key]: nextValue,
            };
        });
    }, []);

    useEffect(() => {
        setTitle('All Events');
        setSubtitle('View and manage all events in the database');
    }, [setSubtitle, setTitle]);

    // Fetch events from API
    const fetchEvents = useCallback(
        async (options?: { newPage?: number; newPageSize?: number; newSearch?: string; newSortBy?: string; newSortOrder?: 'asc' | 'desc' }) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: String(options?.newPage ?? page),
                    pageSize: String(options?.newPageSize ?? pageSize),
                    search: options?.newSearch ?? searchValue,
                    sortBy: options?.newSortBy ?? sortBy,
                    sortOrder: options?.newSortOrder ?? sortOrder,
                });

                const response = await fetch(`/api/admin/events?${params.toString()}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch events');
                }
                const data = await response.json();
                setEvents(data.events || []);
                setTotal(data.total || 0);
            } catch (error) {
                console.error(error);
                showError('Failed to fetch events');
            } finally {
                setLoading(false);
            }
        },
        [page, pageSize, searchValue, showError, sortBy, sortOrder]
    );

    // Handle page change
    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            fetchEvents({ newPage });
        },
        [fetchEvents]
    );

    // Handle page size change
    const handlePageSizeChange = useCallback(
        (newPageSize: number) => {
            setPageSize(newPageSize);
            setPage(1);
            fetchEvents({ newPage: 1, newPageSize });
        },
        [fetchEvents]
    );

    // Handle search with debounce
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchValue(value);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            searchTimeoutRef.current = setTimeout(() => {
                setPage(1);
                fetchEvents({ newPage: 1, newSearch: value });
            }, 300);
        },
        [fetchEvents]
    );

    // Handle sort change
    const handleSortChange = useCallback(
        (key: string, direction: 'asc' | 'desc') => {
            setSortBy(key);
            setSortOrder(direction);
            fetchEvents({ newSortBy: key, newSortOrder: direction });
        },
        [fetchEvents]
    );

    // Navigate to enrichment editor on row click
    const handleRowClick = useCallback(
        (event: EventListItem) => {
            router.push(`/admin/ingestion/enrichment/${event.id}?from=events`);
        },
        [router]
    );

    // Refresh data
    const handleRefresh = useCallback(() => {
        fetchEvents();
    }, [fetchEvents]);

    const columns: AdminDataTableColumn<EventListItem>[] = useMemo(() => {
        const baseColumns: AdminDataTableColumn<EventListItem>[] = [
            {
                key: 'title',
                header: 'Event',
                sortable: true,
                render: (event) => (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground-primary text-[13px] line-clamp-1">
                            {event.title}
                        </div>
                        {event.organizer?.name && (
                            <div className="text-[11px] text-foreground-muted">
                                {event.organizer.name}
                            </div>
                        )}
                    </div>
                ),
            },
        ];

        if (visibleColumns.startTime) {
            baseColumns.push({
                key: 'start_time',
                header: 'Date',
                sortable: true,
                render: (event) => (
                    <div className="text-[12px] text-foreground-tertiary">
                        {event.start_time ? (
                            <div className="flex flex-col gap-0.5">
                                <span>{format(new Date(event.start_time), 'MMM d, yyyy')}</span>
                                <span className="text-[10px] text-foreground-muted">
                                    {formatDistanceToNow(new Date(event.start_time), { addSuffix: true })}
                                </span>
                            </div>
                        ) : (
                            <span className="text-foreground-muted">—</span>
                        )}
                    </div>
                ),
                width: 140,
            });
        }

        if (visibleColumns.location) {
            baseColumns.push({
                key: 'location',
                header: 'Location',
                sortable: true,
                render: (event) => {
                    const location = event.venue?.city || event.location;
                    return (
                        <div className="text-[12px] text-foreground-tertiary truncate max-w-[150px]">
                            {location || <span className="text-foreground-muted">—</span>}
                        </div>
                    );
                },
                width: 150,
            });
        }

        if (visibleColumns.eventType) {
            baseColumns.push({
                key: 'event_type',
                header: 'Type',
                render: (event) => {
                    if (!event.event_type?.name) {
                        return <span className="text-[11px] text-foreground-muted">—</span>;
                    }
                    return (
                        <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{
                                backgroundColor: event.event_type.color
                                    ? `${event.event_type.color}20`
                                    : 'var(--background-tertiary)',
                                color: event.event_type.color || 'var(--foreground-tertiary)',
                            }}
                        >
                            {event.event_type.name}
                        </span>
                    );
                },
                width: 120,
            });
        }

        if (visibleColumns.sourceUrl) {
            baseColumns.push({
                key: 'source_url',
                header: 'Source',
                align: 'center',
                render: (event) => {
                    if (!event.source_url) {
                        return <span className="text-[11px] text-foreground-muted">—</span>;
                    }
                    return (
                        <a
                            href={event.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center h-6 w-6 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground-tertiary"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MaterialIcon name="arrow-up-right" size={14} />
                        </a>
                    );
                },
                width: 80,
            });
        }

        return baseColumns;
    }, [visibleColumns]);

    return (
        <div className="space-y-4">
            <AdminDataTable
                columns={columns}
                rows={events}
                getRowId={(event) => event.id}
                sortKey={sortBy}
                sortDirection={sortOrder}
                onSortChange={handleSortChange}
                isLoading={loading}
                onRowClick={handleRowClick}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                toolbar={
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <MaterialIcon
                                    name="search"
                                    size={14}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted"
                                />
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    className="h-7 w-64 rounded-md border border-default bg-background-tertiary pl-8 pr-3 text-[13px] text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                                    value={searchValue}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>
                            <span className="text-[11px] text-foreground-muted">
                                {total.toLocaleString()} events total
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div ref={columnsPanelRef} className="relative">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setColumnsPanelOpen((prev) => !prev)}
                                    className={cn(
                                        'h-7 w-7 p-0 text-foreground-tertiary hover:text-foreground-primary',
                                        columnsPanelOpen && 'bg-accent-primary-light text-foreground-primary'
                                    )}
                                    title="Columns"
                                >
                                    <MaterialIcon name="settings" size={14} />
                                </Button>
                                {columnsPanelOpen && (
                                    <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-default bg-background-main p-2 shadow-xl">
                                        <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                                            Columns
                                        </p>
                                        <div className="space-y-1">
                                            {(
                                                [
                                                    ['startTime', 'Date'],
                                                    ['location', 'Location'],
                                                    ['eventType', 'Event Type'],
                                                    ['sourceUrl', 'Source URL'],
                                                ] as Array<[keyof ColumnVisibility, string]>
                                            ).map(([key, label]) => (
                                                <label
                                                    key={key}
                                                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-background-tertiary cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-3.5 w-3.5 rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                                                        checked={visibleColumns[key]}
                                                        onChange={() => toggleColumnVisibility(key)}
                                                    />
                                                    <span className="text-[13px] text-foreground-tertiary">
                                                        {label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleRefresh}
                                disabled={loading}
                                className="h-7 w-7 p-0 text-foreground-tertiary hover:text-foreground-primary"
                                title="Refresh"
                            >
                                <MaterialIcon name="refresh" size={14} />
                            </Button>
                        </div>
                    </div>
                }
            />
        </div>
    );
}

