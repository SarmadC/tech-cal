/**
 * Moderation Dashboard Client Component
 * 
 * Interactive UI for reviewing and moderating events.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import useAdminHotkeys from '@/components/admin/useAdminHotkeys';
import { useDebounce } from '@/hooks/useDebounce';
import { MaterialIcon } from '@/components/ui/Icon';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { cn } from '@/lib/utils';
import ModerationPreviewPanel from '@/components/admin/ModerationPreviewPanel';

const COLUMNS_STORAGE_KEY = 'techcal.admin.moderation.columns';

type ColumnVisibility = {
    status: boolean;
    reason: boolean;
    created_at: boolean;
    actions: boolean;
};

interface QueueItem {
    id: string;
    source_event_id: string;
    event_id: string | null;
    ingestion_quality_score: number;
    reason_codes: string[];
    recommended_tags: string[] | null;
    status: string;
    created_at: string;
    source_events: {
        raw_payload: {
            record: {
                title: string;
                description?: string;
                startTime: string;
                location: string;
                organizer?: string;
                sourceUrl?: string;
            };
        };
    } | null;
    events: {
        id: string;
        title: string;
        description: string;
        start_time: string;
        location: string;
        organizer: { name: string } | null;
        ingestion_quality_score: number | null;
        ingestion_provenance: {
            quality_components: {
                source_trust: number;
                metadata_completeness: number;
                speaker_verification: number;
                historical_performance: number;
            };
        } | null;
    } | null;
}

interface ModerationDashboardClientProps {
    initialQueueItems: QueueItem[];
    error?: string;
}

export default function ModerationDashboardClient({ initialQueueItems, error }: ModerationDashboardClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const statusParam = searchParams.get('status') ?? 'pending';
    const queryParam = searchParams.get('q') ?? '';
    const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;
    const pageSizeParam = Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20;

    const [data, setData] = useState<QueueItem[]>(initialQueueItems);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const columnsPanelRef = useRef<HTMLDivElement>(null);

    const [searchTerm, setSearchTerm] = useState(queryParam);
    const debouncedSearch = useDebounce(searchTerm, 250);

    const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
        status: true,
        reason: true,
        created_at: true,
        actions: true,
    });

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent, focusSearch } = useAdminToolbar();
    const { showSuccess, showError, showInfo } = useSnackbar();

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

    const updateQuery = useCallback(
        (updates: Record<string, string | number | undefined>) => {
            const next = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            });
            const searchString = next.toString();
            router.replace(searchString ? `${pathname}?${searchString}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    useEffect(() => {
        setTitle('Content Moderation');
        setSubtitle('Audit flagged ingestion records and ensure only high-quality events go live.');
    }, [setTitle, setSubtitle]);

    useEffect(() => {
        setSearch({
            placeholder: 'Search titles, organizers, reason codes',
            value: searchTerm,
            onChange: (value: string) => setSearchTerm(value),
            onSubmit: (value) => {
                setSearchTerm(value);
                updateQuery({ q: value || undefined, page: 1 });
            },
        });
        return () => {
            setSearch(undefined);
        };
    }, [searchTerm, setSearch, updateQuery]);

    useEffect(() => {
        if (debouncedSearch === queryParam) return;
        updateQuery({ q: debouncedSearch || undefined, page: 1 });
    }, [debouncedSearch, queryParam, updateQuery]);

    useEffect(() => {
        setToolbarContent(undefined);
        return () => setToolbarContent(undefined);
    }, [setToolbarContent]);

    useEffect(() => {
        setSearchTerm(queryParam);
    }, [queryParam]);

    const statusOptions = useMemo(() => {
        const counts = data.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
        }, {});
        const uniqueStatuses = Object.keys(counts);
        return ['all', ...uniqueStatuses];
    }, [data]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach((item) => {
            counts[item.status] = (counts[item.status] ?? 0) + 1;
        });
        return counts;
    }, [data]);

    useEffect(() => {
        setQuickFilters(
            statusOptions.map((status) => ({
                id: status,
                label: status === 'all' ? 'All' : status.replace(/_/g, ' '),
                active: status === 'all' ? statusParam === 'all' : statusParam === status,
                badge:
                    status === 'all'
                        ? data.length
                        : statusCounts[status] || undefined,
                onToggle: () => {
                    setSelectedRows([]);
                    updateQuery({ status: status === 'all' ? undefined : status, page: 1 });
                },
            }))
        );
    }, [data, statusParam, setQuickFilters, statusOptions, statusCounts, updateQuery]);

    const filteredItems = useMemo(() => {
        const needle = queryParam.trim().toLowerCase();
        return data.filter((item) => {
            const matchesStatus = statusParam === 'all' ? true : item.status === statusParam;
            const matchesSearch = !needle
                ? true
                : [
                      item.events?.title,
                      item.events?.organizer?.name,
                      item.reason_codes.join(' '),
                      item.source_events?.raw_payload?.record?.title,
                      item.source_events?.raw_payload?.record?.organizer,
                  ]
                      .filter(Boolean)
                      .some((value) => value?.toLowerCase().includes(needle));
            return matchesStatus && matchesSearch;
        });
    }, [data, statusParam, queryParam]);

    const totalItems = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeParam));
    const currentPage = Math.min(pageParam, totalPages);
    const startIndex = (currentPage - 1) * pageSizeParam;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSizeParam);

    useEffect(() => {
        if (pageParam !== currentPage) {
            updateQuery({ page: currentPage });
        }
    }, [currentPage, pageParam, updateQuery]);

    useEffect(() => {
        setSelectedRows((prev) =>
            prev.filter((id) => filteredItems.some((item) => item.id === id))
        );
        setSelectAllMatching(false);
    }, [filteredItems]);

    const refetchData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch('/api/admin/ingestion/moderate?status=pending&limit=100', {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to refresh data');
            const result = await response.json();
            setData(result.items ?? result.data ?? []);
            setSelectedRows([]);
            setSelectAllMatching(false);
            showSuccess('Queue refreshed.');
        } catch (err) {
            console.error('Error refreshing data:', err);
            showError('Failed to refresh moderation queue.');
        } finally {
            setIsRefreshing(false);
        }
    }, [showSuccess, showError]);

    const handleBulkAction = useCallback(
        async (action: 'approve' | 'reject') => {
            const ids = selectAllMatching
                ? filteredItems.map((i) => i.id)
                : selectedRows;
            if (ids.length === 0) {
                showInfo('Select at least one queue item first.');
                return;
            }
            setActionLoading(true);
            try {
                const response = await fetch('/api/admin/ingestion/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        queueItemIds: ids,
                    }),
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error ?? 'Failed to process moderation action');
                }
                setData((prev) => prev.filter((item) => !ids.includes(item.id)));
                setSelectedRows([]);
                setSelectAllMatching(false);
                showSuccess(
                    `${action === 'approve' ? 'Approved' : 'Rejected'} ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} successfully.`
                );
            } catch (err) {
                console.error('Error performing bulk action:', err);
                Sentry.captureException(err);
                showError(err instanceof Error ? err.message : 'Error performing moderation action.');
            } finally {
                setActionLoading(false);
            }
        },
        [selectedRows, selectAllMatching, filteredItems, showError, showInfo, showSuccess]
    );

    const handleSingleAction = useCallback(
        async (item: QueueItem, action: 'approve' | 'reject') => {
            setActionLoading(true);
            try {
                const response = await fetch('/api/admin/ingestion/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action,
                        queueItemIds: [item.id],
                        eventId: item.event_id ?? undefined,
                    }),
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error ?? 'Failed to process moderation action');
                }
                setData((prev) => prev.filter((entry) => entry.id !== item.id));
                showSuccess(`Marked "${item.events?.title ?? item.source_events?.raw_payload?.record?.title ?? 'Untitled'}" as ${action}.`);
            } catch (err) {
                console.error('Error performing action:', err);
                Sentry.captureException(err);
                showError(err instanceof Error ? err.message : 'Error performing moderation action.');
            } finally {
                setActionLoading(false);
            }
        },
        [showError, showSuccess]
    );

    const handleEditAndApprove = useCallback(
        async (item: QueueItem, eventData: Record<string, string>) => {
            if (!item.event_id) {
                showError('Cannot edit: no linked event found.');
                return;
            }
            setActionLoading(true);
            try {
                const response = await fetch('/api/admin/ingestion/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'edit',
                        queueItemIds: [item.id],
                        eventId: item.event_id,
                        eventData,
                    }),
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error ?? 'Failed to edit and approve');
                }
                setData((prev) => prev.filter((entry) => entry.id !== item.id));
                setPreviewItem(null);
                showSuccess(`Edited and approved "${item.events?.title ?? 'Untitled'}".`);
            } catch (err) {
                console.error('Error editing and approving:', err);
                Sentry.captureException(err);
                showError(err instanceof Error ? err.message : 'Failed to edit and approve.');
            } finally {
                setActionLoading(false);
            }
        },
        [showError, showSuccess]
    );

    const moveSelection = useCallback(
        (direction: 'next' | 'prev') => {
            if (paginatedItems.length === 0) return;
            const ids = paginatedItems.map((item) => item.id);
            setSelectedRows((prev) => {
                if (prev.length === 0) {
                    return [direction === 'next' ? ids[0] : ids[ids.length - 1]];
                }
                const currentId = prev[prev.length - 1];
                const index = ids.indexOf(currentId);
                if (index === -1) {
                    return [direction === 'next' ? ids[0] : ids[ids.length - 1]];
                }
                const nextIndex =
                    direction === 'next' ? Math.min(ids.length - 1, index + 1) : Math.max(0, index - 1);
                return [ids[nextIndex]];
            });
        },
        [paginatedItems]
    );

    useAdminHotkeys({
        focusSearch,
        openHelp: () => setShortcutsOpen(true),
        onApproveSelected: () => handleBulkAction('approve'),
        onRejectSelected: () => handleBulkAction('reject'),
        onNavigateNext: () => moveSelection('next'),
        onNavigatePrevious: () => moveSelection('prev'),
        onOpenPreview: () => {
            if (selectedRows.length === 1) {
                const item = paginatedItems.find((i) => i.id === selectedRows[0]);
                if (item) setPreviewItem(item);
            }
        },
    });

    useEffect(() => {
        if (!shortcutsOpen) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShortcutsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [shortcutsOpen]);

    const statusBadgeStyles: Record<string, string> = {
        pending: 'bg-amber-500/20 text-amber-300',
        approved: 'bg-emerald-500/20 text-emerald-300',
        rejected: 'bg-rose-500/20 text-rose-300',
    };

    const reasonCodeColor = (code: string): string => {
        const trustCodes = ['low_source_trust', 'unverified_source', 'low_trust', 'source_trust'];
        const qualityCodes = ['low_quality', 'low_score', 'quality_below_threshold'];
        if (trustCodes.some((c) => code.includes(c)) || qualityCodes.some((c) => code.includes(c))) {
            return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        }
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    };

    const qualityTooltip = (item: QueueItem): string => {
        const qc = item.events?.ingestion_provenance?.quality_components;
        if (!qc) return `Score: ${item.ingestion_quality_score.toFixed(0)}`;
        return `Overall: ${item.ingestion_quality_score.toFixed(0)}\nSource Trust: ${qc.source_trust?.toFixed(0) ?? '—'}\nMetadata: ${qc.metadata_completeness?.toFixed(0) ?? '—'}\nSpeaker: ${qc.speaker_verification?.toFixed(0) ?? '—'}\nHistorical: ${qc.historical_performance?.toFixed(0) ?? '—'}`;
    };

    const columns: AdminDataTableColumn<QueueItem>[] = useMemo(() => {
        const baseColumns: AdminDataTableColumn<QueueItem>[] = [
            {
                key: 'summary',
                header: 'Event',
                render: (item) => {
                    const eventTitle =
                        item.events?.title ?? item.source_events?.raw_payload?.record?.title ?? 'Untitled Event';
                    const organizer =
                        item.events?.organizer?.name ?? item.source_events?.raw_payload?.record?.organizer ?? 'Unknown organizer';
                    const eventDate = item.events?.start_time ?? item.source_events?.raw_payload?.record?.startTime;
                    const hasSourceUrl = !!item.source_events?.raw_payload?.record?.sourceUrl;
                    return (
                        <div className="flex flex-col gap-0.5">
                            <div className="font-medium text-foreground-primary text-[13px]">{eventTitle}</div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
                                <span>{organizer}</span>
                                {eventDate && (
                                    <span className="text-foreground-muted">
                                        {format(new Date(eventDate), 'MMM d, yyyy')}
                                    </span>
                                )}
                                {hasSourceUrl && (
                                    <span title="Has source URL">
                                        <MaterialIcon name="arrow-up-right" size={12} className="text-foreground-muted" />
                                    </span>
                                )}
                                <span
                                    className="inline-flex items-center gap-1 rounded border border-default/60 bg-background-secondary/60 px-2 py-0.5 cursor-help"
                                    title={qualityTooltip(item)}
                                >
                                    <MaterialIcon name="dashboard" size={12} />
                                    {item.ingestion_quality_score.toFixed(0)}
                                </span>
                            </div>
                        </div>
                    );
                },
            },
        ];

        if (visibleColumns.status) {
            baseColumns.push({
                key: 'status',
                header: 'Status',
                align: 'center',
                render: (item) => {
                    const badgeStyle = statusBadgeStyles[item.status] || 'bg-background-tertiary text-foreground-primary';
                    return (
                        <Badge className={cn('px-3 py-1 text-[11px] font-medium uppercase tracking-wide', badgeStyle)}>
                            {item.status.replace(/_/g, ' ')}
                        </Badge>
                    );
                },
                width: 140,
            });
        }

        if (visibleColumns.reason) {
            baseColumns.push({
                key: 'reason',
                header: 'Flagged Reason',
                render: (item) => (
                    <div className="flex flex-wrap gap-1">
                        {item.reason_codes.length === 0 ? (
                            <span className="text-[11px] text-foreground-muted">No reason captured</span>
                        ) : (
                            item.reason_codes.map((code) => (
                                <Badge key={code} className={cn('px-1.5 py-0.5 text-[10px] border', reasonCodeColor(code))}>
                                    {code.replace(/_/g, ' ')}
                                </Badge>
                            ))
                        )}
                    </div>
                ),
            });
        }

        if (visibleColumns.created_at) {
            baseColumns.push({
                key: 'created_at',
                header: 'Flagged',
                sortable: true,
                render: (item) => (
                    <div className="flex flex-col text-[11px] text-foreground-tertiary">
                        <span>{format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</span>
                        <span className="text-foreground-muted">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                    </div>
                ),
                width: 160,
            });
        }

        if (visibleColumns.actions) {
            baseColumns.push({
                key: 'actions',
                header: '',
                align: 'right',
                render: (item) => {
                    return (
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSingleAction(item, 'approve');
                                }}
                                disabled={actionLoading}
                                className="rounded p-1.5 text-emerald-400 transition-colors hover:bg-emerald-400/10 disabled:opacity-50"
                                title="Approve"
                            >
                                <MaterialIcon name="check" size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSingleAction(item, 'reject');
                                }}
                                disabled={actionLoading}
                                className="rounded p-1.5 text-rose-400 transition-colors hover:bg-rose-400/10 disabled:opacity-50"
                                title="Reject"
                            >
                                <MaterialIcon name="close" size={16} />
                            </button>
                        </div>
                    );
                },
                width: 110,
            });
        }

        return baseColumns;
    }, [actionLoading, handleSingleAction, visibleColumns, statusBadgeStyles]);

    const bulkActions = useMemo(
        () => [
            {
                id: 'approve',
                label: 'Approve',
                icon: <MaterialIcon name="check" size={14} />,
                shortcut: 'a',
                disabled: actionLoading || selectedRows.length === 0,
                onSelect: () => handleBulkAction('approve'),
            },
            {
                id: 'reject',
                label: 'Reject',
                icon: <MaterialIcon name="clear" size={14} />,
                shortcut: 'r',
                disabled: actionLoading || selectedRows.length === 0,
                onSelect: () => handleBulkAction('reject'),
            },
        ],
        [actionLoading, handleBulkAction, selectedRows.length]
    );

    const tableToolbar = (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <MaterialIcon name="search" size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
                    <input
                        type="text"
                        placeholder="Filter events..."
                        className="h-7 w-64 rounded-md border border-default bg-background-tertiary pl-8 pr-3 text-[13px] text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="h-4 w-px bg-accent-primary-light mx-1" />
                <div className="flex items-center gap-1">
                    {statusOptions.map((status) => {
                        const isActive = status === 'all' ? statusParam === 'all' : statusParam === status;
                        const count = status === 'all' ? data.length : statusCounts[status] || 0;
                        return (
                            <button
                                key={status}
                                onClick={() => {
                                    setSelectedRows([]);
                                    updateQuery({ status: status === 'all' ? undefined : status, page: 1 });
                                }}
                                className={cn(
                                    "px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors",
                                    isActive
                                        ? "bg-accent-primary-light text-foreground-primary"
                                        : "text-foreground-muted hover:text-foreground-tertiary hover:bg-background-tertiary"
                                )}
                            >
                                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                                {count > 0 && <span className="ml-1 opacity-50">{count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={refetchData}
                    disabled={isRefreshing}
                    className={cn("h-7 w-7 p-0 text-foreground-tertiary hover:text-foreground-primary", isRefreshing && "animate-spin")}
                    title="Refresh queue"
                >
                    <MaterialIcon name="refresh" size={14} />
                </Button>
                <div ref={columnsPanelRef} className="relative">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setColumnsPanelOpen((prev) => !prev)}
                        className={cn("h-7 w-7 p-0 text-foreground-tertiary hover:text-foreground-primary", columnsPanelOpen && "bg-accent-primary-light text-foreground-primary")}
                        title="Columns"
                    >
                        <MaterialIcon name="settings" size={14} />
                    </Button>
                    {columnsPanelOpen && (
                        <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-default bg-background-main p-2 shadow-xl">
                            <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">Columns</p>
                            <div className="space-y-1">
                                {(
                                    [
                                        ['status', 'Status'],
                                        ['reason', 'Flagged Reason'],
                                        ['created_at', 'Flagged Date'],
                                        ['actions', 'Actions'],
                                    ] as Array<[keyof ColumnVisibility, string]>
                                ).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-background-tertiary cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                                            checked={visibleColumns[key]}
                                            onChange={() => toggleColumnVisibility(key)}
                                        />
                                        <span className="text-[13px] text-foreground-tertiary">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (error) {
        return (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-100">
                <div>
                    <strong className="block text-sm font-semibold">Error</strong>
                    <p className="text-sm">Failed to load moderation queue: {error}</p>
                </div>
            </div>
        );
    }

    const allPageSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedRows.includes(item.id));
    const showSelectAllBanner = allPageSelected && filteredItems.length > paginatedItems.length && !selectAllMatching;

    return (
        <div className="space-y-4">
            {/* Select all matching banner */}
            {showSelectAllBanner && (
                <div className="flex items-center justify-between rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-2.5 text-sm text-foreground-secondary">
                    <span>
                        Selected {paginatedItems.length} on this page.{' '}
                        <button
                            onClick={() => setSelectAllMatching(true)}
                            className="font-semibold text-accent-primary hover:underline"
                        >
                            Select all {filteredItems.length} matching
                        </button>
                    </span>
                </div>
            )}
            {selectAllMatching && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm text-foreground-secondary">
                    <span>
                        All {filteredItems.length} matching items selected.{' '}
                        <button
                            onClick={() => { setSelectAllMatching(false); setSelectedRows([]); }}
                            className="font-semibold text-foreground-tertiary hover:underline"
                        >
                            Clear selection
                        </button>
                    </span>
                </div>
            )}
            <AdminDataTable
                columns={columns}
                rows={paginatedItems}
                getRowId={(item) => item.id}
                sortKey="created_at"
                sortDirection="desc"
                onSortChange={() => {
                    // sorting not yet implemented - rely on API sort when available
                }}
                isLoading={(actionLoading && paginatedItems.length === 0) || isRefreshing}
                selectable
                selectedRowIds={selectedRows}
                onSelectionChange={setSelectedRows}
                onRowClick={(row) => setPreviewItem(row)}
                bulkActions={bulkActions}
                page={currentPage}
                pageSize={pageSizeParam}
                total={totalItems}
                onPageChange={(nextPage) => updateQuery({ page: nextPage })}
                onPageSizeChange={(size) => updateQuery({ pageSize: size, page: 1 })}
                toolbar={tableToolbar}
            />
            {shortcutsOpen && <ModerationShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
            {previewItem && (
                <ModerationPreviewPanel
                    item={previewItem}
                    onClose={() => setPreviewItem(null)}
                    onApprove={(item) => {
                        handleSingleAction(item, 'approve');
                        setPreviewItem(null);
                    }}
                    onReject={(item) => {
                        handleSingleAction(item, 'reject');
                        setPreviewItem(null);
                    }}
                    onEditAndApprove={handleEditAndApprove}
                    actionLoading={actionLoading}
                />
            )}
        </div>
    );
}

