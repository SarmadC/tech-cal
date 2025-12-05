'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { MaterialIcon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { EnrichmentMetadata } from '@/types/enrichment';

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
    const [events, setEvents] = useState<EnrichmentEvent[]>(initialEvents);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'enriched' | 'failed'>('all');
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent } = useAdminToolbar();
    const { showInfo, showSuccess, showError } = useSnackbar();

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
        setQuickFilters([
            { id: 'all', label: 'All', active: statusFilter === 'all', onToggle: () => setStatusFilter('all') },
            { id: 'pending', label: 'Pending', active: statusFilter === 'pending', onToggle: () => setStatusFilter('pending') },
            { id: 'processing', label: 'Processing', active: statusFilter === 'processing', onToggle: () => setStatusFilter('processing') },
            { id: 'enriched', label: 'Enriched', active: statusFilter === 'enriched', onToggle: () => setStatusFilter('enriched') },
            { id: 'failed', label: 'Failed', active: statusFilter === 'failed', onToggle: () => setStatusFilter('failed') },
        ]);
    }, [setQuickFilters, statusFilter]);

    const filteredEvents = useMemo(() => {
        const needle = searchValue.trim().toLowerCase();
        return events.filter((event) => {
            const statusMatch = statusFilter === 'all' ? true : event.enrichment_status === statusFilter;
            const text = [event.title, event.ingestion_source_id ?? '', event.source_url].join(' ').toLowerCase();
            const searchMatch = needle ? text.includes(needle) : true;
            return statusMatch && searchMatch;
        });
    }, [events, searchValue, statusFilter]);

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
            } catch (error) {
                console.error(error);
                showError('Failed to refresh enrichment status');
            } finally {
                setLoading(false);
            }
        },
        [showError, statusFilter]
    );

    const triggerEnrichment = useCallback(
        async (eventIds: string[]) => {
            if (eventIds.length === 0) {
                showInfo('Select at least one event.');
                return;
            }
            setLoading(true);
            try {
                const response = await fetch('/api/admin/ingestion/enrich', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventIds }),
                });
                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload.error || 'Failed to trigger enrichment');
                }
                const payload = await response.json();
                showSuccess(`Triggered enrichment for ${payload.summary?.succeeded ?? eventIds.length} event(s).`);
                await refresh();
            } catch (error) {
                console.error(error);
                showError(error instanceof Error ? error.message : 'Failed to trigger enrichment');
            } finally {
                setLoading(false);
            }
        },
        [refresh, showError, showInfo, showSuccess]
    );

    const columns: AdminDataTableColumn<EnrichmentEvent>[] = useMemo(
        () => [
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
            {
                key: 'status',
                header: 'Status',
                render: (event) => (
                    <div className="flex flex-col gap-1 text-xs text-slate-300">
                        <Badge className={statusBadgeStyles[event.enrichment_status] ?? 'bg-slate-800 text-slate-100'}>
                            {event.enrichment_status}
                        </Badge>
                        {event.enrichment_metadata?.last_error && (
                            <span className="text-amber-200">
                                {event.enrichment_metadata.last_error.slice(0, 80)}
                                {event.enrichment_metadata.last_error.length > 80 ? '…' : ''}
                            </span>
                        )}
                    </div>
                ),
                width: 180,
            },
            {
                key: 'updated_at',
                header: 'Updated',
                render: (event) => (
                    <div className="text-xs text-slate-400">
                        {event.updated_at ? formatDistanceToNow(new Date(event.updated_at), { addSuffix: true }) : '—'}
                    </div>
                ),
                width: 140,
            },
            {
                key: 'actions',
                header: 'Actions',
                align: 'center',
                render: (event) => (
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => triggerEnrichment([event.id])} disabled={loading}>
                            Trigger
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!event.source_url}
                            onClick={() => window.open(event.source_url, '_blank', 'noopener,noreferrer')}
                        >
                            Source
                        </Button>
                    </div>
                ),
                width: 180,
            },
        ],
        [loading, triggerEnrichment]
    );

    const bulkActions = useMemo(
        () => [
            {
                id: 'trigger',
                label: 'Trigger LLM Enrichment',
                icon: <MaterialIcon name="arrow-forward" size={14} />,
                disabled: selectedRows.length === 0 || loading,
                onSelect: () => triggerEnrichment(selectedRows),
            },
            {
                id: 'refresh',
                label: 'Refresh',
                icon: <MaterialIcon name="refresh" size={14} />,
                disabled: loading,
                onSelect: () => refresh(),
            },
        ],
        [loading, refresh, selectedRows, triggerEnrichment]
    );

    return (
        <div className="space-y-4">
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
                bulkActions={bulkActions}
                page={1}
                pageSize={filteredEvents.length || 10}
                total={filteredEvents.length}
                onPageChange={() => undefined}
                onPageSizeChange={() => undefined}
                toolbar={
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">Trigger enrichment and monitor status</span>
                        <a
                            href="/admin/ingestion/update-queue"
                            className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-200"
                        >
                            <MaterialIcon name="arrow_back" size={12} />
                            Back to review queue
                        </a>
                    </div>
                }
            />
        </div>
    );
}
