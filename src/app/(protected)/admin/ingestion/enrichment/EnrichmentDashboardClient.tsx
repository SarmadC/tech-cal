'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { MaterialIcon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { EnrichmentMetadata } from '@/types/enrichment';
import { cn } from '@/lib/utils';

const COLUMNS_STORAGE_KEY = 'techcal.admin.enrichment.columns';

interface StreamProgress {
    type: 'progress' | 'complete' | 'error';
    completed: number;
    total: number;
    currentEventId?: string;
    currentEventTitle?: string;
    result?: {
        eventId: string;
        status: 'enriched' | 'failed';
        error?: string;
    };
    summary?: {
        succeeded: number;
        failed: number;
    };
    error?: string;
}

interface BulkOperationProgress {
    active: boolean;
    mode: 'enrich' | 'infer';
    completed: number;
    total: number;
    currentTitle?: string;
    succeeded: number;
    failed: number;
    errors: Array<{ eventId: string; title: string; error: string }>;
}

interface ConfirmationDialog {
    open: boolean;
    mode: 'enrich' | 'infer';
    eventIds: string[];
}

type ColumnVisibility = {
    status: boolean;
    updated: boolean;
    actions: boolean;
};

interface EnrichmentEvent {
    id: string;
    title: string;
    start_time: string;
    source_url: string;
    ingestion_source_id: string | null;
    enrichment_status: string;
    enrichment_metadata: EnrichmentMetadata | null;
    updated_at: string | null;
}

interface EnrichmentDashboardClientProps {
    initialEvents: EnrichmentEvent[];
}

const statusBadgeStyles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-100',
    processing: 'bg-blue-500/20 text-blue-100',
    enriched: 'bg-emerald-500/20 text-emerald-100',
    failed: 'bg-rose-500/20 text-rose-100',
    approved: 'bg-emerald-600/20 text-emerald-50',
    rejected: 'bg-rose-600/20 text-rose-50',
    skipped: 'bg-slate-700 text-slate-100',
};

