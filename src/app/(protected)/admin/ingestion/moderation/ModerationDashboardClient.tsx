/**
 * Moderation Dashboard Client Component
 * 
 * Interactive UI for reviewing and moderating events.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import * as Sentry from '@sentry/nextjs';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import useAdminHotkeys from '@/components/admin/useAdminHotkeys';
import { useDebounce } from '@/hooks/useDebounce';
import { MaterialIcon } from '@/components/ui/Icon';
import { useSnackbar } from '@/contexts/SnackbarContext';

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
    const viewParam = searchParams.get('view') ?? 'table';

    const [data, setData] = useState<QueueItem[]>(initialQueueItems);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const viewMode = viewParam === 'cards' ? 'cards' : 'table';

    const [searchTerm, setSearchTerm] = useState(queryParam);
    const debouncedSearch = useDebounce(searchTerm, 250);

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent, focusSearch } = useAdminToolbar();
    const { showSuccess, showError, showInfo } = useSnackbar();

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

    useEffect(() => {
        setQuickFilters(
            statusOptions.map((status) => ({
                id: status,
                label: status === 'all' ? 'All' : status.replace(/_/g, ' '),
                active: status === 'all' ? statusParam === 'all' : statusParam === status,
                badge:
                    status === 'all'
                        ? data.length
                        : data.filter((item) => item.status === status).length || undefined,
                onToggle: () => {
                    setSelectedRows([]);
                    updateQuery({ status: status === 'all' ? undefined : status, page: 1 });
                },
            }))
        );
    }, [data, statusParam, setQuickFilters, statusOptions, updateQuery]);

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
    }, [filteredItems]);

    const handleBulkAction = useCallback(
        async (action: 'approve' | 'reject') => {
            if (selectedRows.length === 0) {
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
                        queueItemIds: selectedRows,
                    }),
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error ?? 'Failed to process moderation action');
                }
                setData((prev) => prev.filter((item) => !selectedRows.includes(item.id)));
                setSelectedRows([]);
                showSuccess(
                    `${action === 'approve' ? 'Approved' : 'Rejected'} ${selectedRows.length} entr${selectedRows.length === 1 ? 'y' : 'ies'} successfully.`
                );
            } catch (err) {
                console.error('Error performing bulk action:', err);
                Sentry.captureException(err);
                showError(err instanceof Error ? err.message : 'Error performing moderation action.');
            } finally {
                setActionLoading(false);
            }
        },
        [selectedRows, showError, showInfo, showSuccess]
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
                        feedback: feedback[item.id] || null,
                    }),
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error ?? 'Failed to process moderation action');
                }
                setData((prev) => prev.filter((entry) => entry.id !== item.id));
                setFeedback((prev) => {
                    const next = { ...prev };
                    delete next[item.id];
                    return next;
                });
                showSuccess(`Marked "${item.events?.title ?? item.source_events?.raw_payload?.record?.title ?? 'Untitled'}" as ${action}.`);
            } catch (err) {
                console.error('Error performing action:', err);
                Sentry.captureException(err);
                showError(err instanceof Error ? err.message : 'Error performing moderation action.');
            } finally {
                setActionLoading(false);
            }
        },
        [feedback, showError, showSuccess]
    );

    const moveSelection = useCallback(
        (direction: 'next' | 'prev') => {
            if (viewMode !== 'table') return;
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
        [paginatedItems, viewMode]
    );

    useAdminHotkeys({
        focusSearch,
        openHelp: () => setShortcutsOpen(true),
        onApproveSelected: () => handleBulkAction('approve'),
        onRejectSelected: () => handleBulkAction('reject'),
        onNavigateNext: () => moveSelection('next'),
        onNavigatePrevious: () => moveSelection('prev'),
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

    useEffect(() => {
        if (viewMode === 'cards' && selectedRows.length) {
            setSelectedRows([]);
        }
    }, [viewMode, selectedRows.length]);

    const columns: AdminDataTableColumn<QueueItem>[] = useMemo(() => [
        {
            key: 'summary',
            header: 'Event',
            render: (item) => {
                const eventTitle =
                    item.events?.title ?? item.source_events?.raw_payload?.record?.title ?? 'Untitled Event';
                const organizer =
                    item.events?.organizer?.name ?? item.source_events?.raw_payload?.record?.organizer ?? 'Unknown organizer';
                return (
                    <div className="flex flex-col gap-2">
                        <div className="font-medium text-slate-100">{eventTitle}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{organizer}</span>
                            <span className="inline-flex items-center gap-1 rounded border border-slate-800/60 bg-slate-900/60 px-2 py-0.5 text-[11px]">
                                <MaterialIcon name="dashboard" size={12} />
                                {item.ingestion_quality_score.toFixed(0)}
                            </span>
                            {item.reason_codes.map((code) => (
                                <Badge key={code} variant="outline" className="bg-slate-900/50 text-[10px] uppercase tracking-wide">
                                    {code.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            header: 'Status',
            align: 'center',
            render: (item) => (
                <Badge className="bg-amber-500/20 px-3 py-1 text-[11px] uppercase tracking-wide text-amber-200">
                    {item.status.replace(/_/g, ' ')}
                </Badge>
            ),
            width: 140,
        },
        {
            key: 'reason',
            header: 'Flagged Reason',
            render: (item) => (
                <div className="text-xs text-slate-300">
                    {item.reason_codes.length === 0 ? (
                        <span className="text-slate-500">No reason captured</span>
                    ) : (
                        item.reason_codes.map((code) => code.replace(/_/g, ' ')).join(', ')
                    )}
                </div>
            ),
        },
        {
            key: 'created_at',
            header: 'Flagged',
            sortable: true,
            render: (item) => (
                <div className="text-xs text-slate-300">
                    <div>{format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</div>
                    <div className="text-slate-500">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </div>
                </div>
            ),
            width: 160,
        },
        {
            key: 'actions',
            header: 'Moderate',
            align: 'center',
            render: (item) => (
                <div className="flex flex-col items-center gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionLoading}
                        onClick={() => handleSingleAction(item, 'approve')}
                        className="w-full"
                    >
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionLoading}
                        onClick={() => handleSingleAction(item, 'reject')}
                        className="w-full"
                    >
                        Reject
                    </Button>
                </div>
            ),
            width: 140,
        },
    ], [actionLoading, handleSingleAction]);

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
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wider text-slate-400">
                {totalItems === 0 ? 'No records match the current filters.' : `Showing ${paginatedItems.length} of ${totalItems} flagged events`}
            </div>
            <Link href="/admin/ingestion/update-queue" className="text-xs text-slate-300 hover:text-slate-50">
                Need the update queue instead?
            </Link>
        </div>
    );

    if (error) {
        return (
            <Card className="border border-rose-500/40 bg-rose-500/10 text-rose-100">
                <CardContent className="p-6 text-sm">
                    Failed to load moderation queue: {error}
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500">View</span>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            onClick={() => updateQuery({ view: 'table' })}
                            aria-pressed={viewMode === 'table'}
                        >
                            Table
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                            onClick={() => updateQuery({ view: 'cards' })}
                            aria-pressed={viewMode === 'cards'}
                        >
                            Cards
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        {selectedRows.length > 0 && <span>{selectedRows.length} selected</span>}
                        <span>Total backlog: {data.length}</span>
                    </div>
                </div>

                {viewMode === 'table' ? (
                    <AdminDataTable
                        columns={columns}
                        rows={paginatedItems}
                        getRowId={(item) => item.id}
                        sortKey="created_at"
                        sortDirection="desc"
                        onSortChange={() => {
                            // sorting not yet implemented - rely on API sort when available
                        }}
                        isLoading={actionLoading && paginatedItems.length === 0}
                        selectable
                        selectedRowIds={selectedRows}
                        onSelectionChange={setSelectedRows}
                        bulkActions={bulkActions}
                        page={currentPage}
                        pageSize={pageSizeParam}
                        total={totalItems}
                        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
                        onPageSizeChange={(size) => updateQuery({ pageSize: size, page: 1 })}
                        toolbar={tableToolbar}
                    />
                ) : (
                    <div className="space-y-4">
                        {paginatedItems.length === 0 ? (
                            <Card className="border border-slate-800/60 bg-slate-950/60">
                                <CardContent className="p-6 text-center text-sm text-slate-400">
                                    No events match the current filters.
                                </CardContent>
                            </Card>
                        ) : (
                            paginatedItems.map((item) => {
                                const event = item.events;
                                const source = item.source_events?.raw_payload?.record;
                                const title = event?.title ?? source?.title ?? 'Untitled Event';
                                const organizer = event?.organizer?.name ?? source?.organizer ?? 'Unknown organizer';
                                const quality = item.ingestion_quality_score.toFixed(0);
                                const qualityComponents = event?.ingestion_provenance?.quality_components;
                                return (
                                    <Card key={item.id} className="border border-slate-800/60 bg-slate-950/70 text-slate-200">
                                        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                                <span>{organizer}</span>
                                                <Badge className="bg-amber-500/20 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-200">
                                                    {item.status.replace(/_/g, ' ')}
                                                </Badge>
                                                <span className="inline-flex items-center gap-1 rounded border border-slate-800/60 bg-slate-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                    <MaterialIcon name="dashboard" size={12} />
                                                    Quality {quality}
                                                </span>
                                                <span>ID: {item.source_event_id}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={actionLoading}
                                                onClick={() => handleSingleAction(item, 'approve')}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={actionLoading}
                                                onClick={() => handleSingleAction(item, 'reject')}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-3">
                                            <div>
                                                <div className="text-slate-500">Flagged</div>
                                                <div>{format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</div>
                                                <div className="text-slate-500">
                                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500">Event time</div>
                                                <div>{event?.start_time ? format(new Date(event.start_time), 'PPP p') : source?.startTime ? format(new Date(source.startTime), 'PPP p') : 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500">Location</div>
                                                <div>{event?.location ?? source?.location ?? 'N/A'}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Reason codes
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {item.reason_codes.length === 0 ? (
                                                    <span className="text-xs text-slate-500">No reason captured</span>
                                                ) : (
                                                    item.reason_codes.map((code) => (
                                                        <Badge key={code} variant="outline" className="bg-slate-900/50 text-[10px] uppercase">
                                                            {code.replace(/_/g, ' ')}
                                                        </Badge>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {qualityComponents && (
                                            <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-4">
                                                <QualityMetric label="Source trust" value={qualityComponents.source_trust} />
                                                <QualityMetric label="Metadata" value={qualityComponents.metadata_completeness} />
                                                <QualityMetric label="Speakers" value={qualityComponents.speaker_verification} />
                                                <QualityMetric label="History" value={qualityComponents.historical_performance} />
                                            </div>
                                        )}

                                        {item.recommended_tags && item.recommended_tags.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                    Recommended tags
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {item.recommended_tags.map((tag) => (
                                                        <Badge key={tag} variant="outline" className="bg-slate-900/60">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Feedback</div>
                                            <textarea
                                                className="min-h-[80px] w-full rounded-md border border-slate-800/60 bg-slate-950/60 p-3 text-sm text-slate-100 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600/40"
                                                placeholder="Leave review guidance for future automations (optional)"
                                                value={feedback[item.id] ?? ''}
                                                onChange={(event) =>
                                                    setFeedback((prev) => ({ ...prev, [item.id]: event.target.value }))
                                                }
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                            })
                        )}
                    </div>
                )}
            </div>
            {shortcutsOpen && <ModerationShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
        </>
    );
}

function QualityMetric({ label, value }: { label: string; value?: number }) {
    return (
        <div className="rounded-md border border-slate-800/50 bg-slate-900/60 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-sm font-semibold text-slate-100">{value !== undefined ? `${value.toFixed(0)}%` : '—'}</div>
        </div>
    );
}

function ModerationShortcutsOverlay({ onClose }: { onClose: () => void }) {
    const shortcuts: Array<{ keys: string; description: string }> = [
        { keys: '/', description: 'Focus search' },
        { keys: 'a', description: 'Approve selected rows' },
        { keys: 'r', description: 'Reject selected rows' },
        { keys: 'j / k', description: 'Move table selection down / up' },
        { keys: '?', description: 'Show this help' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100">Moderation shortcuts</h2>
                        <p className="text-sm text-slate-400">
                            Stay in flow while triaging ingestion issues.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:bg-slate-800">
                        <MaterialIcon name="close" size={16} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map((item) => (
                        <div key={item.keys} className="flex items-center justify-between gap-3 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
                            <span className="font-mono text-xs uppercase tracking-wide text-slate-200">{item.keys}</span>
                            <span className="text-sm text-slate-300">{item.description}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-center text-xs text-slate-500">Press Esc to close.</p>
            </div>
        </div>
    );
}

