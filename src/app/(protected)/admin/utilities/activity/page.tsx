import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ExtractionJobLogRow = {
    id: string;
    event_id: string | null;
    source_url: string;
    normalized_url: string;
    source_domain: string | null;
    adapter: string | null;
    firecrawl_used: boolean;
    firecrawl_credits_spent: number | null;
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

export const dynamic = 'force-dynamic';

export default async function AdminApiActivityPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    const { data: logs, error } = await supabase
        .from('extraction_job_log')
        .select(
            `
            id,
            event_id,
            source_url,
            normalized_url,
            source_domain,
            adapter,
            firecrawl_used,
            firecrawl_credits_spent,
            decision,
            status,
            duration_ms,
            started_at,
            completed_at,
            cache_hit,
            metadata,
            events:events(id,title)
        `
        )
        .order('started_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('[AdminApiActivityPage] Failed to load extraction_job_log', error);
    }

    const activity = (logs ?? []) as ExtractionJobLogRow[];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-slate-100">API Activity</h1>
                <p className="text-sm text-slate-400 max-w-3xl">
                    Review the most recent enrichment jobs hitting our ingestion APIs. This feed reflects entries from `extraction_job_log`,
                    showing status, adapter, latency, and Firecrawl usage so you can troubleshoot quickly.
                </p>
            </div>

            <Card className="border border-slate-800/60 bg-slate-950/70">
                <CardHeader>
                    <CardTitle>Recent Extraction Jobs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activity.length === 0 ? (
                        <div className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-6 text-sm text-slate-400">
                            No extraction jobs recorded yet. Once new enrichment runs are triggered you’ll see them here instantly.
                        </div>
                    ) : (
                        activity.map((item) => {
                            const badgeVariant = STATUS_VARIANT[item.status?.toLowerCase()] ?? 'secondary';
                            const duration = formatDuration(item.duration_ms, item.started_at, item.completed_at);
                            const actorLabel = item.firecrawl_used
                                ? `Firecrawl (${item.adapter ?? 'rules'})`
                                : item.adapter ?? 'Rules-first';

                            return (
                                <div
                                    key={item.id}
                                    className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-4 text-sm text-slate-300"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-[13px] text-slate-500">{item.id}</span>
                                            <span className="text-slate-100">
                                                {item.events?.title ?? item.source_domain ?? new URL(item.source_url).hostname}
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

                                    <div className="mt-3 grid gap-3 text-xs text-slate-400 md:grid-cols-4">
                                        <div>
                                            <span className="block text-slate-500">Started</span>
                                            <span>{new Date(item.started_at).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500">Duration</span>
                                            <span>{duration}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500">Adapter</span>
                                            <span>{actorLabel}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500">Firecrawl Credits</span>
                                            <span>{item.firecrawl_credits_spent ?? 0}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
                                        <div>
                                            <span className="block text-slate-500">Decision</span>
                                            <span>{item.decision}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500">Cache Hit</span>
                                            <span>{item.cache_hit ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500">Normalized URL</span>
                                            <span className="break-all">{item.normalized_url}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {error && (
                        <p className="text-xs text-amber-400">
                            Unable to load live data at the moment. Showing an empty state above. Check the network console for more details.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

