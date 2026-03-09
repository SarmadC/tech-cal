'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { EnrichmentMetadata } from '@/types/enrichment';
import { cn } from '@/lib/utils';

const COLUMNS_STORAGE_KEY = 'techcal.admin.enrichment.columns';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const STATUS_FILTERS = ['all', 'pending', 'processing', 'enriched', 'failed'] as const;

type DashboardStatusFilter = (typeof STATUS_FILTERS)[number];

interface StreamProgress {
    type: 'progress' | 'complete' | 'error';
    completed: number;
    total: number;
    currentEventId?: string;
    currentEventTitle?: string;
    result?: {
        eventId: string;
        title?: string;
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
    start_time: string | null;
    source_url: string;
    ingestion_source_id: string | null;
    enrichment_status: string;
    enrichment_metadata: EnrichmentMetadata | null;
    updated_at: string | null;
    review_status?: string | null;
    review_queue_id?: string | null;
}

interface EnrichmentDashboardMetrics {
    futurePending: number;
    pastPending: number;
    unscheduledPending: number;
    reviewPending: number;
    duplicateReviewEntries: number;
    latestEnrichedAt: string | null;
    oldestPendingCreatedAt: string | null;
    oldestPendingAgeDays: number | null;
}

interface EnrichmentDashboardResponse {
    events: EnrichmentEvent[];
    total: number;
    page: number;
    pageSize: number;
    metrics: EnrichmentDashboardMetrics | null;
    statusCounts?: Record<DashboardStatusFilter, number>;
}

const DEFAULT_STATUS_COUNTS: Record<DashboardStatusFilter, number> = {
    all: 0,
    pending: 0,
    processing: 0,
    enriched: 0,
    failed: 0,
};

const formatRelativeTimestamp = (value: string | null, emptyLabel = '—') => {
    if (!value) {
        return emptyLabel;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return emptyLabel;
    }

    return formatDistanceToNow(date, { addSuffix: true });
};

const getExtractedFieldSummary = (metadata: EnrichmentMetadata | null): string[] => {
    const data = metadata?.enriched_data;
    if (!data) {
        return [];
    }

    const summary: string[] = [];

    if (data.description) {
        summary.push('description');
    }
    if (data.location) {
        summary.push('location');
    }
    if (data.registrationUrl) {
        summary.push('registration URL');
    }
    if (data.eventFormat) {
        summary.push('format');
    }
    if (data.pricing && Object.values(data.pricing).some((value) => value !== undefined && value !== null)) {
        summary.push('pricing');
    }
    if (data.speakers?.length) {
        summary.push(`${data.speakers.length} speaker${data.speakers.length === 1 ? '' : 's'}`);
    }
    if (data.agenda?.length) {
        summary.push(`${data.agenda.length} agenda item${data.agenda.length === 1 ? '' : 's'}`);
    }
    if (data.tags?.length) {
        summary.push(`${data.tags.length} tag${data.tags.length === 1 ? '' : 's'}`);
    }

    return summary;
};

export default function EnrichmentDashboardClient() {
    const router = useRouter();
    const [events, setEvents] = useState<EnrichmentEvent[]>([]);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('all');
    const [searchValue, setSearchValue] = useState('');
    const deferredSearchValue = useDeferredValue(searchValue);
    const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
    const [loading, setLoading] = useState(true);
    const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
        status: true,
        updated: true,
        actions: true,
    });
    const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
    const columnsPanelRef = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [total, setTotal] = useState(0);
    const [statusCounts, setStatusCounts] = useState<Record<DashboardStatusFilter, number>>(DEFAULT_STATUS_COUNTS);
    const [dashboardMetrics, setDashboardMetrics] = useState<EnrichmentDashboardMetrics | null>(null);
    const fetchRequestIdRef = useRef(0);

    const [bulkProgress, setBulkProgress] = useState<BulkOperationProgress | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog>({
        open: false,
        mode: 'infer',
        eventIds: [],
    });
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const streamAbortControllerRef = useRef<AbortController | null>(null);
    const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent } = useAdminToolbar();
    const { showInfo, showSuccess, showError } = useSnackbar();

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchValue(deferredSearchValue.trim());
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [deferredSearchValue]);

    useEffect(() => {
        return () => {
            if (streamAbortControllerRef.current) {
                streamAbortControllerRef.current.abort();
                streamAbortControllerRef.current = null;
            }
            if (streamReaderRef.current) {
                void streamReaderRef.current.cancel().catch(() => {});
                streamReaderRef.current = null;
            }
        };
    }, []);

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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

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
                return prev;
            }
            return {
                ...prev,
                [key]: nextValue,
            };
        });
    }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearchValue(value);
        setPage(1);
    }, []);

    const handleStatusFilterChange = useCallback((value: DashboardStatusFilter) => {
        setStatusFilter(value);
        setPage(1);
    }, []);

    useEffect(() => {
        setTitle('LLM Enrichment');
        setSubtitle('Trigger LLM extraction, monitor status, and push to review.');
    }, [setSubtitle, setTitle]);

    useEffect(() => {
        setSearch({
            placeholder: 'Filter by title or source',
            value: searchValue,
            onChange: (value) => handleSearchChange(value ?? ''),
        });
        return () => setSearch(undefined);
    }, [handleSearchChange, searchValue, setSearch]);

    useEffect(() => {
        setToolbarContent(undefined);
        return () => setToolbarContent(undefined);
    }, [setToolbarContent]);

    useEffect(() => {
        setQuickFilters([
            {
                id: 'all',
                label: 'All',
                badge: statusCounts.all > 0 ? statusCounts.all : undefined,
                active: statusFilter === 'all',
                onToggle: () => handleStatusFilterChange('all'),
            },
            {
                id: 'pending',
                label: 'Pending',
                badge: statusCounts.pending || undefined,
                active: statusFilter === 'pending',
                onToggle: () => handleStatusFilterChange('pending'),
            },
            {
                id: 'processing',
                label: 'Processing',
                badge: statusCounts.processing || undefined,
                active: statusFilter === 'processing',
                onToggle: () => handleStatusFilterChange('processing'),
            },
            {
                id: 'enriched',
                label: 'Enriched',
                badge: statusCounts.enriched || undefined,
                active: statusFilter === 'enriched',
                onToggle: () => handleStatusFilterChange('enriched'),
            },
            {
                id: 'failed',
                label: 'Failed',
                badge: statusCounts.failed || undefined,
                active: statusFilter === 'failed',
                onToggle: () => handleStatusFilterChange('failed'),
            },
        ]);
    }, [handleStatusFilterChange, setQuickFilters, statusCounts, statusFilter]);

    useEffect(() => {
        return () => setQuickFilters([]);
    }, [setQuickFilters]);

    const refresh = useCallback(async () => {
        const requestId = ++fetchRequestIdRef.current;
        setLoading(true);

        try {
            const params = new URLSearchParams({
                status: statusFilter,
                page: String(page),
                pageSize: String(pageSize),
            });

            if (debouncedSearchValue) {
                params.set('search', debouncedSearchValue);
            }

            const response = await fetch(`/api/admin/ingestion/enrichment-status?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch enrichment status');
            }

            const data = (await response.json()) as EnrichmentDashboardResponse;
            if (requestId !== fetchRequestIdRef.current) {
                return;
            }

            const nextEvents = data.events ?? [];
            const nextTotal = data.total ?? nextEvents.length;
            const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));

            if (nextEvents.length === 0 && nextTotal > 0 && page > maxPage) {
                setPage(maxPage);
                return;
            }

            const currentPageIds = new Set(nextEvents.map((event) => event.id));

            setEvents(nextEvents);
            setTotal(nextTotal);
            setStatusCounts(data.statusCounts ?? DEFAULT_STATUS_COUNTS);
            setDashboardMetrics(data.metrics ?? null);
            setSelectedRows((prev) => prev.filter((id) => currentPageIds.has(id)));
        } catch (error) {
            if (requestId !== fetchRequestIdRef.current) {
                return;
            }
            console.error(error);
            showError('Failed to refresh enrichment status');
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [debouncedSearchValue, page, pageSize, showError, statusFilter]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const eventTitleMap = useMemo(() => {
        return new Map(events.map((event) => [event.id, event.title]));
    }, [events]);

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

            const endpoint = mode === 'enrich'
                ? '/api/admin/ingestion/enrich-stream'
                : '/api/admin/ingestion/infer-stream';
            let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

            if (streamAbortControllerRef.current) {
                streamAbortControllerRef.current.abort();
            }
            if (streamReaderRef.current) {
                await streamReaderRef.current.cancel().catch(() => {});
                streamReaderRef.current = null;
            }

            const streamController = new AbortController();
            streamAbortControllerRef.current = streamController;

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventIds }),
                    signal: streamController.signal,
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload.error || `Failed to trigger ${mode}`);
                }

                reader = response.body?.getReader() ?? null;
                if (!reader) {
                    throw new Error('No response body');
                }
                streamReaderRef.current = reader;

                const decoder = new TextDecoder();
                let buffer = '';
                const maxBufferSize = 1024 * 1024;

                while (true) {
                    if (streamController.signal.aborted) break;
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    if (buffer.length > maxBufferSize) {
                        console.warn('[EnrichmentDashboard] Stream buffer exceeded maximum size, resetting');
                        buffer = '';
                    }

                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) {
                            continue;
                        }

                        let data: StreamProgress;
                        try {
                            data = JSON.parse(line.slice(6)) as StreamProgress;
                        } catch {
                            // Ignore malformed stream chunks
                            continue;
                        }

                        if (data.type === 'progress') {
                            setBulkProgress((prev) => {
                                if (!prev) return prev;

                                const nextErrors = [...prev.errors];
                                const resultTitle = data.result?.title
                                    ?? data.currentEventTitle
                                    ?? eventTitleMap.get(data.result?.eventId ?? data.currentEventId ?? '')
                                    ?? 'Unknown';

                                if (data.result?.status === 'failed' && data.result.error) {
                                    nextErrors.push({
                                        eventId: data.result.eventId,
                                        title: resultTitle,
                                        error: data.result.error,
                                    });
                                }

                                return {
                                    ...prev,
                                    completed: data.completed,
                                    currentTitle: data.result?.title ?? data.currentEventTitle,
                                    succeeded: prev.succeeded + (data.result?.status === 'enriched' ? 1 : 0),
                                    failed: prev.failed + (data.result?.status === 'failed' ? 1 : 0),
                                    errors: nextErrors,
                                };
                            });
                        } else if (data.type === 'complete') {
                            const succeeded = data.summary?.succeeded ?? 0;
                            const failed = data.summary?.failed ?? 0;

                            setBulkProgress((prev) =>
                                prev
                                    ? {
                                        ...prev,
                                        active: false,
                                        completed: data.total,
                                        succeeded,
                                        failed,
                                    }
                                    : null
                            );

                            if (failed === 0) {
                                showSuccess(
                                    `${mode === 'enrich' ? 'Enriched' : 'Inferred'} ${succeeded} of ${data.total} events.`
                                );
                            } else if (succeeded === 0) {
                                showError(
                                    `${mode === 'enrich' ? 'Scrape' : 'Inference'} failed for ${failed} of ${data.total} events.`
                                );
                            } else {
                                showInfo(
                                    `${mode === 'enrich' ? 'Enriched' : 'Inferred'} ${succeeded} of ${data.total} events. ${failed} failed.`
                                );
                            }
                        } else if (data.type === 'error') {
                            throw new Error(data.error || 'Unknown error');
                        }
                    }
                }

                await refresh();
                setSelectedRows([]);
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error(error);
                showError(error instanceof Error ? error.message : `Failed to ${mode}`);
                setBulkProgress(null);
            } finally {
                if (reader) {
                    await reader.cancel().catch(() => {});
                }
                if (streamReaderRef.current === reader) {
                    streamReaderRef.current = null;
                }
                if (streamAbortControllerRef.current === streamController) {
                    streamAbortControllerRef.current = null;
                }
                setLoading(false);
            }
        },
        [eventTitleMap, refresh, showError, showInfo, showSuccess]
    );

    const triggerEnrichment = useCallback(
        async (eventIds: string[]) => {
            if (eventIds.length === 1) {
                await executeStreamingOperation(eventIds, 'enrich');
            } else {
                setConfirmDialog({ open: true, mode: 'enrich', eventIds });
            }
        },
        [executeStreamingOperation]
    );

    const triggerInference = useCallback(
        async (eventIds: string[]) => {
            if (eventIds.length === 1) {
                await executeStreamingOperation(eventIds, 'infer');
            } else {
                setConfirmDialog({ open: true, mode: 'infer', eventIds });
            }
        },
        [executeStreamingOperation]
    );

    const handleConfirmBulkOperation = useCallback(() => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        void executeStreamingOperation(confirmDialog.eventIds, confirmDialog.mode);
    }, [confirmDialog.eventIds, confirmDialog.mode, executeStreamingOperation]);

    const handleRowClick = useCallback(
        (event: EnrichmentEvent) => {
            router.push(`/admin/ingestion/enrichment/${event.id}`);
        },
        [router]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (event.key === '?' || (event.shiftKey && event.key === '/')) {
                event.preventDefault();
                setShortcutsOpen(true);
            }

            if (event.key === 'Escape') {
                if (shortcutsOpen) {
                    setShortcutsOpen(false);
                } else if (confirmDialog.open) {
                    setConfirmDialog((prev) => ({ ...prev, open: false }));
                } else if (bulkProgress && !bulkProgress.active) {
                    setBulkProgress(null);
                }
            }

            if (!loading && selectedRows.length > 0) {
                if (event.key === 'e' && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    void triggerEnrichment(selectedRows);
                }
                if (event.key === 'i' && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    void triggerInference(selectedRows);
                }
            }

            if (event.key === 'r' && !event.metaKey && !event.ctrlKey && !loading) {
                event.preventDefault();
                void refresh();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [bulkProgress, confirmDialog.open, loading, refresh, selectedRows, shortcutsOpen, triggerEnrichment, triggerInference]);

    const columns: AdminDataTableColumn<EnrichmentEvent>[] = useMemo(() => {
        const nextColumns: AdminDataTableColumn<EnrichmentEvent>[] = [
            {
                key: 'event',
                header: 'Event',
                render: (event) => (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground-primary text-[13px]">{event.title}</div>
                        <div className="flex items-center gap-2 text-[11px] text-foreground-muted">
                            {event.ingestion_source_id && (
                                <span className="font-mono text-foreground-tertiary">
                                    {event.ingestion_source_id}
                                </span>
                            )}
                            <span>•</span>
                            <span>{formatRelativeTimestamp(event.start_time, 'No start time')}</span>
                        </div>
                    </div>
                ),
            },
        ];

        if (visibleColumns.status) {
            nextColumns.push({
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
                        skipped: 'bg-background-tertiary',
                    };
                    const color = statusColors[event.enrichment_status] || 'bg-background-tertiary';
                    const extractedSummary = getExtractedFieldSummary(event.enrichment_metadata);

                    return (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <div className={cn('h-1.5 w-1.5 rounded-full', color)} />
                                <span className="text-[11px] capitalize text-foreground-tertiary">
                                    {event.enrichment_status}
                                </span>
                            </div>
                            {event.review_status && (
                                <span className="text-[10px] text-foreground-muted">
                                    Review: {event.review_status.replace('_', ' ')}
                                </span>
                            )}
                            {extractedSummary.length > 0 && (
                                <span className="text-[10px] leading-snug text-foreground-muted">
                                    Extracted: {extractedSummary.slice(0, 3).join(', ')}
                                    {extractedSummary.length > 3 ? ` +${extractedSummary.length - 3} more` : ''}
                                </span>
                            )}
                            {event.enrichment_status === 'enriched' && !event.review_status && extractedSummary.length === 0 && (
                                <span className="text-[10px] text-foreground-muted">
                                    Scrape succeeded with no visible field diff.
                                </span>
                            )}
                            {event.enrichment_metadata?.last_error && (
                                <span className="text-[10px] leading-snug text-rose-400 line-clamp-2">
                                    {event.enrichment_metadata.last_error}
                                </span>
                            )}
                        </div>
                    );
                },
                width: 220,
            });
        }

        if (visibleColumns.updated) {
            nextColumns.push({
                key: 'updated_at',
                header: 'Updated',
                render: (event) => (
                    <div className="text-[11px] text-foreground-muted">
                        {formatRelativeTimestamp(event.updated_at)}
                    </div>
                ),
                width: 120,
            });
        }

        if (visibleColumns.actions) {
            nextColumns.push({
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (event) => (
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {event.review_queue_id && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-primary"
                                onClick={() => router.push(`/admin/ingestion/update-queue/${event.review_queue_id}`)}
                                title="View review diff"
                            >
                                Review
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-primary"
                            onClick={() => void triggerEnrichment([event.id])}
                            disabled={loading || !event.source_url}
                            title={!event.source_url ? 'No source URL' : 'Scrape'}
                        >
                            Scrape
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-primary"
                            onClick={() => void triggerInference([event.id])}
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
                                className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted hover:bg-background-tertiary hover:text-foreground-tertiary"
                            >
                                <MaterialIcon name="arrow-up-right" size={12} />
                            </a>
                        )}
                    </div>
                ),
                width: 240,
            });
        }

        return nextColumns;
    }, [loading, router, triggerEnrichment, triggerInference, visibleColumns]);

    const bulkActions = useMemo(
        () => [
            {
                id: 'trigger',
                label: 'Scrape & Enrich',
                icon: <MaterialIcon name="arrow-forward" size={14} />,
                disabled: selectedRows.length === 0 || loading,
                onSelect: () => void triggerEnrichment(selectedRows),
            },
            {
                id: 'infer',
                label: 'Infer Metadata (No Scrape)',
                icon: <MaterialIcon name="code" size={14} />,
                disabled: selectedRows.length === 0 || loading,
                onSelect: () => void triggerInference(selectedRows),
            },
            {
                id: 'refresh',
                label: 'Refresh',
                icon: <MaterialIcon name="refresh" size={14} />,
                disabled: loading,
                onSelect: () => void refresh(),
            },
        ],
        [loading, refresh, selectedRows, triggerEnrichment, triggerInference]
    );

    const emptyState = useMemo(() => {
        if (debouncedSearchValue) {
            return (
                <p className="py-10 text-center text-sm text-foreground-muted">
                    No events match “{debouncedSearchValue}”.
                </p>
            );
        }

        if (statusFilter !== 'all') {
            return (
                <p className="py-10 text-center text-sm text-foreground-muted">
                    No {statusFilter} enrichment events found.
                </p>
            );
        }

        return (
            <p className="py-10 text-center text-sm text-foreground-muted">
                No enrichment events found.
            </p>
        );
    }, [debouncedSearchValue, statusFilter]);

    return (
        <div className="space-y-4">
            {dashboardMetrics && (
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
                    {[
                        { label: 'Future Pending', value: dashboardMetrics.futurePending },
                        { label: 'Past Pending', value: dashboardMetrics.pastPending },
                        { label: 'Unscheduled', value: dashboardMetrics.unscheduledPending },
                        { label: 'Review Pending', value: dashboardMetrics.reviewPending },
                        { label: 'Duplicate Reviews', value: dashboardMetrics.duplicateReviewEntries },
                        {
                            label: 'Latest Enriched',
                            value: dashboardMetrics.latestEnrichedAt
                                ? formatRelativeTimestamp(dashboardMetrics.latestEnrichedAt)
                                : '—',
                        },
                        {
                            label: 'Oldest Pending',
                            value: dashboardMetrics.oldestPendingAgeDays !== null
                                ? `${dashboardMetrics.oldestPendingAgeDays}d`
                                : '—',
                        },
                    ].map((metric) => (
                        <div key={metric.label} className="rounded-lg border border-default bg-background-main p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                                {metric.label}
                            </p>
                            <p className="mt-2 text-lg font-semibold text-foreground-primary">
                                {metric.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {bulkProgress && (
                <div className="mb-4 rounded-lg border border-default bg-background-main p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-foreground-tertiary">
                        <span>
                            {bulkProgress.active ? (
                                <>
                                    {bulkProgress.mode === 'enrich' ? 'Enriching' : 'Inferring'}{' '}
                                    <span className="text-foreground-primary">
                                        {bulkProgress.completed}/{bulkProgress.total}
                                    </span>
                                </>
                            ) : (
                                <>
                                    Complete:{' '}
                                    <span className="text-emerald-400">{bulkProgress.succeeded}</span> succeeded,{' '}
                                    <span className="text-rose-400">{bulkProgress.failed}</span> failed
                                </>
                            )}
                        </span>
                        {bulkProgress.active && bulkProgress.currentTitle && (
                            <span className="max-w-[300px] truncate opacity-70">
                                {bulkProgress.currentTitle}
                            </span>
                        )}
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-background-tertiary">
                        <div
                            className="h-full bg-accent-primary transition-all duration-300"
                            style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                        />
                    </div>
                    {!bulkProgress.active && bulkProgress.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400">
                                Errors ({bulkProgress.errors.length})
                            </p>
                            <div className="max-h-40 space-y-1 overflow-y-auto">
                                {bulkProgress.errors.map((error) => (
                                    <div key={`${error.eventId}-${error.error}`} className="text-[11px] text-foreground-muted">
                                        <span className="text-foreground-tertiary">{error.title}:</span>{' '}
                                        <span className="text-rose-400">{error.error}</span>
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
                                className="h-6 text-[11px] text-foreground-tertiary hover:text-foreground-primary"
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
                rows={events}
                getRowId={(event) => event.id}
                sortKey="created_at"
                sortDirection="desc"
                selectable
                selectedRowIds={selectedRows}
                onSelectionChange={setSelectedRows}
                onRowClick={handleRowClick}
                bulkActions={bulkActions}
                isLoading={loading}
                emptyState={emptyState}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    setPage(1);
                }}
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
                                    placeholder="Filter events..."
                                    className="h-7 w-64 rounded-md border border-default bg-background-tertiary pl-8 pr-3 text-[13px] text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                                    value={searchValue}
                                    onChange={(event) => handleSearchChange(event.target.value)}
                                />
                            </div>
                            <div className="mx-1 h-4 w-px bg-accent-primary-light" />
                            <div className="flex items-center gap-1">
                                {STATUS_FILTERS.map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusFilterChange(status)}
                                        className={cn(
                                            'rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                                            statusFilter === status
                                                ? 'bg-accent-primary-light text-foreground-primary'
                                                : 'text-foreground-muted hover:bg-background-tertiary hover:text-foreground-tertiary'
                                        )}
                                    >
                                        {status}
                                        {statusCounts[status] ? (
                                            <span className="ml-1 opacity-50">{statusCounts[status]}</span>
                                        ) : null}
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
                                                    ['status', 'Status'],
                                                    ['updated', 'Last Updated'],
                                                    ['actions', 'Actions'],
                                                ] as Array<[keyof ColumnVisibility, string]>
                                            ).map(([key, label]) => (
                                                <label
                                                    key={key}
                                                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-background-tertiary"
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
                                onClick={() => void refresh()}
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

            {confirmDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg border border-default bg-background-main p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground-primary">
                            {confirmDialog.mode === 'enrich' ? 'Scrape & Enrich' : 'Infer Metadata'}{' '}
                            {confirmDialog.eventIds.length} Events?
                        </h2>
                        <p className="mt-2 text-sm text-foreground-tertiary">
                            {confirmDialog.mode === 'enrich'
                                ? 'This will scrape source URLs and extract event data using LLM.'
                                : 'This will generate descriptions and infer tags from event titles (no web scraping).'}
                        </p>
                        <div className="mt-4 max-h-48 overflow-y-auto rounded border border-default bg-background-secondary/50 p-2">
                            {confirmDialog.eventIds.slice(0, 8).map((id) => (
                                <div key={id} className="truncate py-1 text-sm text-foreground-tertiary">
                                    {eventTitleMap.get(id) || id}
                                </div>
                            ))}
                            {confirmDialog.eventIds.length > 8 && (
                                <div className="py-1 text-xs text-foreground-muted">
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

            {shortcutsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/80 backdrop-blur">
                    <div className="w-full max-w-md rounded-xl border border-default bg-background-main p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground-primary">
                                    Keyboard Shortcuts
                                </h2>
                                <p className="text-sm text-foreground-tertiary">
                                    Speed through enrichment without touching your mouse.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShortcutsOpen(false)}
                                className="text-foreground-tertiary hover:bg-background-tertiary"
                            >
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
                                <div
                                    key={shortcut.keys}
                                    className="flex items-center justify-between gap-3 rounded-md border border-default/60 bg-background-secondary/60 px-3 py-2"
                                >
                                    <span className="font-mono text-xs uppercase tracking-wide text-foreground-primary">
                                        {shortcut.keys}
                                    </span>
                                    <span className="text-sm text-foreground-tertiary">
                                        {shortcut.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