function ModerationShortcutsOverlay({ onClose }: { onClose: () => void }) {
    const shortcuts: Array<{ keys: string; description: string }> = [
        { keys: '/', description: 'Focus search' },
        { keys: 'a', description: 'Approve selected rows' },
        { keys: 'r', description: 'Reject selected rows' },
        { keys: 'j / k', description: 'Move table selection down / up' },
        { keys: 'Enter', description: 'Preview selected event' },
        { keys: '?', description: 'Show this help' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/80 backdrop-blur">
            <div className="w-full max-w-md rounded-xl border border-default bg-background-main p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground-primary">Moderation shortcuts</h2>
                        <p className="text-sm text-foreground-tertiary">
                            Stay in flow while triaging ingestion issues.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground-tertiary hover:bg-background-tertiary">
                        <MaterialIcon name="close" size={16} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map((item) => (
                        <div key={item.keys} className="flex items-center justify-between gap-3 rounded-md border border-default/60 bg-background-secondary/60 px-3 py-2">
                            <span className="font-mono text-xs uppercase tracking-wide text-foreground-secondary">{item.keys}</span>
                            <span className="text-sm text-foreground-tertiary">{item.description}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-center text-xs text-foreground-muted">Press Esc to close.</p>
            </div>
        </div>
    );
}
