'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CommunityReportRecord } from '@/lib/communitySchemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialIcon } from '@/components/ui/Icon';

type ReportFilter = 'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed';

interface ReportUpdateInput {
  status: 'reviewing' | 'resolved' | 'dismissed';
  resolution?: 'removed' | 'warned' | 'no-action' | 'other';
  resolutionNotes?: string;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusVariant(status: CommunityReportRecord['status']) {
  if (status === 'resolved') return 'default';
  if (status === 'dismissed') return 'secondary';
  if (status === 'reviewing') return 'outline';
  return 'destructive';
}

export default function CommunityReportsClient() {
  const [reports, setReports] = useState<CommunityReportRecord[]>([]);
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/admin/community/reports?${params.toString()}`, {
        credentials: 'include',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to load community reports.');
      }

      setReports(payload.data ?? []);
      setNotes((current) => {
        const next = { ...current };
        for (const report of payload.data ?? []) {
          if (!(report.id in next)) {
            next[report.id] = report.resolutionNotes ?? '';
          }
        }
        return next;
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load community reports.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  async function updateReport(reportId: string, input: ReportUpdateInput) {
    setSubmittingId(reportId);
    setError(null);

    try {
      const response = await fetch('/api/admin/community/reports', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          ...input,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update community report.');
      }

      await fetchReports();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update report.');
    } finally {
      setSubmittingId(null);
    }
  }

  const filters: ReportFilter[] = ['all', 'open', 'reviewing', 'resolved', 'dismissed'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground-primary">Community Reports</h1>
          <p className="max-w-3xl text-sm text-foreground-tertiary">
            Review mobile and web reports, record moderation decisions, and keep UGC workflows inside the admin surface instead of scattered across raw API calls.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchReports()}
          disabled={loading}
        >
          <MaterialIcon name="refresh" size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((option) => (
          <Button
            key={option}
            variant={filter === option ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter(option)}
          >
            {option === 'all' ? 'All reports' : option}
          </Button>
        ))}
      </div>

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="pt-6 text-sm text-rose-100">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-foreground-tertiary">
            <MaterialIcon name="refresh" size={16} className="animate-spin" />
            Loading reports...
          </CardContent>
        </Card>
      ) : null}

      {!loading && !reports.length ? (
        <Card>
          <CardContent className="pt-6 text-sm text-foreground-tertiary">
            No reports in this state.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="border border-default800/60 bg-background-950/70">
            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg capitalize">
                    {report.subjectType} report
                  </CardTitle>
                  <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                  <Badge variant="metadata">{report.reason}</Badge>
                  {report.resolution ? (
                    <Badge variant="outline">Resolution: {report.resolution}</Badge>
                  ) : null}
                </div>
                <CardDescription className="max-w-3xl text-sm leading-6 text-foreground-tertiary">
                  Subject <span className="font-mono text-xs text-foreground-secondary">{report.subjectId}</span>
                  {' '}reported by <span className="font-mono text-xs text-foreground-secondary">{report.reporterId}</span>
                  {' '}on {formatTimestamp(report.createdAt)}
                </CardDescription>
              </div>
              <div className="text-xs text-foreground-muted">
                {report.reviewedAt ? `Reviewed ${formatTimestamp(report.reviewedAt)}` : 'Awaiting admin review'}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-default800/60 bg-background-900/70 p-4 text-sm text-foreground-secondary">
                {report.details?.trim() ? report.details : 'No additional notes were provided by the reporter.'}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`resolution-notes-${report.id}`}
                  className="text-xs font-medium uppercase tracking-wide text-foreground-muted"
                >
                  Moderator notes
                </label>
                <textarea
                  id={`resolution-notes-${report.id}`}
                  value={notes[report.id] ?? ''}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                  placeholder="Add removal context, warning language, or internal follow-up."
                  className="min-h-28 w-full rounded-lg border border-default800 bg-background-950/60 px-3 py-2 text-sm text-foreground-primary outline-none transition focus:border-accent-primary"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submittingId === report.id || report.status === 'reviewing'}
                  onClick={() =>
                    void updateReport(report.id, {
                      status: 'reviewing',
                      resolutionNotes: notes[report.id] || undefined,
                    })
                  }
                >
                  Mark reviewing
                </Button>
                <Button
                  size="sm"
                  disabled={submittingId === report.id}
                  onClick={() =>
                    void updateReport(report.id, {
                      status: 'resolved',
                      resolution: 'removed',
                      resolutionNotes: notes[report.id] || undefined,
                    })
                  }
                >
                  Resolve as removed
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={submittingId === report.id}
                  onClick={() =>
                    void updateReport(report.id, {
                      status: 'resolved',
                      resolution: 'warned',
                      resolutionNotes: notes[report.id] || undefined,
                    })
                  }
                >
                  Resolve with warning
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={submittingId === report.id}
                  onClick={() =>
                    void updateReport(report.id, {
                      status: 'dismissed',
                      resolution: 'no-action',
                      resolutionNotes: notes[report.id] || undefined,
                    })
                  }
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
