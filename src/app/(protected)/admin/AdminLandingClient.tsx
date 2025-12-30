'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon, type IconName } from '@/components/ui/Icon';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import { cn } from '@/lib/utils';

export interface AdminSummaryMetrics {
    updateQueuePending?: number | null;
    moderationFlags?: number | null;
    enrichmentBacklog?: number | null;
    protectedFields?: number | null;
}

type QueueHealth = 'healthy' | 'warning' | 'critical';

function getQueueHealth(value: number | null | undefined, thresholds: { warning: number; critical: number }): QueueHealth {
    if (value === null || value === undefined || value === 0) return 'healthy';
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
}

const healthStyles: Record<QueueHealth, { ring: string; badge: string; indicator: string }> = {
    healthy: {
        ring: 'ring-emerald-500/20',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        indicator: 'bg-emerald-500',
    },
    warning: {
        ring: 'ring-amber-500/20',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        indicator: 'bg-amber-500',
    },
    critical: {
        ring: 'ring-rose-500/20',
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        indicator: 'bg-rose-500',
    },
};

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

    const cards: Array<{
        title: string;
        description: string;
        href: string;
        icon: IconName;
        metric: string;
        metricLabel: string;
        health: QueueHealth;
    }> = [
            {
                title: 'Update queue',
                description: 'Deduplicate events and approve merges from ingestion.',
                href: '/admin/ingestion/update-queue',
                icon: 'refresh',
                metric: formatMetric(metrics.updateQueuePending),
                metricLabel: 'Pending updates',
                health: getQueueHealth(metrics.updateQueuePending, { warning: 10, critical: 50 }),
            },
            {
                title: 'Moderation',
                description: 'Resolve flagged content and quality issues before publishing.',
                href: '/admin/ingestion/moderation',
                icon: 'warning',
                metric: formatMetric(metrics.moderationFlags),
                metricLabel: 'Items flagged',
                health: getQueueHealth(metrics.moderationFlags, { warning: 5, critical: 20 }),
            },
            {
                title: 'Enrichment',
                description: 'Fill in agenda, speakers, and metadata gaps for live events.',
                href: '/admin/ingestion/enrichment',
                icon: 'dashboard',
                metric: formatMetric(metrics.enrichmentBacklog),
                metricLabel: 'Events needing work',
                health: getQueueHealth(metrics.enrichmentBacklog, { warning: 25, critical: 100 }),
            },
            {
                title: 'Field protection',
                description: 'Lock sensitive fields to keep curated edits safe.',
                href: '/admin/ingestion/field-protection',
                icon: 'settings',
                metric: formatMetric(metrics.protectedFields),
                metricLabel: 'Protected fields',
                health: 'healthy', // No urgency for field protection
            },
        ];

    const playbooks = [
        {
            title: 'Daily ingestion sweep',
            steps: [
                'Review the update queue for pending merges.',
                'Look at moderation backlog for high severity issues.',
                'Spot check enrichment backlog for today&apos;s events.',
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

    // Calculate overall system health
    const criticalCount = cards.filter(c => c.health === 'critical').length;
    const warningCount = cards.filter(c => c.health === 'warning').length;
    const overallHealth: QueueHealth = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy';
    const healthLabel = overallHealth === 'healthy' ? 'All systems healthy' :
        overallHealth === 'warning' ? 'Some queues need attention' :
            'Critical queues require action';

    return (
        <div className="space-y-6">
            {/* System Health Banner */}
            <div className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3',
                overallHealth === 'healthy' && 'border-emerald-500/30 bg-emerald-500/10',
                overallHealth === 'warning' && 'border-amber-500/30 bg-amber-500/10',
                overallHealth === 'critical' && 'border-rose-500/30 bg-rose-500/10'
            )}>
                <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    healthStyles[overallHealth].badge
                )}>
                    <MaterialIcon
                        name={overallHealth === 'healthy' ? 'check-circle' : 'warning'}
                        size={18}
                    />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground-secondary">{healthLabel}</p>
                    <p className="text-xs text-foreground-tertiary">
                        {criticalCount > 0 && `${criticalCount} critical • `}
                        {warningCount > 0 && `${warningCount} warning • `}
                        Last checked just now
                    </p>
                </div>
            </div>

            <Card className="border border-default/50 bg-background-main/60 text-foreground-secondary">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-base font-semibold">Pipelines at a glance</CardTitle>
                    <p className="text-sm text-foreground-tertiary">
                        Keep queues moving to prevent ingestion bottlenecks. Metrics update as soon as you clear a flow.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {cards.map((card) => (
                            <Card
                                key={card.title}
                                className={cn(
                                    'group relative overflow-hidden border border-default/60 bg-background-main/70 text-foreground-secondary transition-all duration-200 hover:border-strong hover:bg-background-secondary/80',
                                    card.health !== 'healthy' && `ring-1 ${healthStyles[card.health].ring}`
                                )}
                            >
                                {/* Health indicator dot */}
                                <div className={cn(
                                    'absolute right-3 top-3 h-2 w-2 rounded-full',
                                    healthStyles[card.health].indicator,
                                    card.health !== 'healthy' && 'animate-pulse'
                                )} />

                                <CardHeader className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background-tertiary transition-colors group-hover:bg-slate-700">
                                            <MaterialIcon name={card.icon} size={16} className="text-foreground-tertiary" />
                                        </div>
                                        <span className="text-sm font-medium uppercase tracking-wide text-foreground-tertiary">
                                            {card.title}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-semibold text-foreground-primary">{card.metric}</span>
                                        <Badge className={cn('text-xs', healthStyles[card.health].badge)}>
                                            {card.metricLabel}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-foreground-tertiary">{card.description}</p>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild variant="secondary" className="w-full transition-transform group-hover:scale-[1.02]">
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
                <Card className="border border-default/60 bg-background-main/60 text-foreground-secondary">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Operational playbooks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {playbooks.map((playbook) => (
                            <div key={playbook.title} className="rounded-lg border border-default/40 bg-background-secondary/50 p-4 transition-colors hover:bg-background-secondary/70">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">
                                    <MaterialIcon name="check-circle" size={14} />
                                    {playbook.title}
                                </h3>
                                <ul className="space-y-2 text-sm text-foreground-tertiary">
                                    {playbook.steps.map((step, idx) => (
                                        <li key={idx} className="flex gap-3">
                                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-background-tertiary text-xs text-foreground-tertiary">
                                                {idx + 1}
                                            </span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border border-default/60 bg-background-main/60 text-foreground-secondary">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-foreground-tertiary">
                        <a
                            href="https://supabase.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 rounded border border-default/50 bg-background-secondary/60 p-3 transition-colors hover:border-strong hover:bg-background-tertiary/60"
                        >
                            <MaterialIcon name="arrow-up-right" size={16} className="text-foreground-tertiary" />
                            <div>
                                <p className="font-medium text-foreground-secondary">Jump to Supabase logs</p>
                                <p className="text-xs text-foreground-tertiary">Investigate ingestion function failures or timeouts.</p>
                            </div>
                        </a>
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