export default function EnrichmentDashboardClient({ initialEvents }: EnrichmentDashboardClientProps) {
    const router = useRouter();
    const [events, setEvents] = useState<EnrichmentEvent[]>(initialEvents);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'enriched' | 'failed'>('all');
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
        status: true,
        updated: true,
        actions: true,
    });
    const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
    const columnsPanelRef = useRef<HTMLDivElement>(null);

    // Bulk operation progress state
    const [bulkProgress, setBulkProgress] = useState<BulkOperationProgress | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog>({
        open: false,
        mode: 'infer',
        eventIds: [],
    });
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent } = useAdminToolbar();
    const { showInfo, showSuccess, showError } = useSnackbar();

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
        setTitle('LLM Enrichment');
        setSubtitle('Trigger LLM extraction, monitor status, and push to review.');
    }, [setSubtitle, setTitle]);

    useEffect(() => {
        setSearch({
            placeholder: 'Filter by title or source',
            value: searchValue,
            onChange: (value) => setSearchValue(value ?? ''),
        });
        return () => setSearch(undefined);
    }, [searchValue, setSearch]);

    useEffect(() => {
        setToolbarContent(undefined);
        return () => setToolbarContent(undefined);
    }, [setToolbarContent]);

    useEffect(() => {
        const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        setQuickFilters([
            { id: 'all', label: 'All', badge: totalCount > 0 ? totalCount : undefined, active: statusFilter === 'all', onToggle: () => setStatusFilter('all') },
            { id: 'pending', label: 'Pending', badge: statusCounts.pending || undefined, active: statusFilter === 'pending', onToggle: () => setStatusFilter('pending') },
            { id: 'processing', label: 'Processing', badge: statusCounts.processing || undefined, active: statusFilter === 'processing', onToggle: () => setStatusFilter('processing') },
            { id: 'enriched', label: 'Enriched', badge: statusCounts.enriched || undefined, active: statusFilter === 'enriched', onToggle: () => setStatusFilter('enriched') },
            { id: 'failed', label: 'Failed', badge: statusCounts.failed || undefined, active: statusFilter === 'failed', onToggle: () => setStatusFilter('failed') },
        ]);
    }, [setQuickFilters, statusCounts, statusFilter]);

    const filteredEvents = useMemo(() => {
        const needle = searchValue.trim().toLowerCase();
        return events.filter((event) => {
            const statusMatch = statusFilter === 'all' ? true : event.enrichment_status === statusFilter;
            const text = [event.title, event.ingestion_source_id ?? '', event.source_url].join(' ').toLowerCase();
            const searchMatch = needle ? text.includes(needle) : true;
            return statusMatch && searchMatch;
        });
    }, [events, searchValue, statusFilter]);

    // Fetch status counts for filter badges
    const fetchStatusCounts = useCallback(async () => {
        try {
            const statuses = ['pending', 'processing', 'enriched', 'failed'];
            const counts: Record<string, number> = {};

            await Promise.all(
                statuses.map(async (status) => {
                    const response = await fetch(`/api/admin/ingestion/enrichment-status?status=${status}&limit=1`);
                    if (response.ok) {
                        const data = await response.json();
                        counts[status] = data.total ?? data.events?.length ?? 0;
                    }
                })
            );

            setStatusCounts(counts);
        } catch (error) {
            console.error('Failed to fetch status counts:', error);
        }
    }, []);

    const refresh = useCallback(
        async (overrideStatus?: string) => {
            setLoading(true);
            try {
                const status = overrideStatus ?? statusFilter;
                const response = await fetch(`/api/admin/ingestion/enrichment-status?status=${status}&limit=100`);
                if (!response.ok) {
                    throw new Error('Failed to fetch enrichment status');
                }
                const data = await response.json();
                setEvents(data.events || []);
                // Also refresh counts
                fetchStatusCounts();
            } catch (error) {
                console.error(error);
                showError('Failed to refresh enrichment status');
            } finally {
                setLoading(false);
            }
        },
        [fetchStatusCounts, showError, statusFilter]
    );

    // Initial fetch of status counts
    useEffect(() => {
        fetchStatusCounts();
    }, [fetchStatusCounts]);

    // Get event title map for progress display
    const eventTitleMap = useMemo(() => {
        return new Map(events.map((e) => [e.id, e.title]));
    }, [events]);

    // Streaming bulk operation handler
    const executeStreamingOperation = useCallback(
        async (eventIds: string[], mode: 'enrich' | 'infer') => {
            if (eventIds.length === 0) {
                showInfo('Select at least one event.');
                return;
            }

            setLoading(true);
            setBulkProgress({
                active: true,
                mode,
                completed: 0,
                total: eventIds.length,
                currentTitle: undefined,
                succeeded: 0,
                failed: 0,
                errors: [],
            });

            const endpoint = mode === 'enrich' ? '/api/admin/ingestion/enrich-stream' : '/api/admin/ingestion/infer-stream';

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventIds }),
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload.error || `Failed to trigger ${mode}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('No response body');
                }

                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data: StreamProgress = JSON.parse(line.slice(6));

                                if (data.type === 'progress') {
                                    setBulkProgress((prev) => {
                                        if (!prev) return prev;
                                        const newErrors = [...prev.errors];
                                        if (data.result?.status === 'failed' && data.result.error) {
                                            newErrors.push({
                                                eventId: data.result.eventId,
                                                title: data.currentEventTitle || 'Unknown',
                                                error: data.result.error,
                                            });
                                        }
                                        return {
                                            ...prev,
                                            completed: data.completed,
                                            currentTitle: data.currentEventTitle,
                                            succeeded: prev.succeeded + (data.result?.status === 'enriched' ? 1 : 0),
                                            failed: prev.failed + (data.result?.status === 'failed' ? 1 : 0),
                                            errors: newErrors,
                                        };
                                    });
                                } else if (data.type === 'complete') {
                                    setBulkProgress((prev) =>
                                        prev
                                            ? {
                                                ...prev,
                                                active: false,
                                                completed: data.total,
                                                succeeded: data.summary?.succeeded ?? prev.succeeded,
                                                failed: data.summary?.failed ?? prev.failed,
                                            }
                                            : null
                                    );
                                    showSuccess(
                                        `${mode === 'enrich' ? 'Enriched' : 'Inferred'} ${data.summary?.succeeded ?? 0} of ${data.total} events.`
                                    );
                                } else if (data.type === 'error') {
                                    throw new Error(data.error || 'Unknown error');
                                }
                            } catch {
                                // Ignore parse errors
                            }
                        }
                    }
                }

                await refresh();
                setSelectedRows([]);
            } catch (error) {
                console.error(error);
                showError(error instanceof Error ? error.message : `Failed to ${mode}`);
                setBulkProgress(null);
            } finally {
                setLoading(false);
            }
        },
        [refresh, showError, showInfo, showSuccess]
    );

    // Single event operations (non-streaming, for individual actions)
    const triggerEnrichment = useCallback(
        async (eventIds: string[]) => {
            if (eventIds.length === 1) {
                // Single event - use streaming for consistency
                await executeStreamingOperation(eventIds, 'enrich');
            } else {
                // Bulk - open confirmation dialog
                setConfirmDialog({ open: true, mode: 'enrich', eventIds });
            }
        },
        [executeStreamingOperation]
    );

    const triggerInference = useCallback(
        async (eventIds: string[]) => {
            if (eventIds.length === 1) {
                // Single event - use streaming for consistency
                await executeStreamingOperation(eventIds, 'infer');
            } else {
                // Bulk - open confirmation dialog
                setConfirmDialog({ open: true, mode: 'infer', eventIds });
            }
        },
        [executeStreamingOperation]
    );

    // Handle confirmation dialog confirm
    const handleConfirmBulkOperation = useCallback(() => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        executeStreamingOperation(confirmDialog.eventIds, confirmDialog.mode);
    }, [confirmDialog.eventIds, confirmDialog.mode, executeStreamingOperation]);

    // Navigate to editor on row click
    const handleRowClick = useCallback(
        (event: EnrichmentEvent) => {
            router.push(`/admin/ingestion/enrichment/${event.id}`);
        },
        [router]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger if typing in input
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            // ? or Shift+/ to show shortcuts
            if (event.key === '?' || (event.shiftKey && event.key === '/')) {
                event.preventDefault();
                setShortcutsOpen(true);
            }

            // Escape to close modals
            if (event.key === 'Escape') {
                if (shortcutsOpen) {
                    setShortcutsOpen(false);
                } else if (confirmDialog.open) {
                    setConfirmDialog((prev) => ({ ...prev, open: false }));
                } else if (bulkProgress && !bulkProgress.active) {
                    setBulkProgress(null);
                }
            }

            // e = enrich selected, i = infer selected (when rows selected)
            if (!loading && selectedRows.length > 0) {
                if (event.key === 'e' && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    triggerEnrichment(selectedRows);
                }
                if (event.key === 'i' && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    triggerInference(selectedRows);
                }
            }

            // r = refresh
            if (event.key === 'r' && !event.metaKey && !event.ctrlKey && !loading) {
                event.preventDefault();
                refresh();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcutsOpen, confirmDialog.open, bulkProgress, loading, selectedRows, triggerEnrichment, triggerInference, refresh]);

    const columns: AdminDataTableColumn<EnrichmentEvent>[] = useMemo(
        () => {
            const baseColumns: AdminDataTableColumn<EnrichmentEvent>[] = [
                {
                    key: 'event',
                    header: 'Event',
                    render: (event) => (
                        <div className="flex flex-col gap-0.5">
                            <div className="font-medium text-slate-200 text-[13px]">{event.title}</div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                {event.ingestion_source_id && (
                                    <span className="font-mono text-slate-400">
                                        {event.ingestion_source_id}
                                    </span>
                                )}
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(event.start_time), { addSuffix: true })}</span>
                            </div>
                        </div>
                    ),
                },
            ];

            if (visibleColumns.status) {
                baseColumns.push({
                    key: 'status',
                    header: 'Status',
                    cellClassName: 'max-w-xl',
                    render: (event) => {
                        const statusColors: Record<string, string> = {
                            pending: 'bg-amber-500',
                            processing: 'bg-blue-500',
                            enriched: 'bg-emerald-500',
                            failed: 'bg-rose-500',
                            approved: 'bg-emerald-600',
                            rejected: 'bg-rose-600',
                            skipped: 'bg-slate-600',
                        };
                        const color = statusColors[event.enrichment_status] || 'bg-slate-500';

                        return (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-1.5 w-1.5 rounded-full", color)} />
                                    <span className="text-[11px] capitalize text-slate-300">{event.enrichment_status}</span>
                                </div>
                                {event.enrichment_metadata?.last_error && (
                                    <span className="text-rose-400 text-[10px] leading-snug line-clamp-1">
                                        {event.enrichment_metadata.last_error}
                                    </span>
                                )}
                            </div>
                        );
                    },
                    width: 200,
                });
            }

            if (visibleColumns.updated) {
                baseColumns.push({
                    key: 'updated_at',
                    header: 'Updated',
                    render: (event) => (
                        <div className="text-[11px] text-slate-500">
                            {event.updated_at ? formatDistanceToNow(new Date(event.updated_at), { addSuffix: true }) : '—'}
                        </div>
                    ),
                    width: 120,
                });
            }

            if (visibleColumns.actions) {
                baseColumns.push({
                    key: 'actions',
                    header: 'Actions',
                    align: 'right',
                    render: (event) => (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                onClick={() => triggerEnrichment([event.id])}
                                disabled={loading || !event.source_url}
                                title={!event.source_url ? 'No source URL' : 'Scrape'}
                            >
                                Scrape
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                onClick={() => triggerInference([event.id])}
                                disabled={loading}
                                title="Infer"
                            >
                                Infer
                            </Button>
                            {event.source_url && (
                                <a
                                    href={event.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/5 text-slate-500 hover:text-slate-300"
                                >
                                    <MaterialIcon name="arrow-up-right" size={12} />
                                </a>
                            )}
                        </div>
                    ),
                    width: 180,
                });
            }

            return baseColumns;
        },
        [loading, triggerEnrichment, triggerInference, visibleColumns]
    );

    const bulkActions = useMemo(
        () => [
            {
                id: 'trigger',
                label: 'Scrape & Enrich',
                icon: <MaterialIcon name="arrow-forward" size={14} />,
                disabled: selectedRows.length === 0 || loading,
                onSelect: () => triggerEnrichment(selectedRows),
            },
            {
                id: 'infer',
                label: 'Infer Metadata (No Scrape)',
                icon: <MaterialIcon name="code" size={14} />,
                disabled: selectedRows.length === 0 || loading,
                onSelect: () => triggerInference(selectedRows),
            },
            {
                id: 'refresh',
                label: 'Refresh',
                icon: <MaterialIcon name="refresh" size={14} />,
                disabled: loading,
                onSelect: () => refresh(),
            },
        ],
        [loading, refresh, selectedRows, triggerEnrichment, triggerInference]
    );

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            {bulkProgress && (
                <div className="rounded-lg border border-white/5 bg-[#1C1C1C] p-3 mb-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                            {bulkProgress.active ? (
                                <>
                                    {bulkProgress.mode === 'enrich' ? 'Enriching' : 'Inferring'}{' '}
                                    <span className="text-slate-200">{bulkProgress.completed}/{bulkProgress.total}</span>
                                </>
                            ) : (
                                <>
                                    Complete: <span className="text-emerald-400">{bulkProgress.succeeded}</span> succeeded, <span className="text-rose-400">{bulkProgress.failed}</span> failed
                                </>
                            )}
                        </span>
                        {bulkProgress.active && bulkProgress.currentTitle && (
                            <span className="truncate max-w-[300px] opacity-70">
                                {bulkProgress.currentTitle}
                            </span>
                        )}
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                        />
                    </div>
                    {!bulkProgress.active && bulkProgress.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400">Errors ({bulkProgress.errors.length})</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {bulkProgress.errors.slice(0, 5).map((err) => (
                                    <div key={err.eventId} className="text-[11px] text-slate-500">
                                        <span className="text-slate-400">{err.title}:</span>{' '}
                                        <span className="text-rose-400">{err.error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {!bulkProgress.active && (
                        <div className="mt-2 flex justify-end">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] text-slate-400 hover:text-slate-200"
                                onClick={() => setBulkProgress(null)}
                            >
                                Dismiss
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <AdminDataTable
                columns={columns}
                rows={filteredEvents}
                getRowId={(event) => event.id}
                sortKey="start_time"
                sortDirection="asc"
                selectable
                selectedRowIds={selectedRows}
                onSelectionChange={setSelectedRows}
                onRowClick={handleRowClick}
                bulkActions={bulkActions}
                page={1}
                pageSize={filteredEvents.length || 10}
                total={filteredEvents.length}
                onPageChange={() => undefined}
                onPageSizeChange={() => undefined}
                toolbar={
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <MaterialIcon name="search" size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Filter events..."
                                    className="h-7 w-64 rounded-md border border-white/10 bg-white/5 pl-8 pr-3 text-[13px] text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                            </div>
                            <div className="h-4 w-px bg-white/10 mx-1" />
                            <div className="flex items-center gap-1">
                                {['all', 'pending', 'enriched', 'failed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status as any)}
                                        className={cn(
                                            "px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors",
                                            statusFilter === status
                                                ? "bg-white/10 text-slate-200"
                                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                        )}
                                    >
                                        {status}
                                        {statusCounts[status] ? <span className="ml-1 opacity-50">{statusCounts[status]}</span> : null}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div ref={columnsPanelRef} className="relative">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setColumnsPanelOpen((prev) => !prev)}
                                    className={cn("h-7 w-7 p-0 text-slate-400 hover:text-slate-200", columnsPanelOpen && "bg-white/10 text-slate-200")}
                                    title="Columns"
                                >
                                    <MaterialIcon name="settings" size={14} />
                                </Button>
                                {columnsPanelOpen && (
                                    <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-white/10 bg-[#1C1C1C] p-2 shadow-xl">
                                        <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Columns</p>
                                        <div className="space-y-1">
                                            {(
                                                [
                                                    ['status', 'Status'],
                                                    ['updated', 'Last Updated'],
                                                    ['actions', 'Actions'],
                                                ] as Array<[keyof ColumnVisibility, string]>
                                            ).map(([key, label]) => (
                                                <label key={key} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-0"
                                                        checked={visibleColumns[key]}
                                                        onChange={() => toggleColumnVisibility(key)}
                                                    />
                                                    <span className="text-[13px] text-slate-300">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => refresh()}
                                disabled={loading}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
                                title="Refresh"
                            >
                                <MaterialIcon name="refresh" size={14} />
                            </Button>
                        </div>
                    </div>
                }
            />

            {/* Confirmation Dialog */}
            {confirmDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-slate-100">
                            {confirmDialog.mode === 'enrich' ? 'Scrape & Enrich' : 'Infer Metadata'} {confirmDialog.eventIds.length} Events?
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            {confirmDialog.mode === 'enrich'
                                ? 'This will scrape source URLs and extract event data using LLM.'
                                : 'This will generate descriptions and infer tags from event titles (no web scraping).'}
                        </p>
                        <div className="mt-4 max-h-48 overflow-y-auto rounded border border-slate-800 bg-slate-900/50 p-2">
                            {confirmDialog.eventIds.slice(0, 8).map((id) => (
                                <div key={id} className="truncate py-1 text-sm text-slate-300">
                                    {eventTitleMap.get(id) || id}
                                </div>
                            ))}
                            {confirmDialog.eventIds.length > 8 && (
                                <div className="py-1 text-xs text-slate-500">
                                    + {confirmDialog.eventIds.length - 8} more events
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleConfirmBulkOperation}
                                disabled={loading}
                            >
                                {confirmDialog.mode === 'enrich' ? 'Scrape & Enrich' : 'Infer'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Modal */}
            {shortcutsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
                    <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100">Keyboard Shortcuts</h2>
                                <p className="text-sm text-slate-400">Speed through enrichment without touching your mouse.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(false)} className="text-slate-300 hover:bg-slate-800">
                                <MaterialIcon name="close" size={16} />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {[
                                { keys: 'e', description: 'Scrape & Enrich selected events' },
                                { keys: 'i', description: 'Infer metadata for selected events' },
                                { keys: 'r', description: 'Refresh list' },
                                { keys: '/', description: 'Focus search' },
                                { keys: '?', description: 'Show this help' },
                                { keys: 'Esc', description: 'Close dialogs/modals' },
                            ].map((shortcut) => (
                                <div key={shortcut.keys} className="flex items-center justify-between gap-3 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
                                    <span className="font-mono text-xs uppercase tracking-wide text-slate-200">
                                        {shortcut.keys}
                                    </span>
                                    <span className="text-sm text-slate-300">{shortcut.description}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-center text-xs text-slate-500">Press Esc to close.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
