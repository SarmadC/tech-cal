/**
 * Update Queue Client Component
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import EventPreviewPanel, { type QueueItemPreview } from '@/components/admin/EventPreviewPanel';
import UpdateQueueSignalBadges from '@/components/admin/UpdateQueueSignalBadges';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import useAdminHotkeys from '@/components/admin/useAdminHotkeys';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { MaterialIcon } from '@/components/ui/Icon';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { formatQueueFieldLabel, type UpdateQueueSignalKey, type UpdateQueueSignals } from '@/lib/admin/updateQueueTriage';

const TRIAGE_FILTERS: Array<{
    id: 'pending' | 'needs_review' | 'schedule_change' | 'starts_soon' | 'past_event' | 'all';
    label: string;
    status?: 'pending' | 'all';
    signal?: UpdateQueueSignalKey;
}> = [
    { id: 'pending', label: 'Pending', status: 'pending' },
    { id: 'needs_review', label: 'Needs Review', status: 'pending', signal: 'needs_review' },
    { id: 'schedule_change', label: 'Schedule Changes', status: 'pending', signal: 'schedule_change' },
    { id: 'starts_soon', label: 'Starts Soon', status: 'pending', signal: 'starts_soon' },
    { id: 'past_event', label: 'Past Events', status: 'pending', signal: 'past_event' },
    { id: 'all', label: 'All', status: 'all' },
] as const;

const PAGE_SIZE_STORAGE_KEY = 'techcal.admin.updateQueue.pageSize';
const COLUMNS_STORAGE_KEY = 'techcal.admin.updateQueue.columns';
const SCROLL_STATE_STORAGE_KEY = 'techcal.admin.updateQueue.scrollState';

type ColumnVisibility = {
    startDate: boolean;
    signals: boolean;
    status: boolean;
    metrics: boolean;
    created: boolean;
    actions: boolean;
};

type BulkActionType = 'approve' | 'reject' | 'pending';

const BULK_ACTION_COPY: Record<
    BulkActionType,
    { title: string; description: string; confirmLabel: string; tone: 'neutral' | 'danger' }
> = {
    approve: {
        title: 'Approve selected updates',
        description: 'Approve all pending fields for each selected update and apply them to their events.',
        confirmLabel: 'Approve all',
        tone: 'neutral',
    },
    reject: {
        title: 'Reject selected updates',
        description: 'Reject all pending fields for the selected updates and mark them as reviewed.',
        confirmLabel: 'Reject all',
        tone: 'danger',
    },
    pending: {
        title: 'Mark selected as pending',
        description: 'Move the selected updates back to pending for re-review.',
        confirmLabel: 'Mark pending',
        tone: 'neutral',
    },
};

interface QueueItem {
    id: string;
    event_id: string;
    source_event_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'partially_approved';
    requires_review_reason?: string;
    created_at: string;
    signals: UpdateQueueSignals;
    changedFieldNames: string[];
    event?: {
        id: string;
        title: string;
        start_time: string | null;
        organizer?: {
            id: string;
            name: string;
        };
    };
    fieldCounts: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

const statusBadgeStyles: Record<QueueItem['status'], string> = {
    pending: 'bg-amber-500/20 text-amber-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
    rejected: 'bg-rose-500/20 text-rose-300',
    auto_applied: 'bg-sky-500/20 text-sky-300',
    partially_approved: 'bg-purple-500/20 text-purple-300',
};

export default function UpdateQueueClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const statusParam = searchParams.get('status') ?? 'pending';
    const signalParam = (searchParams.get('signal') as UpdateQueueSignalKey | null) ?? null;
    const sortParam = searchParams.get('sort') ?? 'event_start_time';
    const directionFromQuery = searchParams.get('direction');
    const directionParam =
        directionFromQuery === 'desc'
            ? 'desc'
            : directionFromQuery === 'asc'
                ? 'asc'
                : sortParam === 'created_at'
                    ? 'desc'
                    : 'asc';
    const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;
    const pageSizeParam = Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20;
    const queryParam = searchParams.get('q') ?? '';

    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clearing, setClearing] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState<BulkActionType | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [bulkActionError, setBulkActionError] = useState<string | null>(null);
    const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([]);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [pagination, setPagination] = useState({
        page: pageParam,
        pageSize: pageSizeParam,
        total: 0,
        totalPages: 0,
    });
    const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
        startDate: true,
        signals: true,
        status: true,
        metrics: true,
        created: true,
        actions: true,
    });
    const [columnsPanelOpen, setColumnsPanelOpen] = useState(false);
    const [previewItem, setPreviewItem] = useState<QueueItemPreview | null>(null);

    const [searchTerm, setSearchTerm] = useState(queryParam);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const {
        setTitle,
        setSubtitle,
        setSearch,
        setQuickFilters,
        setToolbarContent,
        focusSearch,
    } = useAdminToolbar();
    const { showSuccess, showError, showInfo } = useSnackbar();

    const columnsPanelRef = useRef<HTMLDivElement>(null);
    const fetchAbortControllerRef = useRef<AbortController | null>(null);
    const fetchRequestIdRef = useRef(0);
    const didRestoreScrollRef = useRef(false);
    const currentQueueUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    const updateQuery = useCallback(
        (updates: Record<string, string | number | undefined>, options: { resetPage?: boolean } = {}) => {
            const next = new URLSearchParams(searchParams.toString());

            Object.entries(updates).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            });

            if (options.resetPage && updates.page === undefined) {
                next.set('page', '1');
            }

            const searchString = next.toString();
            router.replace(searchString ? `${pathname}?${searchString}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    useEffect(() => {
        setTitle('Update Queue');
        setSubtitle('Review ingestion merges, auto-applied updates, and manual overrides at scale.');
    }, [setTitle, setSubtitle]);

    useEffect(() => {
        setSearch({
            placeholder: 'Search titles, organizers, event or source IDs',
            ariaLabel: 'Search update queue by event title, organizer, event ID, or source ID',
            value: searchTerm,
            onChange: (value: string) => {
                setSearchTerm(value);
            },
            onSubmit: (value: string) => {
                setSearchTerm(value);
                updateQuery({ q: value || undefined, page: 1 }, { resetPage: true });
            },
        });

        return () => {
            setSearch(undefined);
        };
    }, [searchTerm, setSearch, updateQuery]);

    useEffect(() => {
        if (debouncedSearchTerm === queryParam) return;
        updateQuery({ q: debouncedSearchTerm || undefined, page: 1 }, { resetPage: true });
    }, [debouncedSearchTerm, queryParam, updateQuery]);

    useEffect(() => {
        setToolbarContent(undefined);
        return () => setToolbarContent(undefined);
    }, [setToolbarContent]);

    useEffect(() => {
        setSearchTerm(queryParam);
    }, [queryParam]);

    useEffect(() => {
        setQuickFilters(
            TRIAGE_FILTERS.map((option) => ({
                id: option.id,
                label: option.label,
                active:
                    (option.status ?? 'pending') === statusParam &&
                    (option.signal ?? null) === signalParam,
                onToggle: () => {
                    setSelectedRows([]);
                    updateQuery(
                        {
                            status: option.status === 'all' ? 'all' : option.status ?? 'pending',
                            signal: option.signal,
                            page: 1,
                        },
                        { resetPage: true }
                    );
                },
            }))
        );
    }, [setQuickFilters, signalParam, statusParam, updateQuery]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!searchParams.has('pageSize')) {
            const storedPageSize = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
            const parsed = storedPageSize ? Number.parseInt(storedPageSize, 10) : null;
            if (parsed && !Number.isNaN(parsed) && parsed !== pageSizeParam) {
                updateQuery({ pageSize: parsed });
            }
        }
    }, [pageSizeParam, searchParams, updateQuery]);

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
        window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSizeParam));
    }, [pageSizeParam]);

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

    useEffect(() => {
        return () => {
            fetchAbortControllerRef.current?.abort();
            fetchAbortControllerRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || loading || didRestoreScrollRef.current) return;

        const rawState = window.sessionStorage.getItem(SCROLL_STATE_STORAGE_KEY);
        if (!rawState) {
            didRestoreScrollRef.current = true;
            return;
        }

        try {
            const parsed = JSON.parse(rawState) as { url?: string; y?: number };
            if (parsed.url === currentQueueUrl && typeof parsed.y === 'number') {
                window.requestAnimationFrame(() => {
                    window.scrollTo({ top: parsed.y, behavior: 'auto' });
                });
            }
        } catch {
            // ignore parse failures
        } finally {
            window.sessionStorage.removeItem(SCROLL_STATE_STORAGE_KEY);
            didRestoreScrollRef.current = true;
        }
    }, [currentQueueUrl, loading]);

    const rememberQueueView = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.sessionStorage.setItem(
            SCROLL_STATE_STORAGE_KEY,
            JSON.stringify({
                url: currentQueueUrl,
                y: window.scrollY,
            })
        );
    }, [currentQueueUrl]);

    const fetchQueueItems = useCallback(async () => {
        const requestId = ++fetchRequestIdRef.current;
        fetchAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        fetchAbortControllerRef.current = abortController;

        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams();
            if (statusParam !== 'all') {
                query.set('status', statusParam);
            }
            if (signalParam) {
                query.set('signal', signalParam);
            }
            query.set('page', String(pageParam));
            query.set('pageSize', String(pageSizeParam));
            query.set('sort', sortParam);
            query.set('direction', directionParam);
            if (queryParam) {
                query.set('q', queryParam);
            }

            const response = await fetch(`/api/admin/ingestion/update-queue?${query.toString()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                signal: abortController.signal,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = errorData.error || `HTTP ${response.status}: Failed to fetch queue items`;
                if (requestId !== fetchRequestIdRef.current) {
                    return;
                }
                if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
                    setError(
                        'Database tables not found. Please run migrations: 20250101000010, 20250101000011, 20250101000012'
                    );
                } else {
                    setError(errorMessage);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (requestId !== fetchRequestIdRef.current) {
                return;
            }
            setItems(data.items || []);
            setPagination(
                data.pagination || {
                    page: pageParam,
                    pageSize: pageSizeParam,
                    total: data.items?.length ?? 0,
                    totalPages: data.pagination?.totalPages ?? Math.max(1, Math.ceil((data.pagination?.total ?? data.items?.length ?? 0) / pageSizeParam)),
                }
            );
            setSelectedRows([]);
        } catch (err) {
            if (requestId !== fetchRequestIdRef.current) {
                return;
            }
            if (err instanceof DOMException && err.name === 'AbortError') {
                return;
            }
            console.error('Error fetching queue items:', err);
        } finally {
            if (fetchAbortControllerRef.current === abortController) {
                fetchAbortControllerRef.current = null;
            }
            if (requestId === fetchRequestIdRef.current) {
                setLoading(false);
            }
        }
    }, [statusParam, signalParam, pageParam, pageSizeParam, sortParam, directionParam, queryParam]);

    useEffect(() => {
        fetchQueueItems();
    }, [fetchQueueItems]);

    useEffect(() => {
        setSelectedRows((prev) =>
            prev.filter((id) => items.some((item) => item.id === id))
        );
    }, [items]);

    const selectedItemsForBulk = useMemo(() => {
        if (bulkTargetIds.length === 0) return [];
        const targetSet = new Set(bulkTargetIds);
        return items.filter((item) => targetSet.has(item.id));
    }, [bulkTargetIds, items]);

    const handleClearPending = useCallback(async () => {
        setClearing(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/ingestion/update-queue', {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to clear pending updates.' }));
                throw new Error(errorData.error || `HTTP ${response.status}: Failed to clear pending updates.`);
            }

            const { cleared = 0 } = await response.json().catch(() => ({ cleared: 0 }));

            showSuccess(`Cleared ${cleared} pending ${cleared === 1 ? 'update' : 'updates'}.`);
            updateQuery({ page: 1 }, { resetPage: true });
            // Wait for router to settle before re-fetching to avoid stale closure values
            await new Promise(resolve => setTimeout(resolve, 100));
            await fetchQueueItems();
        } catch (err) {
            console.error('Error clearing pending queue items:', err);
            const message = err instanceof Error ? err.message : 'Failed to clear pending updates.';
            setError(message);
            showError(message);
        } finally {
            setClearing(false);
        }
    }, [fetchQueueItems, showError, showSuccess, updateQuery]);

    // Inline row action state and handler
    const [rowActionLoading, setRowActionLoading] = useState<Record<string, boolean>>({});

    const handleRowAction = useCallback(async (id: string, action: 'approve' | 'reject') => {
        setRowActionLoading(prev => ({ ...prev, [id]: true }));
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${id}?action=${action}`,
                { method: 'POST' }
            );
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${action}`);
            }
            showSuccess(`Update ${action === 'approve' ? 'approved' : 'rejected'}`);
            await fetchQueueItems();
        } catch (err) {
            showError(err instanceof Error ? err.message : `Failed to ${action}`);
        } finally {
            setRowActionLoading(prev => ({ ...prev, [id]: false }));
        }
    }, [fetchQueueItems, showError, showSuccess]);

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

    const moveSelection = useCallback(
        (direction: 'next' | 'prev') => {
            if (items.length === 0) return;
            const ids = items.map((item) => item.id);
            setSelectedRows((prev) => {
                if (prev.length === 0) {
                    const fallback = direction === 'next' ? ids[0] : ids[ids.length - 1];
                    return [fallback];
                }
                const currentId = prev[prev.length - 1];
                const currentIndex = ids.indexOf(currentId);
                if (currentIndex === -1) {
                    const fallback = direction === 'next' ? ids[0] : ids[ids.length - 1];
                    return [fallback];
                }
                const nextIndex =
                    direction === 'next'
                        ? Math.min(ids.length - 1, currentIndex + 1)
                        : Math.max(0, currentIndex - 1);
                return [ids[nextIndex]];
            });
        },
        [items]
    );

    const triggerBulkAction = useCallback(
        (action: BulkActionType) => {
            if (selectedRows.length === 0) {
                showInfo('Select rows before triggering bulk actions.');
                return;
            }

            setBulkAction(action);
            setBulkTargetIds(selectedRows);
            setBulkActionError(null);
            setBulkDialogOpen(true);
        },
        [selectedRows, showInfo]
    );

    const performBulkAction = useCallback(async () => {
        if (!bulkAction) return;

        const targetIds = (bulkTargetIds.length > 0 ? bulkTargetIds : selectedRows).filter(Boolean);
        if (targetIds.length === 0) {
            setBulkDialogOpen(false);
            showInfo('Select rows before triggering bulk actions.');
            return;
        }

        setBulkActionLoading(true);
        setBulkActionError(null);
        setBulkProgress({ current: 0, total: targetIds.length });

        const actionParam = bulkAction === 'pending' ? 'reset' : bulkAction;
        const actionLabel = bulkAction === 'pending' ? 'mark pending' : bulkAction;

        let successCount = 0;
        const failures: string[] = [];

        for (let i = 0; i < targetIds.length; i++) {
            const id = targetIds[i];
            setBulkProgress({ current: i + 1, total: targetIds.length });

            try {
                const response = await fetch(
                    `/api/admin/ingestion/update-queue/${id}?action=${actionParam}`,
                    { method: 'POST' }
                );

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    failures.push(payload.error || `Failed to ${actionLabel} ${id}`);
                    continue;
                }

                successCount += 1;
            } catch (error) {
                failures.push(error instanceof Error ? error.message : `Failed to ${actionLabel} ${id}`);
            }
        }

        if (successCount > 0) {
            const noun = successCount === 1 ? 'update' : 'updates';
            showSuccess(`Bulk ${actionLabel} succeeded for ${successCount} ${noun}.`);
        }

        if (failures.length > 0) {
            setBulkActionError(failures.join(' • '));
            showError(`Some items failed to ${actionLabel}.`);
        } else {
            setBulkDialogOpen(false);
            setBulkTargetIds([]);
            setBulkAction(null);
        }

        setBulkActionLoading(false);
        await fetchQueueItems();
        setSelectedRows([]);
    }, [bulkAction, bulkTargetIds, fetchQueueItems, selectedRows, showError, showInfo, showSuccess]);

    useAdminHotkeys({
        focusSearch,
        openHelp: () => setShortcutsOpen(true),
        onApproveSelected: () => triggerBulkAction('approve'),
        onRejectSelected: () => triggerBulkAction('reject'),
        onMarkPending: () => triggerBulkAction('pending'),
        onNavigateNext: () => moveSelection('next'),
        onNavigatePrevious: () => moveSelection('prev'),
    });

    useEffect(() => {
        if (!shortcutsOpen) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShortcutsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [shortcutsOpen]);

    const columns: AdminDataTableColumn<QueueItem>[] = useMemo(() => {
        const base: AdminDataTableColumn<QueueItem>[] = [
            {
                key: 'event',
                header: 'Event',
                render: (item) => (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground-primary">
                                {item.event?.title ?? 'Untitled Event'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-tertiary">
                            <span>{item.event?.organizer?.name ?? 'Unknown organizer'}</span>
                            <span>Update ID: {item.id}</span>
                            {item.source_event_id && <span>Source ID: {item.source_event_id}</span>}
                        </div>
                    </div>
                ),
                width: 260,
            },
        ];

        if (visibleColumns.startDate) {
            base.push({
                key: 'event_start_time',
                header: 'Start Date',
                sortable: true,
                render: (item) => (
                    item.event?.start_time ? (
                        <div className="flex flex-col text-xs text-foreground-tertiary">
                            <span>{format(new Date(item.event.start_time), 'MMM d, yyyy HH:mm')}</span>
                            <span className="text-foreground-muted">
                                {formatDistanceToNow(new Date(item.event.start_time), { addSuffix: true })}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs text-foreground-muted">No date</span>
                    )
                ),
                width: 170,
            });
        }

        if (visibleColumns.signals) {
            base.push({
                key: 'signals',
                header: 'Signals',
                render: (item) => (
                    <div className="min-w-[180px]">
                        <UpdateQueueSignalBadges signals={item.signals} compact />
                    </div>
                ),
                width: 220,
            });
        }

        if (visibleColumns.status) {
            base.push({
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (item) => (
                    <Badge className={cn('px-3 py-1 text-[11px] font-medium uppercase tracking-wide', statusBadgeStyles[item.status])}>
                        {item.status.replace('_', ' ')}
                    </Badge>
                ),
                align: 'center',
                width: 120,
            });
        }

        if (visibleColumns.metrics) {
            base.push({
                key: 'pending_fields',
                header: 'Fields',
                sortable: true,
                render: (item) => (
                    <div className="flex flex-col gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-foreground-muted">{item.fieldCounts.total} total</span>
                            {item.fieldCounts.pending > 0 && (
                                <span className="text-amber-300">{item.fieldCounts.pending} pending</span>
                            )}
                            {item.fieldCounts.approved > 0 && (
                                <span className="text-emerald-300">{item.fieldCounts.approved} approved</span>
                            )}
                            {item.fieldCounts.rejected > 0 && (
                                <span className="text-rose-300">{item.fieldCounts.rejected} rejected</span>
                            )}
                        </div>
                        {item.changedFieldNames.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {item.changedFieldNames.slice(0, 3).map((fieldName) => (
                                    <span
                                        key={fieldName}
                                        className="rounded border border-default/60 bg-background-secondary px-2 py-1 text-[11px] text-foreground-secondary"
                                    >
                                        {formatQueueFieldLabel(fieldName)}
                                    </span>
                                ))}
                                {item.changedFieldNames.length > 3 && (
                                    <span className="text-[11px] text-foreground-muted">
                                        +{item.changedFieldNames.length - 3} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ),
                width: 320,
            });
        }

        if (visibleColumns.created) {
            base.push({
                key: 'created_at',
                header: 'Queued',
                sortable: true,
                render: (item) => (
                    <div className="flex flex-col text-xs text-foreground-tertiary">
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
            base.push({
                key: 'actions',
                header: '',
                render: (item) => {
                    const isLoading = rowActionLoading[item.id];
                    const isPending = item.status === 'pending';
                    return (
                        <div className="flex items-center justify-end gap-1.5">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewItem(item);
                                }}
                                className="rounded border border-default/70 bg-background-secondary px-2 py-1.5 text-[11px] text-foreground-secondary transition-colors hover:bg-background-tertiary hover:text-foreground-primary"
                                title="Preview update"
                            >
                                Preview
                            </button>
                            {isPending && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowAction(item.id, 'approve');
                                        }}
                                        disabled={isLoading}
                                        className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                                        title="Approve all fields"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRowAction(item.id, 'reject');
                                        }}
                                        disabled={isLoading}
                                        className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/15 disabled:opacity-50"
                                        title="Reject all fields"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                            <Link
                                href={`/admin/ingestion/update-queue/${item.id}?returnTo=${encodeURIComponent(currentQueueUrl)}`}
                                scroll={false}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    rememberQueueView();
                                }}
                                className="rounded p-1.5 text-foreground-tertiary transition-colors hover:bg-background-tertiary hover:text-foreground-secondary"
                                title="Open full review"
                            >
                                <MaterialIcon name="arrow-up-right" size={16} />
                            </Link>
                        </div>
                    );
                },
                align: 'right',
                width: 210,
            });
        }

        return base;
    }, [visibleColumns, rowActionLoading, handleRowAction, currentQueueUrl, rememberQueueView, setPreviewItem]);

    const bulkActions = useMemo(
        () => [
            {
                id: 'bulk-approve',
                label: 'Approve',
                icon: <MaterialIcon name="check" size={14} />,
                shortcut: 'a',
                tooltip: 'Approve all pending fields for the selected updates.',
                disabled: loading || selectedRows.length === 0,
                onSelect: () => triggerBulkAction('approve'),
            },
            {
                id: 'bulk-reject',
                label: 'Reject',
                icon: <MaterialIcon name="clear" size={14} />,
                shortcut: 'r',
                tooltip: 'Reject all pending fields for the selected updates.',
                disabled: loading || selectedRows.length === 0,
                onSelect: () => triggerBulkAction('reject'),
            },
            {
                id: 'bulk-reset',
                label: 'Mark pending',
                icon: <MaterialIcon name="refresh" size={14} />,
                shortcut: 'p',
                tooltip: 'Move selected updates back to pending for re-review.',
                disabled: loading || selectedRows.length === 0,
                onSelect: () => triggerBulkAction('pending'),
            },
        ],
        [loading, selectedRows.length, triggerBulkAction]
    );

    const tableToolbar = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-foreground-tertiary">
                {loading
                    ? 'Loading...'
                    : `Showing ${items.length} of ${pagination.total || items.length} items`}
            </div>
            <div className="flex items-center gap-2">
                <div ref={columnsPanelRef} className="relative">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setColumnsPanelOpen((prev) => !prev)}
                        className="bg-background-secondary/60 text-foreground-secondary hover:bg-background-tertiary"
                        aria-expanded={columnsPanelOpen}
                        aria-haspopup="true"
                    >
                        <MaterialIcon name="settings" size={14} />
                        Columns
                    </Button>
                    {columnsPanelOpen && (
                        <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-default bg-background-main p-3 shadow-xl">
                            <p className="mb-2 text-xs font-semibold uppercase text-foreground-tertiary">Visible columns</p>
                            <div className="space-y-2 text-sm text-foreground-secondary">
                                {(
                                    [
                                        ['startDate', 'Start date'],
                                        ['signals', 'Triage signals'],
                                        ['status', 'Status & badges'],
                                        ['metrics', 'Field metrics'],
                                        ['created', 'Queued date'],
                                        ['actions', 'Quick actions'],
                                    ] as Array<[keyof ColumnVisibility, string]>
                                ).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-default bg-background-secondary text-primary focus:ring-2 focus:ring-primary"
                                            checked={visibleColumns[key]}
                                            onChange={() => toggleColumnVisibility(key)}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="mt-3 text-[11px] text-foreground-muted">
                                Preferences sync to your browser.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const viewControls = (
        <div className="flex items-center justify-end gap-2">
            {statusParam === 'pending' && (
                <ConfirmationDialog
                    triggerLabel="Clear pending"
                    title="Clear all pending updates?"
                    description="This permanently deletes every pending queue entry. This action cannot be undone."
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="destructive"
                    onConfirm={handleClearPending}
                    disabled={clearing || loading}
                />
            )}
            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShortcutsOpen(true)}
                className="text-foreground-muted hover:text-foreground-secondary"
            >
                <MaterialIcon name="info" size={14} />
                <span className="hidden sm:inline">Shortcuts</span>
            </Button>
        </div>
    );

    const activeBulkMeta = bulkAction ? BULK_ACTION_COPY[bulkAction] : null;
    const bulkSelectionCount = bulkTargetIds.length || selectedRows.length;

    return (
        <div className="space-y-5">
            {bulkDialogOpen && activeBulkMeta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-lg border border-default bg-background-main p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-foreground-tertiary">Bulk review</p>
                                <h3 className="text-lg font-semibold text-foreground-primary">{activeBulkMeta.title}</h3>
                                <p className="mt-2 text-sm text-foreground-tertiary">
                                    {activeBulkMeta.description}{' '}
                                    This will affect {bulkSelectionCount} {bulkSelectionCount === 1 ? 'update' : 'updates'}.
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => !bulkActionLoading && setBulkDialogOpen(false)}
                                disabled={bulkActionLoading}
                                className="text-foreground-tertiary hover:text-foreground-primary"
                                aria-label="Close bulk review dialog"
                            >
                                <MaterialIcon name="close" size={16} />
                            </Button>
                        </div>

                        <div className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-md border border-default/60 bg-background-secondary/40 p-3">
                            {selectedItemsForBulk.length === 0 && (
                                <p className="text-sm text-foreground-tertiary">No rows selected.</p>
                            )}
                            {selectedItemsForBulk.slice(0, 8).map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-3 rounded border border-transparent px-2 py-1 hover:border-default"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground-primary">
                                            {item.event?.title ?? 'Untitled Event'}
                                        </span>
                                        <span className="text-xs text-foreground-muted">Update ID: {item.id}</span>
                                    </div>
                                    <Badge
                                        className={cn(
                                            'px-2 py-1 text-[11px] uppercase tracking-wide',
                                            statusBadgeStyles[item.status]
                                        )}
                                    >
                                        {item.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            ))}
                            {selectedItemsForBulk.length > 8 && (
                                <p className="pt-1 text-xs text-foreground-tertiary">
                                    +{selectedItemsForBulk.length - 8} more selected
                                </p>
                            )}
                        </div>

                        {bulkActionError && (
                            <div className="mt-3 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                                {bulkActionError}
                            </div>
                        )}

                        {/* Progress Bar */}
                        {bulkActionLoading && bulkProgress.total > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs text-foreground-tertiary mb-2">
                                    <span>Processing...</span>
                                    <span>{bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-background-tertiary overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-200 ease-out"
                                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setBulkDialogOpen(false)}
                                disabled={bulkActionLoading}
                                className="border-default text-foreground-secondary"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant={activeBulkMeta.tone === 'danger' ? 'destructive' : 'secondary'}
                                onClick={performBulkAction}
                                disabled={bulkActionLoading || selectedItemsForBulk.length === 0}
                            >
                                {bulkActionLoading
                                    ? `Processing ${bulkProgress.current}/${bulkProgress.total}…`
                                    : activeBulkMeta.confirmLabel}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-100">
                    <div>
                        <strong className="block text-sm font-semibold">Error</strong>
                        <p className="text-sm">{error}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-rose-200 hover:bg-rose-500/20">
                        Dismiss
                    </Button>
                </div>
            )}

            {viewControls}

            <AdminDataTable
                columns={columns}
                rows={items}
                getRowId={(item) => item.id}
                sortKey={sortParam}
                sortDirection={directionParam}
                onSortChange={(key, direction) => {
                    updateQuery({ sort: key, direction, page: 1 }, { resetPage: true });
                }}
                isLoading={loading}
                selectable
                selectedRowIds={selectedRows}
                onSelectionChange={setSelectedRows}
                bulkActions={bulkActions}
                page={pageParam}
                pageSize={pageSizeParam}
                total={pagination.total}
                onPageChange={(nextPage) => updateQuery({ page: nextPage })}
                onPageSizeChange={(nextSize) => updateQuery({ pageSize: nextSize, page: 1 }, { resetPage: true })}
                toolbar={tableToolbar}
                onRowClick={(item) => setPreviewItem(item)}
            />

            {shortcutsOpen && (
                <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
            )}

            {previewItem && (
                <EventPreviewPanel
                    item={previewItem}
                    returnTo={currentQueueUrl}
                    onClose={() => setPreviewItem(null)}
                    onOpenFullReview={rememberQueueView}
                    onActionComplete={() => {
                        setPreviewItem(null);
                        fetchQueueItems();
                    }}
                />
            )}
        </div>
    );
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
    const shortcuts: Array<{ keys: string; description: string }> = [
        { keys: 'g u', description: 'Go to Update Queue' },
        { keys: 'g m', description: 'Go to Moderation' },
        { keys: 'g e', description: 'Go to Enrichment' },
        { keys: '/', description: 'Focus search' },
        { keys: 'j / k', description: 'Move selection down/up' },
        { keys: 'a', description: 'Approve selected items' },
        { keys: 'r', description: 'Reject selected items' },
        { keys: 'p', description: 'Mark selected as pending' },
        { keys: '?', description: 'Show this help' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/80 backdrop-blur">
            <div className="w-full max-w-md rounded-xl border border-default bg-background-main p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground-primary">Keyboard shortcuts</h2>
                        <p className="text-sm text-foreground-tertiary">Speed through high-volume review without touching your mouse.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground-tertiary hover:bg-background-tertiary">
                        <MaterialIcon name="close" size={16} />
                    </Button>
                </div>
                <div className="space-y-3">
                    {shortcuts.map((shortcut) => (
                        <div key={shortcut.keys} className="flex items-center justify-between gap-3 rounded-md border border-default/60 bg-background-secondary/60 px-3 py-2">
                            <span className="text-xs font-mono uppercase tracking-wide text-foreground-secondary">
                                {shortcut.keys}
                            </span>
                            <span className="text-sm text-foreground-tertiary">{shortcut.description}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-center text-xs text-foreground-muted">Press Esc to close.</p>
            </div>
        </div>
    );
}
