'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { useAdminReports, ReportType } from '@/hooks/useAdminReports';
import type { IngestionSummaryReport, ModerationSLAReport, EnrichmentCoverageReport } from '@/app/api/admin/reports/route';

type DateRangePreset = '7d' | '14d' | '30d' | 'custom';

export default function AdminReportsPage() {
    const [activeReport, setActiveReport] = useState<ReportType>('ingestion-summary');
    const [datePreset, setDatePreset] = useState<DateRangePreset>('7d');

    const getDateRange = () => {
        const endDate = new Date();
        const days = datePreset === '7d' ? 7 : datePreset === '14d' ? 14 : 30;
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        return { startDate, endDate };
    };

    const { startDate, endDate } = getDateRange();
    const { data, loading, error, fetchReport } = useAdminReports({
        type: activeReport,
        startDate,
        endDate,
    });

    useEffect(() => {
        fetchReport();
    }, [activeReport, datePreset, fetchReport]);

    const reportTabs: { type: ReportType; label: string; icon: 'bar-chart' | 'check-circle' | 'star' }[] = [
        { type: 'ingestion-summary', label: 'Ingestion Summary', icon: 'bar-chart' },
        { type: 'moderation-sla', label: 'Moderation SLA', icon: 'check-circle' },
        { type: 'enrichment-coverage', label: 'Enrichment Coverage', icon: 'star' },
    ];

    const datePresets: { value: DateRangePreset; label: string }[] = [
        { value: '7d', label: 'Last 7 days' },
        { value: '14d', label: 'Last 14 days' },
        { value: '30d', label: 'Last 30 days' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-foreground-primary">Reports & Analytics</h1>
                <p className="text-sm text-foreground-tertiary max-w-3xl">
                    View ingestion metrics, moderation SLA compliance, and enrichment coverage across your event data.
                </p>
            </div>

            {/* Report Type Tabs */}
            <div className="flex flex-wrap gap-2">
                {reportTabs.map((tab) => (
                    <Button
                        key={tab.type}
                        variant={activeReport === tab.type ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setActiveReport(tab.type)}
                        className={activeReport === tab.type
                            ? 'bg-background-tertiary text-white'
                            : 'border-default text-foreground-tertiary hover:bg-background-tertiary'}
                    >
                        <MaterialIcon name={tab.icon} size={16} className="mr-2" />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-foreground-tertiary">Date Range:</span>
                <div className="flex gap-1 rounded-lg border border-default800 bg-background-950/60 p-1">
                    {datePresets.map((preset) => (
                        <button
                            key={preset.value}
                            onClick={() => setDatePreset(preset.value)}
                            className={`px-3 py-1 rounded text-xs transition-colors ${datePreset === preset.value
                                ? 'bg-background-tertiary text-white'
                                : 'text-foreground-tertiary hover:text-foreground-200'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchReport}
                    disabled={loading}
                    className="text-foreground-tertiary hover:text-white"
                >
                    <MaterialIcon name="refresh" size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-rose-500/30 bg-rose-500/10">
                    <CardContent className="pt-4">
                        <p className="text-sm text-rose-100">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Loading State */}
            {loading && !data && (
                <div className="flex items-center justify-center py-12">
                    <MaterialIcon name="refresh" size={24} className="animate-spin text-foreground-tertiary" />
                    <span className="ml-2 text-foreground-tertiary">Loading report...</span>
                </div>
            )}

            {/* Report Content */}
            {data && (
                <>
                    {data.type === 'ingestion-summary' && (
                        <IngestionSummaryView report={data as IngestionSummaryReport} />
                    )}
                    {data.type === 'moderation-sla' && (
                        <ModerationSLAView report={data as ModerationSLAReport} />
                    )}
                    {data.type === 'enrichment-coverage' && (
                        <EnrichmentCoverageView report={data as EnrichmentCoverageReport} />
                    )}
                </>
            )}
        </div>
    );
}

function IngestionSummaryView({ report }: { report: IngestionSummaryReport }) {
    const { metrics, dailyBreakdown } = report;

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <MetricCard label="Total Ingested" value={metrics.totalEventsIngested} />
                <MetricCard label="New Events" value={metrics.newEvents} />
                <MetricCard label="Updates" value={metrics.updatedEvents} />
                <MetricCard label="Queue Items" value={metrics.updateQueueItems} />
                <MetricCard label="Approval Rate" value={`${metrics.approvalRate}%`} />
                <MetricCard label="Auto-Applied" value={`${metrics.autoAppliedRate}%`} />
            </div>

            {/* Daily Breakdown */}
            <Card className="border border-default800/60 bg-background-950/70">
                <CardHeader>
                    <CardTitle>Daily Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {dailyBreakdown.map((day) => (
                            <div key={day.date} className="flex items-center justify-between py-2 border-b border-default800/40 last:border-0">
                                <span className="text-sm text-foreground-tertiary font-mono">{day.date}</span>
                                <div className="flex gap-6">
                                    <span className="text-sm text-foreground-tertiary">
                                        <span className="text-emerald-400">{day.newEvents}</span> new
                                    </span>
                                    <span className="text-sm text-foreground-tertiary">
                                        <span className="text-blue-400">{day.updatedEvents}</span> updates
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ModerationSLAView({ report }: { report: ModerationSLAReport }) {
    const { metrics } = report;

    // Determine SLA status: overdueCount takes priority over withinSLA percentage
    // If items are overdue, we can't show "Healthy" regardless of historical SLA compliance
    const getSLAStatus = () => {
        if (metrics.overdueCount > 0) {
            return metrics.overdueCount > 50 ? 'Critical' : 'At Risk';
        }
        if (metrics.withinSLA >= 90) return 'Healthy';
        if (metrics.withinSLA >= 70) return 'At Risk';
        return 'Critical';
    };

    const slaStatus = getSLAStatus();
    const slaColor = slaStatus === 'Healthy' ? 'text-emerald-400' : slaStatus === 'At Risk' ? 'text-amber-400' : 'text-rose-400';

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <MetricCard label="Total Reviewed" value={metrics.totalReviewed} />
                <MetricCard
                    label="Avg. Review Time"
                    value={`${metrics.averageTimeToReview}h`}
                />
                <MetricCard label="Pending" value={metrics.pendingCount} />
                <MetricCard
                    label="Within SLA"
                    value={`${metrics.withinSLA}%`}
                    valueClassName={slaColor}
                />
                <MetricCard
                    label="Overdue"
                    value={metrics.overdueCount}
                    valueClassName={metrics.overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}
                />
            </div>

            {/* SLA Status Card */}
            <Card className="border border-default800/60 bg-background-950/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        SLA Status
                        <Badge variant={slaStatus === 'Healthy' ? 'default' : 'destructive'}>
                            {slaStatus}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="h-4 w-full rounded-full bg-background-tertiary overflow-hidden">
                            <div
                                className={`h-full transition-all ${slaStatus === 'Healthy' ? 'bg-emerald-500' :
                                    slaStatus === 'At Risk' ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                style={{ width: `${metrics.withinSLA}%` }}
                            />
                        </div>
                        <p className="text-sm text-foreground-tertiary">
                            Target: 24-hour review SLA. {metrics.overdueCount > 0
                                ? `${metrics.overdueCount} items are overdue.`
                                : 'All items are within SLA.'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function EnrichmentCoverageView({ report }: { report: EnrichmentCoverageReport }) {
    const { metrics, byField } = report;

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Events" value={metrics.totalEvents} />
                <MetricCard label="Enriched" value={metrics.enrichedCount} />
                <MetricCard label="Coverage Rate" value={`${metrics.coverageRate}%`} />
                <MetricCard label="Avg. Fields Filled" value={`${metrics.avgFieldsFilled}/10`} />
            </div>

            {/* Field Coverage */}
            <Card className="border border-default800/60 bg-background-950/70">
                <CardHeader>
                    <CardTitle>Field Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {byField.map((field) => (
                            <div key={field.fieldName} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-foreground-tertiary capitalize">{field.fieldName.replace('_', ' ')}</span>
                                    <span className="text-foreground-tertiary">{field.percentage}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-background-tertiary overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all"
                                        style={{ width: `${field.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function MetricCard({
    label,
    value,
    valueClassName
}: {
    label: string;
    value: string | number;
    valueClassName?: string;
}) {
    return (
        <Card className="border border-default800/60 bg-background-950/70">
            <CardContent className="pt-4">
                <p className="text-xs text-foreground-tertiary uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-semibold mt-1 ${valueClassName || 'text-foreground-primary'}`}>
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}
