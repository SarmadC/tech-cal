/**
 * Enrichment Dashboard Client Component
 * 
 * Interactive UI for browsing events that need enrichment.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import useAdminHotkeys from '@/components/admin/useAdminHotkeys';
import { useDebounce } from '@/hooks/useDebounce';
import { MaterialIcon } from '@/components/ui/Icon';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface EnrichmentEvent {
    id: string;
    title: string;
    start_time: string;
    source_url: string;
    organizer: { id: string; name: string; logo_url: string | null } | null;
    has_agenda: boolean;
    has_speakers: boolean;
    ingestion_source_id: string | null;
}

interface EnrichmentDashboardClientProps {
    initialEvents: EnrichmentEvent[];
}

export default function EnrichmentDashboardClient({ initialEvents }: EnrichmentDashboardClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const statusParam = searchParams.get('status') ?? 'all';
    const queryParam = searchParams.get('q') ?? '';
    const viewParam = searchParams.get('view') ?? 'table';
    const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;
    const pageSizeParam = Number.parseInt(searchParams.get('pageSize') ?? '20', 10) || 20;

    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const debouncedSearch = useDebounce(queryParam, 200);

    const { setTitle, setSubtitle, setSearch, setQuickFilters, setToolbarContent, focusSearch } = useAdminToolbar();
    const { showInfo } = useSnackbar();

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
        setTitle('Content Enrichment');
        setSubtitle('Fill in missing agendas, speakers, and supplemental content for live events.');
    }, [setTitle, setSubtitle]);

    useEffect(() => {
        setSearch({
            placeholder: 'Search titles, organizers, source IDs',
            value: queryParam,
            onChange: (value) => updateQuery({ q: value || undefined, page: 1 }),
        });
        return () => setSearch(undefined);
    }, [queryParam, setSearch, updateQuery]);

    useEffect(() => {
        setToolbarContent(undefined);
        return () => setToolbarContent(undefined);
    }, [setToolbarContent]);

    const events = useMemo(() => initialEvents, [initialEvents]);

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: events.length,
            needs_both: events.filter((event) => !event.has_agenda && !event.has_speakers).length,
            needs_agenda: events.filter((event) => !event.has_agenda).length,
            needs_speakers: events.filter((event) => !event.has_speakers).length,
            complete: events.filter((event) => event.has_agenda && event.has_speakers).length,
        };
        return counts;
    }, [events]);

    useEffect(() => {
        setQuickFilters([
            { id: 'all', label: 'All', active: statusParam === 'all', badge: statusCounts.all, onToggle: () => updateQuery({ status: undefined, page: 1 }) },
            { id: 'needs_both', label: 'Needs both', active: statusParam === 'needs_both', badge: statusCounts.needs_both, onToggle: () => updateQuery({ status: 'needs_both', page: 1 }) },
            { id: 'needs_agenda', label: 'Needs agenda', active: statusParam === 'needs_agenda', badge: statusCounts.needs_agenda, onToggle: () => updateQuery({ status: 'needs_agenda', page: 1 }) },
            { id: 'needs_speakers', label: 'Needs speakers', active: statusParam === 'needs_speakers', badge: statusCounts.needs_speakers, onToggle: () => updateQuery({ status: 'needs_speakers', page: 1 }) },
            { id: 'complete', label: 'Complete', active: statusParam === 'complete', badge: statusCounts.complete, onToggle: () => updateQuery({ status: 'complete', page: 1 }) },
        ]);
    }, [setQuickFilters, statusCounts, statusParam, updateQuery]);

    const filteredEvents = useMemo(() => {
        const matchesStatus = (event: EnrichmentEvent) => {
            switch (statusParam) {
                case 'needs_both':
                    return !event.has_agenda && !event.has_speakers;
                case 'needs_agenda':
                    return !event.has_agenda;
                case 'needs_speakers':
                    return !event.has_speakers;
                case 'complete':
                    return event.has_agenda && event.has_speakers;
                default:
                    return true;
            }
        };
        const needle = debouncedSearch.trim().toLowerCase();
        return events.filter((event) => {
            if (!matchesStatus(event)) return false;
            if (!needle) return true;
            const haystack = [
                event.title,
                event.organizer?.name,
                event.ingestion_source_id ?? '',
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(needle);
        });
    }, [events, statusParam, debouncedSearch]);

    const totalItems = filteredEvents.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSizeParam));
    const currentPage = Math.min(pageParam, totalPages);
    const startIndex = (currentPage - 1) * pageSizeParam;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + pageSizeParam);

    useEffect(() => {
        if (pageParam !== currentPage) {
            updateQuery({ page: currentPage });
        }
    }, [currentPage, pageParam, updateQuery]);

    useEffect(() => {
        setSelectedRows((prev) =>
            prev.filter((id) => filteredEvents.some((event) => event.id === id))
        );
    }, [filteredEvents]);

    const handleStartEnrichment = useCallback(() => {
        if (selectedRows.length === 0) {
            showInfo('Select an event first.');
            return;
        }
        const targetId = selectedRows[selectedRows.length - 1];
        router.push(`/admin/ingestion/enrichment/${targetId}`);
    }, [router, selectedRows, showInfo]);

    const selectedEvent = useMemo(
        () => paginatedEvents.find((event) => event.id === selectedRows[selectedRows.length - 1]),
        [paginatedEvents, selectedRows]
    );

    const handleOpenSelectedSource = useCallback(() => {
        if (!selectedEvent?.source_url) {
            showInfo('Selected event has no source URL to open.');
            return;
        }
        window.open(selectedEvent.source_url, '_blank', 'noopener,noreferrer');
    }, [selectedEvent, showInfo]);

    const moveSelection = useCallback(
        (direction: 'next' | 'prev') => {
            if (paginatedEvents.length === 0) return;
            const ids = paginatedEvents.map((event) => event.id);
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
        [paginatedEvents]
    );

    useAdminHotkeys({
        focusSearch,
        openHelp: () => setShortcutsOpen(true),
        onApproveSelected: handleStartEnrichment,
        onRejectSelected: handleOpenSelectedSource,
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

    const columns: AdminDataTableColumn<EnrichmentEvent>[] = useMemo(() => [
        {
            key: 'event',
            header: 'Event',
            render: (event) => (
                <div className="flex flex-col gap-2">
                    <div className="font-medium text-slate-100">{event.title}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{event.organizer?.name ?? 'Unknown organizer'}</span>
                        {event.ingestion_source_id && (
                            <span className="inline-flex items-center gap-1 rounded border border-slate-800/50 bg-slate-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                <MaterialIcon name="label" size={12} />
                                {event.ingestion_source_id}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'needs',
            header: 'Needs',
            render: (event) => (
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    {!event.has_agenda && (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">
                            Agenda
                        </Badge>
                    )}
                    {!event.has_speakers && (
                        <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-200">
                            Speakers
                        </Badge>
                    )}
                    {event.has_agenda && event.has_speakers && (
                        <Badge className="bg-emerald-500/20 text-emerald-100">Complete</Badge>
                    )}
                </div>
            ),
            width: 160,
        },
        {
            key: 'start_time',
            header: 'Starts',
            sortable: true,
            render: (event) => (
                <div className="text-xs text-slate-300">
                    <div>{format(new Date(event.start_time), 'MMM d, yyyy HH:mm')}</div>
                    <div className="text-slate-500">
                        {formatDistanceToNow(new Date(event.start_time), { addSuffix: true })}
                    </div>
                </div>
            ),
            width: 160,
        },
        {
            key: 'source',
            header: 'Source',
            align: 'center',
            render: (event) => (
                <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={!event.source_url}
                    onClick={() => window.open(event.source_url, '_blank', 'noopener,noreferrer')}
                >
                    Source
                </Button>
            ),
            width: 100,
        },
        {
            key: 'actions',
            header: 'Enrich',
            align: 'center',
            render: (event) => (
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/admin/ingestion/enrichment/${event.id}`)}
                >
                    Open editor
                </Button>
            ),
            width: 130,
        },
    ], [router]);

    const bulkActions = useMemo(
        () => [
            {
                id: 'enrich',
                label: 'Open enrichment',
                icon: <MaterialIcon name="arrow-forward" size={14} />,
                shortcut: 'a',
                disabled: selectedRows.length === 0,
                onSelect: handleStartEnrichment,
            },
            {
                id: 'source',
                label: 'Open source page',
                icon: <MaterialIcon name="arrow-up-right" size={14} />,
                shortcut: 'r',
                disabled: !selectedEvent?.source_url,
                onSelect: handleOpenSelectedSource,
            },
        ],
        [handleOpenSelectedSource, handleStartEnrichment, selectedEvent?.source_url, selectedRows.length]
    );

    const viewControls = (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">View</span>
                <Button
                    type="button"
                    size="sm"
                    variant={viewParam === 'table' ? 'secondary' : 'ghost'}
                    onClick={() => updateQuery({ view: 'table' })}
                    aria-pressed={viewParam === 'table'}
                >
                    Table
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={viewParam === 'cards' ? 'secondary' : 'ghost'}
                    onClick={() => updateQuery({ view: 'cards' })}
                    aria-pressed={viewParam === 'cards'}
                >
                    Cards
                </Button>
            </div>
            <div className="text-xs text-slate-400">
                {selectedRows.length > 0 ? `${selectedRows.length} selected • ` : ''}
                {statusCounts.needs_both} need agenda + speakers
            </div>
        </div>
    );

    const tableToolbar = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">
                {totalItems === 0 ? 'No events match the current filters.' : `Showing ${paginatedEvents.length} of ${totalItems} events needing review`}
            </div>
            <LinkBackToQueue />
        </div>
    );

    return (
        <div className="space-y-5">
            {viewControls}

            {viewParam === 'table' ? (
                <AdminDataTable
                    columns={columns}
                    rows={paginatedEvents}
                    getRowId={(event) => event.id}
                    sortKey="start_time"
                    sortDirection="asc"
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
                    {paginatedEvents.length === 0 ? (
                        <Card className="border border-slate-800/60 bg-slate-950/60">
                            <CardContent className="p-6 text-center text-sm text-slate-400">
                                No events match the current filters.
                            </CardContent>
                        </Card>
                    ) : (
                        paginatedEvents.map((event) => (
                            <Card key={event.id} className="border border-slate-800/60 bg-slate-950/70 text-slate-200">
                                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <CardTitle className="text-lg font-semibold">{event.title}</CardTitle>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                            <span>{event.organizer?.name ?? 'Unknown organizer'}</span>
                                            <span>{format(new Date(event.start_time), 'PPP p')}</span>
                                            {event.ingestion_source_id && (
                                                <span className="inline-flex items-center gap-1 rounded border border-slate-800/60 bg-slate-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                    <MaterialIcon name="label" size={12} />
                                                    {event.ingestion_source_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/ingestion/enrichment/${event.id}`)}>
                                            Enrich now
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={!event.source_url} onClick={() => event.source_url && window.open(event.source_url, '_blank', 'noopener,noreferrer')}>
                                            Source
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                    {!event.has_agenda && (
                                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">
                                            Agenda missing
                                        </Badge>
                                    )}
                                    {!event.has_speakers && (
                                        <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-200">
                                            Speakers missing
                                        </Badge>
                                    )}
                                    {event.has_agenda && event.has_speakers && (
                                        <Badge className="bg-emerald-500/20 text-emerald-100">Complete</Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {shortcutsOpen && <EnrichmentShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
        </div>
    );
}

function LinkBackToQueue() {
    return (
        <Link
            href="/admin/ingestion/update-queue"
            className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-200"
        >
            <MaterialIcon name="arrow_back" size={12} />
            Back to update queue
        </Link>
    );
}

function EnrichmentShortcutsOverlay({ onClose }: { onClose: () => void }) {
    const shortcuts = [
        { keys: '/', label: 'Focus search' },
        { keys: 'a', label: 'Open selected in editor' },
        { keys: 'r', label: 'Open selected source page' },
        { keys: 'j / k', label: 'Move selection down / up' },
        { keys: '?', label: 'Show this help' },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100">Enrichment shortcuts</h2>
                        <p className="text-sm text-slate-400">
                            Jump through the backlog without leaving the keyboard.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:bg-slate-800">
                        <MaterialIcon name="close" size={16} />
                    </Button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                        <div key={shortcut.keys} className="flex items-center justify-between gap-3 rounded-md border border-slate-800/60 bg-slate-900/60 px-3 py-2">
                            <span className="font-mono text-xs uppercase tracking-wide text-slate-200">{shortcut.keys}</span>
                            <span className="text-sm text-slate-300">{shortcut.label}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-center text-xs text-slate-500">Press Esc to close.</p>
            </div>
        </div>
    );
}

