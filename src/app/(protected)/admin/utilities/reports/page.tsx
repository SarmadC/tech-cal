'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MOCK_REPORTS = [
    {
        id: 'report-01',
        name: 'Weekly Ingestion Summary',
        cadence: 'Every Monday, 07:00 UTC',
        destination: 'ops@techcal.io',
        format: 'CSV',
        lastRun: '2025-01-06T07:00:10Z',
        status: 'Delivered',
    },
    {
        id: 'report-02',
        name: 'Moderation SLA Breaches',
        cadence: 'Daily, 00:00 UTC',
        destination: 'compliance@techcal.io',
        format: 'PDF',
        lastRun: '2025-01-09T00:00:22Z',
        status: 'Delivered',
    },
    {
        id: 'report-03',
        name: 'Ingestion Error Digest',
        cadence: 'Hourly',
        destination: 'alerts@techcal.io',
        format: 'JSON webhook',
        lastRun: '2025-01-09T14:00:00Z',
        status: 'Paused',
    },
];

export default function AdminReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-slate-100">Reports & Exports</h1>
                <p className="text-sm text-slate-400 max-w-3xl">
                    Manage scheduled reports and ad-hoc exports for ingestion observability. These placeholders illustrate the structure we’ll
                    use once the reporting service is wired up.
                </p>
                <div className="flex gap-2">
                    <Button size="sm">Schedule new report</Button>
                    <Button size="sm" variant="outline">
                        Export now
                    </Button>
                </div>
            </div>

            <Card className="border border-slate-800/60 bg-slate-950/70">
                <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {MOCK_REPORTS.map((report) => (
                        <div key={report.id} className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-4 text-sm text-slate-300">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-slate-100">{report.name}</p>
                                    <p className="text-xs text-slate-500">{report.cadence}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={report.status === 'Delivered' ? 'secondary' : 'outline'}>{report.status}</Badge>
                                    <Button size="sm" variant="ghost">
                                        Manage
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-3 grid gap-3 text-xs text-slate-400 md:grid-cols-4">
                                <div>
                                    <span className="block text-slate-500">Destination</span>
                                    <span>{report.destination}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Format</span>
                                    <span>{report.format}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Last Run</span>
                                    <span>{new Date(report.lastRun).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Report ID</span>
                                    <span className="font-mono">{report.id}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <p className="text-xs text-slate-500">
                        These entries are illustrative. Replace them with real scheduled reports once the reporting service is integrated.
                    </p>
                </CardContent>
            </Card>

            <Card className="border border-slate-800/60 bg-slate-950/70">
                <CardHeader>
                    <CardTitle>Ad-hoc Export Templates</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    {['Raw ingestion payloads', 'Moderation audit log', 'Field protection overrides', 'Pending enrichment items'].map(
                        (template) => (
                            <div key={template} className="rounded-lg border border-slate-800/60 bg-slate-950/60 p-4">
                                <p className="text-slate-100">{template}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                    Define export parameters (date range, filters, format) to generate a one-off download.
                                </p>
                                <Button size="sm" className="mt-4">
                                    Configure export
                                </Button>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
}




