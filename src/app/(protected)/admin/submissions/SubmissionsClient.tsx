'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAdminToolbar } from '@/contexts/AdminToolbarContext';
import type { SubmissionItem } from './page';

const EVENT_TYPE_LABELS: Record<string, string> = {
    tech_event: 'Tech Event',
    hackathon: 'Hackathon',
    meetup: 'Meetup',
    conference: 'Conference',
    workshop: 'Workshop',
    other: 'Other',
};

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    declined: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

type StatusFilter = 'pending' | 'approved' | 'declined' | 'all';

interface ReviewModalState {
    submission: SubmissionItem;
    action: 'approve' | 'decline';
    notes: string;
    loading: boolean;
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getSubmitterName(sub: SubmissionItem['submitter']) {
    if (!sub) return 'Unknown';
    return sub.raw_user_meta_data?.full_name || sub.raw_user_meta_data?.name || sub.email;
}

function formatRiskFlag(flag: string) {
    return flag.replace(/_/g, ' ');
}

export default function SubmissionsClient({
    initialSubmissions,
    initialTotal,
}: {
    initialSubmissions: SubmissionItem[];
    initialTotal: number;
}) {
    const { setTitle, setSubtitle, setQuickFilters, setSearch, setToolbarContent } = useAdminToolbar();

    const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialSubmissions);
    const [total, setTotal] = useState(initialTotal);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [modal, setModal] = useState<ReviewModalState | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const pageSize = 20;

    useEffect(() => {
        setTitle('Community submissions');
        setSubtitle('Review events submitted by users and approve or decline them.');
        setQuickFilters([]);
        setSearch(undefined);
        setToolbarContent(undefined);
        return () => {
            setQuickFilters([]);
            setSearch(undefined);
            setToolbarContent(undefined);
        };
    }, [setQuickFilters, setSearch, setSubtitle, setTitle, setToolbarContent]);

