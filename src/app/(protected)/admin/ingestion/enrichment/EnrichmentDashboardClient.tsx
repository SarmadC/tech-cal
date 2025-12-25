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
                        <div className="flex flex-col gap-1">
                            <div className="font-medium text-slate-100">{event.title}</div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                {event.ingestion_source_id && (
                                    <span className="inline-flex items-center gap-1 rounded border border-slate-800/50 bg-slate-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                        <MaterialIcon name="label" size={12} />
                                        {event.ingestion_source_id}
                                    </span>
                                )}
                                <span className="text-slate-500">{formatDistanceToNow(new Date(event.start_time), { addSuffix: true })}</span>
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
                    render: (event) => (
                        <div className="flex flex-col gap-1 text-xs text-slate-300">
                            <Badge className={statusBadgeStyles[event.enrichment_status] ?? 'bg-slate-800 text-slate-100'}>
                                {event.enrichment_status}
                            </Badge>
                            {event.enrichment_metadata?.last_error && (
                                <span className="text-amber-200 text-[11px] leading-snug whitespace-pre-wrap break-words">
                                    {event.enrichment_metadata.last_error}
                                </span>
                            )}
                        </div>
                    ),
                    width: 320,
                });
            }

            if (visibleColumns.updated) {
                baseColumns.push({
                    key: 'updated_at',
                    header: 'Updated',
                    render: (event) => (
                        <div className="text-xs text-slate-400">
                            {event.updated_at ? formatDistanceToNow(new Date(event.updated_at), { addSuffix: true }) : '—'}
                        </div>
                    ),
                    width: 140,
                });
            }

            if (visibleColumns.actions) {
                baseColumns.push({
                    key: 'actions',
                    header: 'Actions',
                    align: 'center',
                    render: (event) => (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => triggerEnrichment([event.id])}
                                disabled={loading || !event.source_url}
                                title={!event.source_url ? 'No source URL - use Infer instead' : 'Scrape source URL and extract data'}
                            >
                                Scrape
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerInference([event.id])}
                                disabled={loading}
                                title="Generate description and tags from title (no scraping)"
                            >
                                Infer
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={!event.source_url}
                                onClick={() => window.open(event.source_url, '_blank', 'noopener,noreferrer')}
                                title="Open source URL"
                            >
                                <MaterialIcon name="arrow-up-right" size={14} />
                            </Button>
                        </div>
                    ),
                    width: 220,
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
                <div className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-200">
                            {bulkProgress.active ? (
                                <>
                                    {bulkProgress.mode === 'enrich' ? 'Enriching' : 'Inferring'}{' '}
                                    {bulkProgress.completed}/{bulkProgress.total}...
                                </>
                            ) : (
                                <>
                                    Complete: {bulkProgress.succeeded} succeeded, {bulkProgress.failed} failed
                                </>
                            )}
                        </span>
                        {bulkProgress.active && bulkProgress.currentTitle && (
                            <span className="text-xs text-slate-400 truncate max-w-[300px]">
                                {bulkProgress.currentTitle}
                            </span>
                        )}
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                        />
                    </div>
                    {!bulkProgress.active && bulkProgress.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium text-rose-400">Errors ({bulkProgress.errors.length}):</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {bulkProgress.errors.slice(0, 5).map((err) => (
                                    <div key={err.eventId} className="text-xs text-slate-400">
                                        <span className="text-slate-300">{err.title}:</span>{' '}
                                        <span className="text-rose-300">{err.error}</span>
                                    </div>
                                ))}
                                {bulkProgress.errors.length > 5 && (
                                    <p className="text-xs text-slate-500">
                                        + {bulkProgress.errors.length - 5} more errors
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {!bulkProgress.active && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2"
                            onClick={() => setBulkProgress(null)}
                        >
                            Dismiss
                        </Button>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                    {filteredEvents.length} events (status filter: {statusFilter})
                </div>
                <Button size="sm" variant="ghost" onClick={() => refresh()} disabled={loading}>
                    <MaterialIcon name="refresh" size={14} />
                    Refresh
                </Button>
            </div>

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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">Trigger enrichment and monitor status</span>
                        <div className="flex items-center gap-2">
                            <div ref={columnsPanelRef} className="relative">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setColumnsPanelOpen((prev) => !prev)}
                                    className="bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                                    aria-expanded={columnsPanelOpen}
                                    aria-haspopup="true"
                                >
                                    <MaterialIcon name="settings" size={14} />
                                    Columns
                                </Button>
                                {columnsPanelOpen && (
                                    <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-950 p-3 shadow-xl">
                                        <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Visible columns</p>
                                        <div className="space-y-2 text-sm text-slate-200">
                                            {(
                                                [
                                                    ['status', 'Status & errors'],
                                                    ['updated', 'Last updated'],
                                                    ['actions', 'Quick actions'],
                                                ] as Array<[keyof ColumnVisibility, string]>
                                            ).map(([key, label]) => (
                                                <label key={key} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-primary focus:ring-2 focus:ring-primary"
                                                        checked={visibleColumns[key]}
                                                        onChange={() => toggleColumnVisibility(key)}
                                                    />
                                                    <span>{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="mt-3 text-[11px] text-slate-500">
                                            Preferences sync to your browser.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <a
                                href="/admin/ingestion/update-queue"
                                className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-200"
                            >
                                <MaterialIcon name="arrow_back" size={12} />
                                Back to review queue
                            </a>
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
