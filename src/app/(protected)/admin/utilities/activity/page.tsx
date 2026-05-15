'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { MaterialIcon } from '@/components/ui/Icon';

type ExtractionJobLogRow = {
    id: string;
    event_id: string | null;
    source_url: string;
    normalized_url: string;
    source_domain: string | null;
    adapter: string | null;
    decision: string;
    status: string;
    duration_ms: number | null;
    started_at: string;
    completed_at: string | null;
    cache_hit: boolean | null;
    metadata: Record<string, unknown> | null;
    events: {
        id: string;
        title: string | null;
    } | null;
};

type StatusFilter = 'all' | 'succeeded' | 'failed' | 'pending';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
    succeeded: 'default',
    success: 'default',
    completed: 'default',
    queued: 'secondary',
    running: 'secondary',
    in_progress: 'secondary',
    pending: 'secondary',
    skipped: 'secondary',
    failed: 'destructive',
    error: 'destructive',
    timeout: 'destructive',
};

const formatDuration = (durationMs: number | null, startedAt: string, completedAt: string | null) => {
    if (durationMs && durationMs > 0) {
        if (durationMs < 1000) return `${durationMs} ms`;
        return `${(durationMs / 1000).toFixed(2)} s`;
    }
    if (completedAt) {
        const started = new Date(startedAt).getTime();
        const finished = new Date(completedAt).getTime();
        const diff = finished - started;
        if (diff < 1000) return `${diff} ms`;
        return `${(diff / 1000).toFixed(2)} s`;
    }
    return '—';
};

const formatStatus = (status: string) => {
    const lower = status.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export default function AdminApiActivityPage() {
    const [activity, setActivity] = useState<ExtractionJobLogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [limit, setLimit] = useState(30);

    const fetchActivity = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
            });

            if (statusFilter !== 'all') {
                params.set('status', statusFilter);
            }

            if (searchQuery) {
                params.set('search', searchQuery);
            }

            const response = await fetch(`/api/admin/activity?${params.toString()}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch activity');
            }

            const data = await response.json();
            setActivity(data.items || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [limit, statusFilter, searchQuery]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    // Filter activity locally for search (in addition to server-side)
    const filteredActivity = activity.filter((item) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.source_url.toLowerCase().includes(query) ||
            item.source_domain?.toLowerCase().includes(query) ||
            item.adapter?.toLowerCase().includes(query) ||
            item.events?.title?.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query)
        );
    });

    const statusFilters: { value: StatusFilter; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'succeeded', label: 'Succeeded' },
        { value: 'failed', label: 'Failed' },
        { value: 'pending', label: 'Pending' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-foreground-100">API Activity</h1>
                <p className="text-sm text-foreground-400 max-w-3xl">
                    Review extraction jobs hitting the ingestion APIs. Filter by status or search for specific URLs and events.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <MaterialIcon
                        name="search"
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"
                    />
                    <input
                        type="text"
                        placeholder="Search by URL, domain, or event..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-default700 bg-background-900 pl-10 pr-4 py-2 text-sm text-foreground-100 placeholder:text-foreground-500 focus:border-default600 focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-1 rounded-lg border border-default800 bg-background-950/60 p-1">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`px-3 py-1 rounded text-xs transition-colors ${statusFilter === filter.value
                                    ? 'bg-background-700 text-white'
                                    : 'text-foreground-400 hover:text-foreground-200'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Limit */}
                <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="rounded-lg border border-default700 bg-background-900 px-3 py-2 text-sm text-foreground-100 focus:border-default600 focus:outline-none"
                >
                    <option value={30}>30 items</option>
                    <option value={50}>50 items</option>
                    <option value={100}>100 items</option>
                </select>

                {/* Refresh */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchActivity}
                    disabled={loading}
                    className="text-foreground-400 hover:text-white"
                >
                    {loading ? <BrandLoadingLogo size={16} inline label={null} /> : <MaterialIcon name="refresh" size={16} />}
                </Button>
            </div>

            <Card className="border border-default800/60 bg-background-950/70">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Extraction Jobs</span>
                        <span className="text-sm font-normal text-foreground-400">
                            {filteredActivity.length} {filteredActivity.length === 1 ? 'result' : 'results'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading && activity.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <BrandLoadingLogo size={24} inline label={null} className="text-foreground-400" />
                            <span className="ml-2 text-foreground-400">Loading activity...</span>
                        </div>
                    ) : filteredActivity.length === 0 ? (
                        <div className="rounded-lg border border-default800/60 bg-background-950/60 p-6 text-sm text-foreground-400 text-center">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No jobs match your filters. Try adjusting your search or status filter.'
                                : 'No extraction jobs recorded yet. Once new enrichment runs are triggered you\'ll see them here.'}
                        </div>
                    ) : (
                        filteredActivity.map((item) => {
                            const badgeVariant = STATUS_VARIANT[item.status?.toLowerCase()] ?? 'secondary';
                            const duration = formatDuration(item.duration_ms, item.started_at, item.completed_at);
                            const actorLabel = item.adapter ?? 'Rules-first';

                            return (
                                <div
                                    key={item.id}
                                    className="rounded-lg border border-default800/60 bg-background-950/60 p-4 text-sm text-foreground-300"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-[13px] text-foreground-500">{item.id}</span>
                                            <span className="text-foreground-100">
                                                {item.events?.title ?? item.source_domain ?? (() => {
                                                    try {
                                                        return new URL(item.source_url).hostname;
                                                    } catch {
                                                        return item.source_url;
                                                    }
                                                })()}
                                            </span>
                                            <a
                                                href={item.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline break-all"
                                            >
                                                {item.source_url}
                                            </a>
                                        </div>
                                        <Badge variant={badgeVariant}>{formatStatus(item.status)}</Badge>
                                    </div>

                                    <div className="mt-3 grid gap-3 text-xs text-foreground-400 md:grid-cols-3">
                                        <div>
                                            <span className="block text-foreground-500">Started</span>
                                            <span>{new Date(item.started_at).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="block text-foreground-500">Duration</span>
                                            <span>{duration}</span>
                                        </div>
                                        <div>
                                            <span className="block text-foreground-500">Adapter</span>
                                            <span>{actorLabel}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-3 text-xs text-foreground-400 md:grid-cols-3">
                                        <div>
                                            <span className="block text-foreground-500">Decision</span>
                                            <span>{item.decision}</span>
                                        </div>
                                        <div>
                                            <span className="block text-foreground-500">Cache Hit</span>
                                            <span>{item.cache_hit ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-foreground-500">Normalized URL</span>
                                            <span className="break-all">{item.normalized_url}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {error && (
                        <p className="text-xs text-amber-400">
                            Unable to load data: {error}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