    const fetchSubmissions = useCallback(async (status: StatusFilter, p: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status,
                page: String(p),
                pageSize: String(pageSize),
            });
            const res = await fetch(`/api/admin/submissions?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setSubmissions(json.submissions ?? []);
            setTotal(json.total ?? 0);
        } catch {
            // keep existing data
        } finally {
            setLoading(false);
        }
    }, []);

    const handleFilterChange = (f: StatusFilter) => {
        setStatusFilter(f);
        setPage(1);
        fetchSubmissions(f, 1);
        setExpandedId(null);
    };

    const handlePageChange = (p: number) => {
        setPage(p);
        fetchSubmissions(statusFilter, p);
        setExpandedId(null);
    };

    const openModal = (submission: SubmissionItem, action: 'approve' | 'decline') => {
        setModal({ submission, action, notes: '', loading: false });
    };

    const closeModal = () => setModal(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleReview = async () => {
        if (!modal) return;
        setModal((m) => m ? { ...m, loading: true } : null);

        try {
            const res = await fetch('/api/admin/submissions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: modal.submission.id,
                    action: modal.action,
                    admin_notes: modal.notes,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Request failed');
            }

            const label = modal.action === 'approve' ? 'approved' : 'declined';
            showToast(`Submission "${modal.submission.title}" ${label}.`, 'success');
            closeModal();
            // Refresh current view
            fetchSubmissions(statusFilter, page);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
            setModal((m) => m ? { ...m, loading: false } : null);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div
                    className={cn(
                        'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg',
                        toast.type === 'success'
                            ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
                            : 'bg-rose-900/90 text-rose-200 border-rose-500/40'
                    )}
                >
                    {toast.message}
                </div>
            )}

            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                    {(['pending', 'approved', 'declined', 'all'] as StatusFilter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors capitalize',
                                statusFilter === f
                                    ? 'bg-accent-primary-light text-foreground-primary border-accent-primary/40'
                                    : 'border-default text-foreground-tertiary hover:text-foreground-secondary hover:border-white/20'
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-foreground-muted">{total} total</span>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-default overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-foreground-muted text-sm">
                        Loading…
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground-muted">
                        <MaterialIcon name="event" size={24} />
                        <span className="text-sm">No {statusFilter === 'all' ? '' : statusFilter} submissions</span>
                    </div>
                ) : (
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="border-b border-default bg-background-secondary/40">
                                <th className="text-left px-4 py-3 text-foreground-muted font-medium">Event</th>
                                <th className="text-left px-4 py-3 text-foreground-muted font-medium hidden sm:table-cell">Type</th>
                                <th className="text-left px-4 py-3 text-foreground-muted font-medium hidden md:table-cell">Date</th>
                                <th className="text-left px-4 py-3 text-foreground-muted font-medium hidden lg:table-cell">Submitted by</th>
                                <th className="text-left px-4 py-3 text-foreground-muted font-medium">Status</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((sub, idx) => (
                                <>
                                    <tr
                                        key={sub.id}
                                        className={cn(
                                            'border-b border-default last:border-0 cursor-pointer transition-colors',
                                            idx % 2 === 0 ? 'bg-transparent' : 'bg-background-secondary/20',
                                            expandedId === sub.id ? 'bg-accent-primary-light/20' : 'hover:bg-accent-primary-light/10'
                                        )}
                                        onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <span className="text-foreground-primary font-medium line-clamp-1">{sub.title}</span>
                                                {sub.risk_flags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {sub.risk_flags.map((flag) => (
                                                            <Badge
                                                                key={flag}
                                                                variant="outline"
                                                                className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300"
                                                            >
                                                                {formatRiskFlag(flag)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-foreground-tertiary">
                                            {EVENT_TYPE_LABELS[sub.event_type] ?? sub.event_type}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-foreground-tertiary">
                                            {formatDate(sub.start_date)}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-foreground-tertiary">
                                            {getSubmitterName(sub.submitter)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize',
                                                    STATUS_STYLES[sub.status]
                                                )}
                                            >
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {sub.status === 'pending' && (
                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                                        onClick={() => openModal(sub, 'approve')}
                                                    >
                                                        <MaterialIcon name="check" size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                        onClick={() => openModal(sub, 'decline')}
                                                    >
                                                        <MaterialIcon name="close" size={14} />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Expanded detail row */}
                                    {expandedId === sub.id && (
                                        <tr key={`${sub.id}-detail`} className="bg-accent-primary-light/10">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-[13px]">
                                                    {sub.validation_summary?.warnings?.length ? (
                                                        <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                                                            <div className="text-amber-300 text-[11px] uppercase tracking-wide mb-2">
                                                                Submission warnings
                                                            </div>
                                                            <div className="space-y-1 text-amber-100/85">
                                                                {sub.validation_summary.warnings.map((warning) => (
                                                                    <p key={warning}>{warning}</p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    {sub.description && (
                                                        <div className="sm:col-span-2 lg:col-span-3">
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Description</div>
                                                            <p className="text-foreground-secondary leading-relaxed">{sub.description}</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Dates</div>
                                                        <p className="text-foreground-secondary">
                                                            {formatDate(sub.start_date)}
                                                            {sub.end_date ? ` → ${formatDate(sub.end_date)}` : ''}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Location</div>
                                                        <p className="text-foreground-secondary">
                                                            {sub.event_format ?? (sub.is_virtual ? 'Online' : 'In-person')}
                                                            {sub.location ? ` · ${sub.location}` : ''}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Registration</div>
                                                        <p className="text-foreground-secondary capitalize">{sub.registration_mode}</p>
                                                    </div>
                                                    {sub.organizer_name && (
                                                        <div>
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Organizer</div>
                                                            <p className="text-foreground-secondary">{sub.organizer_name}</p>
                                                        </div>
                                                    )}
                                                    {sub.source_url && (
                                                        <div>
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Website</div>
                                                            <a
                                                                href={sub.source_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-accent-primary hover:underline truncate block"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {sub.source_url}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {sub.registration_url && (
                                                        <div>
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Registration URL</div>
                                                            <a
                                                                href={sub.registration_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-accent-primary hover:underline truncate block"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {sub.registration_url}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {sub.tags.length > 0 && (
                                                        <div>
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Tags</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {sub.tags.map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="px-1.5 py-0.5 rounded text-[11px] bg-background-tertiary border border-default text-foreground-tertiary"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {sub.admin_notes && (
                                                        <div className="sm:col-span-2 lg:col-span-3">
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Admin notes</div>
                                                            <p className="text-foreground-secondary">{sub.admin_notes}</p>
                                                        </div>
                                                    )}
                                                    {sub.event_id && (
                                                        <div>
                                                            <div className="text-foreground-muted text-[11px] uppercase tracking-wide mb-1">Published event</div>
                                                            <a
                                                                href={`/admin/ingestion/enrichment/${sub.event_id}`}
                                                                className="text-accent-primary hover:underline text-[12px]"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                View in enrichment →
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {sub.status === 'pending' && (
                                                    <div className="flex gap-2 mt-4 pt-4 border-t border-default/40">
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openModal(sub, 'approve');
                                                            }}
                                                        >
                                                            <MaterialIcon name="check" size={14} className="mr-1.5" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="border border-default text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openModal(sub, 'decline');
                                                            }}
                                                        >
                                                            <MaterialIcon name="close" size={14} className="mr-1.5" />
                                                            Decline
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-[13px]">
                    <span className="text-foreground-muted">
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={page <= 1}
                            onClick={() => handlePageChange(page - 1)}
                            className="border border-default"
                        >
                            <MaterialIcon name="chevron_left" size={14} />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={page >= totalPages}
                            onClick={() => handlePageChange(page + 1)}
                            className="border border-default"
                        >
                            <MaterialIcon name="chevron_right" size={14} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-background-main border border-default rounded-xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-foreground-primary">
                                    {modal.action === 'approve' ? 'Approve submission' : 'Decline submission'}
                                </h2>
                                <p className="text-[13px] text-foreground-tertiary mt-0.5 line-clamp-1">
                                    {modal.submission.title}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-foreground-muted hover:text-foreground-tertiary mt-0.5"
                            >
                                <MaterialIcon name="close" size={18} />
                            </button>
                        </div>

                        {modal.action === 'approve' && (
                            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[13px] text-emerald-300">
                                This will create a new event in the main events table and mark it as needing enrichment.
                            </div>
                        )}

                        <div>
                            <label className="text-[12px] text-foreground-muted font-medium uppercase tracking-wide block mb-1.5">
                                Admin notes (optional)
                            </label>
                            <textarea
                                value={modal.notes}
                                onChange={(e) => setModal((m) => m ? { ...m, notes: e.target.value } : null)}
                                rows={3}
                                placeholder={
                                    modal.action === 'decline'
                                        ? 'Reason for declining…'
                                        : 'Any notes for this event…'
                                }
                                className="w-full bg-background-secondary border border-default rounded-lg px-3 py-2 text-[13px] text-foreground-primary placeholder:text-foreground-muted resize-none focus:outline-none focus:border-accent-primary/50"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button
                                onClick={handleReview}
                                disabled={modal.loading}
                                className={cn(
                                    'flex-1',
                                    modal.action === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                                )}
                            >
                                {modal.loading ? 'Saving…' : modal.action === 'approve' ? 'Approve & publish' : 'Decline'}
                            </Button>
                            <Button variant="ghost" onClick={closeModal} disabled={modal.loading} className="border border-default">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
