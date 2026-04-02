'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { cn } from '@/lib/utils';
import type { HackathonListItem } from './page';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-green-500/10', text: 'text-green-400' },
    completed: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

interface HackathonsListClientProps {
    initialHackathons: HackathonListItem[];
    initialTotal: number;
    initialPageSize: number;
}

export default function HackathonsListClient({
    initialHackathons,
    initialTotal,
    initialPageSize,
}: HackathonsListClientProps) {
    const router = useRouter();
    const [hackathons, setHackathons] = useState<HackathonListItem[]>(initialHackathons);
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [searchValue, setSearchValue] = useState('');
    const [sortBy, setSortBy] = useState('start_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [loading, setLoading] = useState(false);

    const { setTitle, setSubtitle } = useAdminToolbar();
    const { showError } = useSnackbar();

    useEffect(() => {
        setTitle('Hackathons');
        setSubtitle('View and manage all hackathons');
    }, [setSubtitle, setTitle]);

    const fetchHackathons = useCallback(
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

                const response = await fetch(`/api/admin/hackathons?${params.toString()}`);
                if (!response.ok) throw new Error('Failed to fetch hackathons');
                const data = await response.json();
                setHackathons(data.hackathons || []);
                setTotal(data.total || 0);
            } catch {
                showError('Failed to fetch hackathons');
            } finally {
                setLoading(false);
            }
        },
        [page, pageSize, searchValue, showError, sortBy, sortOrder]
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            fetchHackathons({ newPage });
        },
        [fetchHackathons]
    );

    const handlePageSizeChange = useCallback(
        (newPageSize: number) => {
            setPageSize(newPageSize);
            setPage(1);
            fetchHackathons({ newPage: 1, newPageSize });
        },
        [fetchHackathons]
    );

    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchValue(value);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                setPage(1);
                fetchHackathons({ newPage: 1, newSearch: value });
            }, 300);
        },
        [fetchHackathons]
    );

    const handleSortChange = useCallback(
        (key: string, direction: 'asc' | 'desc') => {
            setSortBy(key);
            setSortOrder(direction);
            fetchHackathons({ newSortBy: key, newSortOrder: direction });
        },
        [fetchHackathons]
    );

    const handleRowClick = useCallback(
        (hackathon: HackathonListItem) => {
            router.push(`/admin/hackathons/${hackathon.id}`);
        },
        [router]
    );

    const handleRefresh = useCallback(() => fetchHackathons(), [fetchHackathons]);

    const columns: AdminDataTableColumn<HackathonListItem>[] = useMemo(
        () => [
            {
                key: 'title',
                header: 'Hackathon',
                sortable: true,
                render: (h) => (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground-primary text-[13px] line-clamp-1">
                            {h.title}
                        </div>
                        {h.organizer?.name && (
                            <div className="text-[11px] text-foreground-muted">{h.organizer.name}</div>
                        )}
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                render: (h) => {
                    if (!h.status) return <span className="text-[11px] text-foreground-muted">—</span>;
                    const style = STATUS_STYLES[h.status] || { bg: 'bg-background-tertiary', text: 'text-foreground-tertiary' };
                    return (
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium capitalize', style.bg, style.text)}>
                            {h.status}
                        </span>
                    );
                },
                width: 100,
            },
            {
                key: 'start_date',
                header: 'Dates',
                sortable: true,
                render: (h) => (
                    <div className="text-[12px] text-foreground-tertiary">
                        {h.start_date ? (
                            <div className="flex flex-col gap-0.5">
                                <span>{format(new Date(h.start_date), 'MMM d, yyyy')}</span>
                                {h.end_date && (
                                    <span className="text-[10px] text-foreground-muted">
                                        → {format(new Date(h.end_date), 'MMM d, yyyy')}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-foreground-muted">—</span>
                        )}
                    </div>
                ),
                width: 160,
            },
            {
                key: 'location',
                header: 'Location',
                render: (h) => (
                    <div className="text-[12px] text-foreground-tertiary truncate max-w-[150px]">
                        {h.is_virtual ? (
                            <span className="text-accent-primary/70">Virtual</span>
                        ) : h.location ? (
                            h.location
                        ) : (
                            <span className="text-foreground-muted">—</span>
                        )}
                    </div>
                ),
                width: 150,
            },
        ],
        []
    );

    return (
        <div className="space-y-4">
            <AdminDataTable
                columns={columns}
                rows={hackathons}
                getRowId={(h) => h.id}
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
                                    placeholder="Search hackathons..."
                                    className="h-7 w-64 rounded-md border border-default bg-background-tertiary pl-8 pr-3 text-[13px] text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                                    value={searchValue}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>
                            <span className="text-[11px] text-foreground-muted">
                                {total.toLocaleString()} hackathons total
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
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
                            <Button
                                size="sm"
                                onClick={() => router.push('/admin/hackathons/new')}
                                className="h-7 px-3 text-[12px] bg-accent-primary hover:bg-accent-primary/90 text-accent-primary-foreground"
                            >
                                <MaterialIcon name="add" size={14} className="mr-1" />
                                New Hackathon
                            </Button>
                        </div>
                    </div>
                }
            />
        </div>
    );
}
