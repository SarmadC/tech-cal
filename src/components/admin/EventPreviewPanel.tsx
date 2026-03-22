'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import UpdateQueueSignalBadges from '@/components/admin/UpdateQueueSignalBadges';
import {
    formatQueueFieldLabel,
    isScheduleField,
    sortQueueFields,
    type UpdateQueueSignals,
} from '@/lib/admin/updateQueueTriage';

export interface QueueItemPreview {
    id: string;
    event_id: string;
    source_event_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'partially_approved';
    requires_review_reason?: string;
    created_at: string;
    signals: UpdateQueueSignals;
    changedFieldNames: string[];
    event?: {
        id: string;
        title: string;
        start_time: string | null;
        description?: string;
        location?: string;
        source_url?: string;
        organizer?: {
            id: string;
            name: string;
        };
    };
    fieldCounts: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

interface QueueField {
    id: string;
    field_name: string;
    old_value: unknown;
    new_value: unknown;
    field_status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
    confidence?: number;
}

interface EventPreviewPanelProps {
    item: QueueItemPreview;
    returnTo: string;
    onClose: () => void;
    onActionComplete: () => void;
    onOpenFullReview?: () => void;
}

const statusBadgeStyles: Record<QueueItemPreview['status'], string> = {
    pending: 'bg-amber-400/15 text-amber-200 border border-amber-500/30',
    approved: 'bg-emerald-400/15 text-emerald-200 border border-emerald-500/30',
    rejected: 'bg-rose-500/15 text-rose-200 border border-rose-500/30',
    auto_applied: 'bg-sky-500/15 text-sky-200 border border-sky-500/30',
    partially_approved: 'bg-purple-500/15 text-purple-200 border border-purple-500/30',
};

const fieldStatusStyles: Record<string, string> = {
    pending: 'border-amber-500/30 bg-amber-950/30',
    approved: 'border-emerald-500/30 bg-emerald-950/20',
    rejected: 'border-rose-500/30 bg-rose-950/20',
    auto_applied: 'border-sky-500/30 bg-sky-950/20',
};

export default function EventPreviewPanel({
    item,
    returnTo,
    onClose,
    onActionComplete,
    onOpenFullReview,
}: EventPreviewPanelProps) {
    const [fields, setFields] = useState<QueueField[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        const fetchFields = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/admin/ingestion/update-queue/${item.id}`, {
                    credentials: 'include',
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Failed to fetch fields: ${response.status} ${text}`);
                }
                const data = await response.json();
                setFields(data.fields || []);
            } catch (error) {
                console.error('Error fetching fields:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFields();
    }, [item.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleApproveAll = useCallback(async () => {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/admin/ingestion/update-queue/${item.id}?action=approve`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to approve');
            showSuccess('All fields approved successfully');
            onActionComplete();
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    }, [item.id, onActionComplete, showError, showSuccess]);

    const handleRejectAll = useCallback(async () => {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/admin/ingestion/update-queue/${item.id}?action=reject`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to reject');
            showSuccess('All fields rejected');
            onActionComplete();
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    }, [item.id, onActionComplete, showError, showSuccess]);

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '(empty)';
        if (typeof value === 'string') return value || '(empty)';
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) {
            return value.length > 0
                ? value.slice(0, 5).join(', ') + (value.length > 5 ? '...' : '')
                : '(empty array)';
        }
        if (typeof value === 'object') {
            try {
                const str = JSON.stringify(value);
                return str.length > 100 ? str.substring(0, 100) + '...' : str;
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    const orderedFields = sortQueueFields(fields);
    const pendingFields = orderedFields.filter((field) => field.field_status === 'pending');
    const prioritizedFieldNames = item.changedFieldNames.slice(0, 4);

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                className={cn(
                    'fixed inset-y-0 right-0 z-50 w-full max-w-2xl',
                    'bg-background-main border-l border-default',
                    'flex flex-col shadow-2xl',
                    'animate-in slide-in-from-right duration-300'
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="preview-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-default px-6 py-4">
                    <div className="min-w-0 flex-1">
                        <h2 id="preview-title" className="text-lg font-semibold text-foreground-primary truncate">
                            {item.event?.title ?? 'Untitled Event'}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-tertiary">
                            {item.event?.organizer?.name && <span>{item.event.organizer.name}</span>}
                            {item.event?.start_time && (
                                <span>• {format(new Date(item.event.start_time), 'MMM d, yyyy HH:mm')}</span>
                            )}
                            {item.event?.start_time && (
                                <span>• {formatDistanceToNow(new Date(item.event.start_time), { addSuffix: true })}</span>
                            )}
                            <span>• Queued {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                            <Badge className={cn('ml-1', statusBadgeStyles[item.status])}>
                                {item.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <UpdateQueueSignalBadges signals={item.signals} className="mt-3" />
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-secondary"
                        aria-label="Close panel"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 border-b border-default bg-background-secondary px-6 py-4">
                    <div className="rounded-lg border border-default/60 bg-background-main/50 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-foreground-muted">Pending</div>
                        <div className="mt-1 text-2xl font-semibold text-foreground-primary">
                            {item.fieldCounts.pending}
                        </div>
                    </div>
                    <div className="rounded-lg border border-default/60 bg-background-main/50 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-foreground-muted">Schedule</div>
                        <div className="mt-1 text-sm font-medium text-foreground-primary">
                            {item.signals.hasScheduleChange ? 'Changed' : 'No change'}
                        </div>
                    </div>
                    <div className="rounded-lg border border-default/60 bg-background-main/50 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-foreground-muted">Queued</div>
                        <div className="mt-1 text-sm font-medium text-foreground-primary">
                            {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                    </div>
                </div>

                {(item.requires_review_reason || prioritizedFieldNames.length > 0) && (
                    <div className="border-b border-default bg-background-secondary/40 px-6 py-4">
                        {item.requires_review_reason && (
                            <div className="flex items-start gap-2 text-sm text-amber-100">
                                <MaterialIcon name="warning" size={16} className="mt-0.5 text-amber-300" />
                                <div>
                                    <div className="font-medium text-amber-200">Review reason</div>
                                    <div>{item.requires_review_reason}</div>
                                </div>
                            </div>
                        )}
                        {prioritizedFieldNames.length > 0 && (
                            <div className={cn('flex flex-wrap gap-2', item.requires_review_reason ? 'mt-3' : '')}>
                                {prioritizedFieldNames.map((fieldName) => (
                                    <span
                                        key={fieldName}
                                        className={cn(
                                            'rounded border px-2 py-1 text-[11px]',
                                            isScheduleField(fieldName)
                                                ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                                                : 'border-default/60 bg-background-main/50 text-foreground-secondary'
                                        )}
                                    >
                                        {formatQueueFieldLabel(fieldName)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                        Field Changes
                    </h3>

                    {loading ? (
                        <div className="py-8 text-center text-sm text-foreground-muted">Loading fields...</div>
                    ) : orderedFields.length === 0 ? (
                        <div className="py-8 text-center text-sm text-foreground-muted">No field changes found</div>
                    ) : (
                        <div className="space-y-3">
                            {orderedFields.slice(0, 10).map((field) => (
                                <div
                                    key={field.id}
                                    className={cn(
                                        'rounded-lg border p-3',
                                        fieldStatusStyles[field.field_status] ?? 'border-default bg-background-secondary'
                                    )}
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <code className="text-xs font-medium text-foreground-secondary">
                                            {formatQueueFieldLabel(field.field_name)}
                                        </code>
                                        <Badge
                                            className={cn(
                                                'px-2 py-0.5 text-[10px]',
                                                field.field_status === 'pending' && 'bg-amber-500/20 text-amber-200',
                                                field.field_status === 'approved' && 'bg-emerald-500/20 text-emerald-200',
                                                field.field_status === 'rejected' && 'bg-rose-500/20 text-rose-200'
                                            )}
                                        >
                                            {field.field_status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <div className="mb-1 text-foreground-muted">Current</div>
                                            <div className="truncate font-mono text-foreground-tertiary">
                                                {formatValue(field.old_value)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 text-foreground-muted">New</div>
                                            <div className="truncate font-mono text-foreground-secondary">
                                                {formatValue(field.new_value)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {orderedFields.length > 10 && (
                                <div className="text-center text-xs text-foreground-muted">
                                    +{orderedFields.length - 10} more fields
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-default bg-background-secondary px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href={`/admin/ingestion/update-queue/${item.id}?returnTo=${encodeURIComponent(returnTo)}`}
                            scroll={false}
                            onClick={() => onOpenFullReview?.()}
                            className="inline-flex items-center gap-2 text-sm text-foreground-tertiary hover:text-foreground-secondary"
                        >
                            <MaterialIcon name="arrow-up-right" size={14} />
                            Open full review
                        </Link>

                        {pendingFields.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleRejectAll}
                                    disabled={actionLoading}
                                    className="bg-rose-600 hover:bg-rose-700"
                                >
                                    Reject All
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleApproveAll}
                                    disabled={actionLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Approve All ({pendingFields.length})
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
                        <span>Queued {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-default bg-background-tertiary px-1.5 py-0.5 text-[10px]">
                                Esc
                            </kbd>
                            to close
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
