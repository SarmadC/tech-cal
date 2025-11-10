'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';

export interface AdminSummaryMetrics {
    updateQueuePending?: number | null;
    moderationFlags?: number | null;
    enrichmentBacklog?: number | null;
    protectedFields?: number | null;
}

export default function AdminLandingClient({ metrics }: { metrics: AdminSummaryMetrics }) {
    const { setTitle, setSubtitle, setQuickFilters, setSearch, setToolbarContent } = useAdminToolbar();

    useEffect(() => {
        setTitle('Admin command center');
        setSubtitle('Monitor ingestion pipelines and jump into the queues that need attention.');
        setQuickFilters([]);
        setSearch(undefined);
        setToolbarContent(undefined);
        return () => {
            setQuickFilters([]);
            setSearch(undefined);
            setToolbarContent(undefined);
        };
    }, [setQuickFilters, setSearch, setSubtitle, setTitle, setToolbarContent]);

    const cards = [
        {
            title: 'Update queue',
            description: 'Deduplicate events and approve merges from ingestion.',
            href: '/admin/ingestion/update-queue',
            icon: 'refresh' as const,
            metric: formatMetric(metrics.updateQueuePending),
            metricLabel: 'Pending updates',
        },
        {
            title: 'Moderation',
            description: 'Resolve flagged content and quality issues before publishing.',
            href: '/admin/ingestion/moderation',
            icon: 'warning' as const,
            metric: formatMetric(metrics.moderationFlags),
            metricLabel: 'Items flagged',
        },
        {
            title: 'Enrichment',
            description: 'Fill in agenda, speakers, and metadata gaps for live events.',
            href: '/admin/ingestion/enrichment',
            icon: 'dashboard' as const,
            metric: formatMetric(metrics.enrichmentBacklog),
            metricLabel: 'Events needing work',
        },
        {
            title: 'Field protection',
            description: 'Lock sensitive fields to keep curated edits safe.',
            href: '/admin/ingestion/field-protection',
            icon: 'settings' as const,
            metric: formatMetric(metrics.protectedFields),
            metricLabel: 'Protected fields',
        },
    ];

    const playbooks = [
        {
            title: 'Daily ingestion sweep',
            steps: [
                'Review the update queue for pending merges.',
                'Look at moderation backlog for high severity issues.',
                'Spot check enrichment backlog for today’s events.',
            ],
        },
        {
            title: 'Launch readiness',
            steps: [
                'Confirm required fields are protected against overwrites.',
                'Ensure speakers and agenda are filled for spotlight events.',
                'Clear moderation flags older than 48 hours.',
            ],
        },
    ];

    return (
        <div className="space-y-6">
            <Card className="border border-slate-800/50 bg-slate-950/60 text-slate-200">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-base font-semibold">Pipelines at a glance</CardTitle>
                    <p className="text-sm text-slate-400">
                        Keep queues moving to prevent ingestion bottlenecks. Metrics update as soon as you clear a flow.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {cards.map((card) => (
                            <Card key={card.title} className="border border-slate-800/60 bg-slate-950/70 text-slate-200">
                                <CardHeader className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-400">
                                            <MaterialIcon name={card.icon} size={16} />
                                            <span>{card.title}</span>
                                        </div>
                                        <Badge className="bg-slate-900/60 text-xs text-slate-300">{card.metricLabel}</Badge>
                                    </div>
                                    <div className="text-3xl font-semibold text-slate-100">{card.metric}</div>
                                    <p className="text-sm text-slate-400">{card.description}</p>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild variant="secondary" className="w-full">
                                        <Link href={card.href}>
                                            Open {card.title}
                                            <MaterialIcon name="arrow-forward" size={16} />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                <Card className="border border-slate-800/60 bg-slate-950/60 text-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Operational playbooks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {playbooks.map((playbook) => (
                            <div key={playbook.title} className="rounded-lg border border-slate-800/40 bg-slate-900/50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                                    <MaterialIcon name="check-circle" size={14} />
                                    {playbook.title}
                                </h3>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    {playbook.steps.map((step, idx) => (
                                        <li key={idx} className="flex gap-3">
                                            <span className="text-xs text-slate-500">{idx + 1}.</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border border-slate-800/60 bg-slate-950/60 text-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-300">
                        <div className="flex items-start gap-3 rounded border border-slate-800/50 bg-slate-900/60 p-3">
                            <MaterialIcon name="arrow-up-right" size={16} className="text-slate-400" />
                            <div>
                                <p className="font-medium text-slate-200">Jump to Supabase logs</p>
                                <p className="text-xs text-slate-400">Investigate ingestion function failures or timeouts.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 rounded border border-slate-800/50 bg-slate-900/60 p-3">
                            <MaterialIcon name="arrow-up-right" size={16} className="text-slate-400" />
                            <div>
                                <p className="font-medium text-slate-200">Review staging diff</p>
                                <p className="text-xs text-slate-400">Compare staging events against production for upcoming launches.</p>
                            </div>
                        </div>
                        <Button asChild variant="secondary" className="w-full">
                            <Link href="/admin/ingestion/update-queue">
                                Start triaging now
                                <MaterialIcon name="arrow-forward" size={16} />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}

function formatMetric(value?: number | null) {
    if (value === null || value === undefined) {
        return '—';
    }
    if (value > 999) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
}

