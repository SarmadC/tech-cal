/**
 * Update Review Client Component
 * 
 * Shows field-by-field diffs with approve/reject actions
 * Supports vim-style keyboard navigation: j/k to move, a to approve, r to reject
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import UpdateQueueSignalBadges from '@/components/admin/UpdateQueueSignalBadges';
import {
    deriveUpdateQueueSignals,
    formatQueueFieldLabel,
    isScheduleField,
    sortQueueFields,
} from '@/lib/admin/updateQueueTriage';
import {
    buildQueueContinuationLookupUrl,
    buildQueueReturnTo,
    isQueueReturnTo,
    readQueueReturnPage,
} from '@/lib/admin/updateQueueContinuation';
import { formatRelationLabels } from '@/services/ingestion/utils/enrichmentQueue';

interface QueueField {
    id: string;
    field_name: string;
    old_value: unknown;
    new_value: unknown;
    field_status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
    confidence?: number;
    reviewed_at?: string;
}

interface QueueItem {
    id: string;
    event_id: string;
    source_event_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'partially_approved';
    requires_review_reason?: string;
    created_at: string;
    event?: {
        id: string;
        title: string;
        start_time: string | null;
        organizer?: {
            id: string;
            name: string;
        };
    };
}

interface UpdateReviewClientProps {
    queueId: string;
    returnTo: string;
    initialData: {
        queue: QueueItem;
        fields: QueueField[];
    } | null;
}

interface NextPendingItem {
    id: string;
    eventTitle: string;
}

interface QueueListItemForContinuation {
    id: string;
    event?: {
        title?: string | null;
    } | null;
}

interface ContinuationResolution {
    nextItem: NextPendingItem | null;
    fallbackReturnTo: string;
}

interface QueueActionResponse {
    success?: boolean;
    approvedFields?: string[];
    rejectedFields?: string[];
    status?: string;
    warnings?: string[];
    error?: string;
}

const readResponseError = async (response: Response, fallback: string): Promise<string> => {
    if (response.ok) {
        return fallback;
    }

    const errorBody = await response.json().catch(() => ({}));
    return (errorBody && typeof errorBody.error === 'string' && errorBody.error) || fallback;
};

const readActionResponse = async (response: Response): Promise<QueueActionResponse> => {
    return response.json().catch(() => ({}));
};

const formatActionWarnings = (warnings?: string[]): string => {
    if (!warnings || warnings.length === 0) {
        return '';
    }

    return ` ${warnings.join(' ')}`;
};

const buildApprovalMessage = (
    data: QueueActionResponse,
    defaultSuccess: string,
): { type: 'success' | 'error'; text: string } => {
    const approvedCount = data.approvedFields?.length ?? 0;
    const rejectedCount = data.rejectedFields?.length ?? 0;
    const warningText = formatActionWarnings(data.warnings);

    if (approvedCount === 0 && rejectedCount > 0) {
        const rejectedList = data.rejectedFields?.join(', ') ?? 'selected fields';
        return {
            type: 'error',
            text: `No fields were approved. Rejected: ${rejectedList}.${warningText}`,
        };
    }

    if (approvedCount > 0 && rejectedCount > 0) {
        return {
            type: 'success',
            text: `${defaultSuccess} Rejected ${rejectedCount} invalid field(s).${warningText}`,
        };
    }

    return {
        type: 'success',
        text: `${defaultSuccess}${warningText}`,
    };
};

const isContinuationTerminalStatus = (status?: string): boolean => {
    return status === 'approved' || status === 'rejected' || status === 'auto_applied';
};

const toNextPendingItem = (item: QueueListItemForContinuation): NextPendingItem => ({
    id: item.id,
    eventTitle: item.event?.title || 'Untitled Event',
});

export default function UpdateReviewClient({ queueId, initialData, returnTo }: UpdateReviewClientProps) {
    const router = useRouter();
    const { showConfirmation, showError, showSuccess } = useSnackbar();
    const [queue, setQueue] = useState<QueueItem | null>(initialData?.queue || null);
    const [fields, setFields] = useState<QueueField[]>(initialData?.fields || []);
    const [loading, setLoading] = useState(!initialData);
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editedValues, setEditedValues] = useState<Record<string, string>>({});
    const [savingField, setSavingField] = useState<string | null>(null);

    // Keyboard navigation state
    const [focusedFieldIndex, setFocusedFieldIndex] = useState<number>(-1);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const fieldRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // "Up next" navigation state
    const [nextItem, setNextItem] = useState<NextPendingItem | null>(null);
    const orderedFields = useMemo(() => sortQueueFields(fields), [fields]);
    const canContinueWithinQueue = isQueueReturnTo(returnTo);

    const goBackToQueueContext = useCallback(
        (target = returnTo) => {
            router.push(target, { scroll: false });
        },
        [returnTo, router]
    );

    const fetchQueueDetail = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/ingestion/update-queue/${queueId}`, {
                cache: 'no-store',
                credentials: 'include',
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const detail =
                    (errorBody && typeof errorBody.error === 'string' && errorBody.error) ||
                    response.statusText ||
                    'Failed to fetch queue item';

                if (response.status === 404) {
                    setQueue(null);
                    setFields([]);
                    setMessage({
                        type: 'error',
                        text: 'Queue item not found (it may have been resolved or deleted).',
                    });
                    setLoading(false);
                    return;
                }

                throw new Error(detail);
            }

            const data = await response.json();
            setQueue(data.queue);
            setFields(data.fields || []);
        } catch (error) {
            console.warn('Error fetching queue detail:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to load queue item details',
            });
        } finally {
            setLoading(false);
        }
    }, [queueId]);

    useEffect(() => {
        if (!initialData) {
            fetchQueueDetail();
        }
    }, [initialData, fetchQueueDetail]);

    const fetchContinuationPage = useCallback(
        async (page: number): Promise<QueueListItemForContinuation[]> => {
            const lookupUrl = buildQueueContinuationLookupUrl(returnTo, page);

            if (!lookupUrl) {
                return [];
            }

            try {
                const response = await fetch(lookupUrl, {
                    cache: 'no-store',
                    credentials: 'include',
                });

                if (!response.ok) {
                    return [];
                }

                const data = await response.json().catch(() => ({}));
                return Array.isArray(data.items) ? (data.items as QueueListItemForContinuation[]) : [];
            } catch {
                return [];
            }
        },
        [returnTo]
    );

    const resolveContinuationTarget = useCallback(
        async (currentQueueItemId: string): Promise<ContinuationResolution> => {
            if (!canContinueWithinQueue) {
                return {
                    nextItem: null,
                    fallbackReturnTo: returnTo,
                };
            }

            const currentPage = readQueueReturnPage(returnTo);
            const currentPageItems = await fetchContinuationPage(currentPage);
            const nextFromCurrentPage = currentPageItems.find((item) => item.id !== currentQueueItemId);

            if (nextFromCurrentPage) {
                return {
                    nextItem: toNextPendingItem(nextFromCurrentPage),
                    fallbackReturnTo: buildQueueReturnTo(returnTo, currentPage),
                };
            }

            if (currentPage > 1) {
                const previousPage = currentPage - 1;
                const previousPageItems = await fetchContinuationPage(previousPage);
                const nextFromPreviousPage = previousPageItems.find((item) => item.id !== currentQueueItemId);

                if (nextFromPreviousPage) {
                    return {
                        nextItem: toNextPendingItem(nextFromPreviousPage),
                        fallbackReturnTo: buildQueueReturnTo(returnTo, previousPage),
                    };
                }

                return {
                    nextItem: null,
                    fallbackReturnTo: buildQueueReturnTo(returnTo, previousPage),
                };
            }

            return {
                nextItem: null,
                fallbackReturnTo: buildQueueReturnTo(returnTo, currentPage),
            };
        },
        [canContinueWithinQueue, fetchContinuationPage, returnTo]
    );

    const continueAfterTerminalAction = useCallback(
        async (currentQueueItemId: string, successMessage: string) => {
            const resolution = await resolveContinuationTarget(currentQueueItemId);

            if (resolution.nextItem) {
                const nextUrl =
                    `/admin/ingestion/update-queue/${resolution.nextItem.id}` +
                    `?returnTo=${encodeURIComponent(resolution.fallbackReturnTo)}`;
                showSuccess(`${successMessage} Opening the next review item.`);
                router.push(nextUrl);
                return;
            }

            showSuccess(successMessage);
            goBackToQueueContext(resolution.fallbackReturnTo);
        },
        [goBackToQueueContext, resolveContinuationTarget, router, showSuccess]
    );

    useEffect(() => {
        let cancelled = false;

        const loadNextItemHint = async () => {
            if (!canContinueWithinQueue) {
                setNextItem(null);
                return;
            }

            const resolution = await resolveContinuationTarget(queueId);
            if (!cancelled) {
                setNextItem(resolution.nextItem);
            }
        };

        void loadNextItemHint();

        return () => {
            cancelled = true;
        };
    }, [canContinueWithinQueue, queueId, resolveContinuationTarget]);

    const handleApproveAll = async () => {
        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=approve`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error(await readResponseError(response, 'Failed to approve'));
            const data = await readActionResponse(response);
            const actionMessage = buildApprovalMessage(data, 'All fields approved successfully.');
            if (actionMessage.type === 'error') {
                setMessage(actionMessage);
                showError(actionMessage.text);
                await fetchQueueDetail();
            } else {
                await continueAfterTerminalAction(queueId, actionMessage.text);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
            showError(error instanceof Error ? error.message : 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectAll = async () => {
        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=reject`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error(await readResponseError(response, 'Failed to reject'));
            await continueAfterTerminalAction(queueId, 'All fields rejected.');
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to reject' });
            showError(error instanceof Error ? error.message : 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEvent = useCallback(async () => {
        if (!queue?.event_id) return;

        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=delete-event`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error(await readResponseError(response, 'Failed to delete event'));
            await continueAfterTerminalAction(queueId, 'Event deleted successfully.');
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete event' });
            showError(error instanceof Error ? error.message : 'Failed to delete event');
        } finally {
            setActionLoading(false);
        }
    }, [continueAfterTerminalAction, queue?.event_id, queueId, showError]);

    const confirmDeleteEvent = useCallback(() => {
        if (!queue?.event_id) {
            return;
        }

        showConfirmation(
            'Delete event?',
            `This will permanently delete "${queue.event?.title || 'Unknown event'}" and all related records. This cannot be undone.`,
            () => {
                void handleDeleteEvent();
            },
            {
                confirmText: 'Delete event',
                cancelText: 'Keep event',
            }
        );
    }, [handleDeleteEvent, queue?.event?.title, queue?.event_id, showConfirmation]);

    const handleApproveSelective = async () => {
        if (selectedFields.size === 0) {
            setMessage({ type: 'error', text: 'Please select at least one field to approve' });
            return;
        }

        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=approve-selective`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fieldNames: Array.from(selectedFields) }),
                }
            );
            if (!response.ok) throw new Error(await readResponseError(response, 'Failed to approve selected fields'));
            const data = await readActionResponse(response);
            const actionMessage = buildApprovalMessage(
                data,
                `${selectedFields.size} field(s) approved successfully.`
            );
            setMessage(actionMessage);
            setSelectedFields(new Set());

            if (isContinuationTerminalStatus(data.status)) {
                await continueAfterTerminalAction(queueId, actionMessage.text);
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
            showError(error instanceof Error ? error.message : 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    // Single field approve/reject for keyboard navigation
    const handleApproveSingleField = async (fieldName: string) => {
        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=approve-selective`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fieldNames: [fieldName] }),
                }
            );
            if (!response.ok) throw new Error(await readResponseError(response, 'Failed to approve field'));
            const data = await readActionResponse(response);
            const actionMessage = buildApprovalMessage(data, `Field "${fieldName}" approved.`);
            setMessage(actionMessage);

            if (isContinuationTerminalStatus(data.status)) {
                await continueAfterTerminalAction(queueId, actionMessage.text);
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
            showError(error instanceof Error ? error.message : 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectSingleField = async (fieldName: string) => {
        setActionLoading(true);
        setMessage(null);
        try {
            // Use reject-selective endpoint if available, otherwise reject all and re-approve others
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=reject-selective`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fieldNames: [fieldName] }),
                }
            );
            if (!response.ok) throw new Error(await readResponseError(response, 'Failed to reject field'));
            const data = await readActionResponse(response);
            const successText = `Field "${fieldName}" rejected`;
            setMessage({ type: 'success', text: successText });

            if (isContinuationTerminalStatus(data.status)) {
                await continueAfterTerminalAction(queueId, successText);
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to reject' });
            showError(error instanceof Error ? error.message : 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if in an input/textarea or if shortcuts modal is open
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (e.key === '?' && e.shiftKey) {
                e.preventDefault();
                setShortcutsOpen(true);
                return;
            }

            if (e.key === 'Escape') {
                if (shortcutsOpen) {
                    setShortcutsOpen(false);
                }
                return;
            }

            // Navigation
            if (e.key === 'j' || e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedFieldIndex((prev) => Math.min(prev + 1, orderedFields.length - 1));
                return;
            }

            if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedFieldIndex((prev) => Math.max(prev - 1, 0));
                return;
            }

            // Actions on focused field
            if (focusedFieldIndex >= 0 && focusedFieldIndex < orderedFields.length) {
                const focusedField = orderedFields[focusedFieldIndex];

                if (focusedField.field_status !== 'pending') {
                    return; // Only allow actions on pending fields
                }

                if (e.key === 'a') {
                    e.preventDefault();
                    handleApproveSingleField(focusedField.field_name);
                    return;
                }

                if (e.key === 'r') {
                    e.preventDefault();
                    handleRejectSingleField(focusedField.field_name);
                    return;
                }

                if (e.key === ' ') {
                    e.preventDefault();
                    toggleFieldSelection(focusedField.field_name);
                    return;
                }

                if (e.key === 'e') {
                    e.preventDefault();
                    startEditingField(focusedField);
                    return;
                }
            }

            // Bulk actions
            if (e.key === 'A' && e.shiftKey) {
                e.preventDefault();
                handleApproveAll();
                return;
            }

            if (e.key === 'R' && e.shiftKey) {
                e.preventDefault();
                handleRejectAll();
                return;
            }

            if (e.key === 'D' && e.shiftKey && queue?.event_id) {
                e.preventDefault();
                confirmDeleteEvent();
                return;
            }

            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                goBackToQueueContext();
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [confirmDeleteEvent, focusedFieldIndex, goBackToQueueContext, handleApproveAll, handleRejectAll, orderedFields, queue?.event_id, shortcutsOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- keyboard handler intentionally uses the latest render state snapshot

    // Scroll focused field into view
    useEffect(() => {
        if (focusedFieldIndex >= 0) {
            const el = fieldRefs.current.get(focusedFieldIndex);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [focusedFieldIndex]);

    // Clean up fieldRefs Map when fields change to prevent DOM reference leaks
    useEffect(() => {
        // Remove refs for indices that no longer exist in the fields array
        const currentFieldCount = orderedFields.length;
        const refsMap = fieldRefs.current;
        for (const index of refsMap.keys()) {
            if (index >= currentFieldCount) {
                refsMap.delete(index);
            }
        }
    }, [orderedFields.length]);

    const toggleFieldSelection = (fieldName: string) => {
        const newSelected = new Set(selectedFields);
        if (newSelected.has(fieldName)) {
            newSelected.delete(fieldName);
        } else {
            newSelected.add(fieldName);
        }
        setSelectedFields(newSelected);
    };

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) return '(empty)';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        const relationLabels = formatRelationLabels(value);
        if (relationLabels) {
            return relationLabels.length > 0 ? relationLabels.join(', ') : '(empty array)';
        }
        if (Array.isArray(value)) {
            const hasObjects = value.some((item) => typeof item === 'object');
            if (hasObjects) {
                try {
                    return JSON.stringify(value, null, 2);
                } catch {
                    return String(value);
                }
            }
            return value.length > 0 ? value.join(', ') : '(empty array)';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    const serializeForEditing = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    };

    const parseEditedValue = (raw: string): unknown => {
        const trimmed = raw.trim();
        if (!trimmed) return '';
        try {
            return JSON.parse(trimmed);
        } catch {
            return raw;
        }
    };

    const startEditingField = (field: QueueField) => {
        setEditingField(field.field_name);
        setEditedValues((prev) => ({
            ...prev,
            [field.field_name]: serializeForEditing(field.new_value),
        }));
    };

    const cancelEditingField = () => {
        setEditingField(null);
    };

    const handleSaveEditedField = async (fieldName: string) => {
        const rawValue = editedValues[fieldName] ?? '';
        const parsedValue = parseEditedValue(rawValue);

        setSavingField(fieldName);
        setMessage(null);

        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=update-field`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fieldName, newValue: parsedValue }),
                }
            );

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || 'Failed to update field value');
            }

            const data = await response.json().catch(() => ({ newValue: parsedValue }));
            const savedValue = 'newValue' in data ? data.newValue : parsedValue;

            setFields((prev) =>
                prev.map((field) =>
                    field.field_name === fieldName ? { ...field, new_value: savedValue } : field
                )
            );

            setMessage({ type: 'success', text: `Updated ${fieldName}` });
            setEditingField(null);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to update field value',
            });
        } finally {
            setSavingField(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            auto_applied: 'bg-blue-100 text-blue-800',
        };
        return (
            <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    const pendingFields = orderedFields.filter((field) => field.field_status === 'pending');
    const approvedFields = orderedFields.filter((field) => field.field_status === 'approved');
    const rejectedFields = orderedFields.filter((field) => field.field_status === 'rejected');
    const queueSignals = deriveUpdateQueueSignals({
        requiresReviewReason: queue?.requires_review_reason,
        eventStartTime: queue?.event?.start_time ?? null,
        fieldNames: orderedFields.map((field) => field.field_name),
    });
    const prioritizedFieldNames = orderedFields.map((field) => field.field_name).slice(0, 4);

    // Check if event is in the past
    const isPastEvent = queue?.event?.start_time
        ? new Date(queue.event.start_time) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // More than 7 days ago
        : false;

    const daysAgo = queue?.event?.start_time
        ? Math.floor((Date.now() - new Date(queue.event.start_time).getTime()) / (24 * 60 * 60 * 1000))
        : null;

    if (loading) {
        return <div className="text-center py-8">Loading update details...</div>;
    }

    if (!queue) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-red-600">
                    Queue item not found
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 pb-32">
            {/* Message */}
            {message && (
                <div
                    className={`p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                        }`}
                >
                    {message.text}
                </div>
            )}

            {/* Past Event Warning */}
            {isPastEvent && daysAgo !== null && (
                <Card className="border-orange-300 bg-orange-50">
                    <CardContent className="pt-6">
                        <div>
                            <div className="mb-2 font-semibold text-orange-800">Past Event Warning</div>
                            <p className="text-sm text-orange-700">
                                This event occurred <strong>{daysAgo} days ago</strong> ({queue.event?.start_time ? format(new Date(queue.event.start_time), 'MMM d, yyyy') : 'Unknown date'}).
                                Past events are typically not relevant for a calendar of upcoming events. The sticky review bar below keeps the fastest reject and delete actions available while you scan the diff.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Queue Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <CardTitle className="mb-2 text-xl">
                                {queue.event?.title || 'Untitled Event'}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                {queue.event?.organizer && <span>Organizer: {queue.event.organizer.name}</span>}
                                {queue.event?.start_time && (
                                    <>
                                        <span>{format(new Date(queue.event.start_time), 'MMM d, yyyy HH:mm')}</span>
                                        <span>{formatDistanceToNow(new Date(queue.event.start_time), { addSuffix: true })}</span>
                                    </>
                                )}
                                <span>Queued {formatDistanceToNow(new Date(queue.created_at), { addSuffix: true })}</span>
                            </div>
                            <UpdateQueueSignalBadges signals={queueSignals} className="mt-3" />
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusBadge(queue.status)}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {(queue.requires_review_reason || prioritizedFieldNames.length > 0) && (
                        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            {queue.requires_review_reason && (
                                <div className="text-sm text-slate-700">
                                    <strong>Review reason:</strong> {queue.requires_review_reason}
                                </div>
                            )}
                            {prioritizedFieldNames.length > 0 && (
                                <div className={cn('flex flex-wrap gap-2', queue.requires_review_reason ? 'mt-3' : '')}>
                                    {prioritizedFieldNames.map((fieldName) => (
                                        <span
                                            key={fieldName}
                                            className={cn(
                                                'rounded border px-2 py-1 text-[11px]',
                                                isScheduleField(fieldName)
                                                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                    : 'border-slate-200 bg-white text-slate-700'
                                            )}
                                        >
                                            {formatQueueFieldLabel(fieldName)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500">Pending</div>
                            <div className="font-semibold text-yellow-600">{pendingFields.length}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Approved</div>
                            <div className="font-semibold text-green-600">{approvedFields.length}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Rejected</div>
                            <div className="font-semibold text-red-600">{rejectedFields.length}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Schedule</div>
                            <div className="font-semibold text-sky-700">
                                {queueSignals.hasScheduleChange ? 'Changed' : 'No change'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Field Diffs */}
            <Card>
                <CardHeader>
                    <CardTitle>Field Changes</CardTitle>
                </CardHeader>
                <CardContent>
                    {orderedFields.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No field changes found</div>
                    ) : (
                        <div className="space-y-4">
                            {orderedFields.map((field, index) => {
                                const isPending = field.field_status === 'pending';
                                const isSelected = selectedFields.has(field.field_name);
                                const isEditing = editingField === field.field_name;
                                const isFocused = focusedFieldIndex === index;

                                return (
                                    <div
                                        key={field.id}
                                        ref={(el) => {
                                            if (el) fieldRefs.current.set(index, el);
                                        }}
                                        className={cn(
                                            'border rounded-lg p-4 transition-all',
                                            isPending
                                                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40'
                                                : field.field_status === 'approved'
                                                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                                                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
                                            isFocused && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900'
                                        )}
                                        onClick={() => setFocusedFieldIndex(index)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                {isPending && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleFieldSelection(field.field_name)}
                                                        className="w-4 h-4"
                                                    />
                                                )}
                                                <h3 className="font-mono font-semibold">
                                                    {formatQueueFieldLabel(field.field_name)}
                                                </h3>
                                                {getStatusBadge(field.field_status)}
                                                {field.confidence && (
                                                    <span className="text-xs text-gray-500">
                                                        Confidence: {(field.confidence * 100).toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    Old Value
                                                </div>
                                                <div className="bg-white dark:bg-zinc-900 p-3 rounded border border-gray-200 dark:border-gray-700 font-mono text-xs whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                                                    {formatValue(field.old_value)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                                                    New Value
                                                </div>
                                                {isPending && isEditing ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            className="w-full min-h-[140px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-900 p-3 font-mono text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            value={editedValues[field.field_name] ?? ''}
                                                            onChange={(e) =>
                                                                setEditedValues((prev) => ({
                                                                    ...prev,
                                                                    [field.field_name]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSaveEditedField(field.field_name)}
                                                                disabled={savingField === field.field_name}
                                                            >
                                                                {savingField === field.field_name ? 'Saving...' : 'Save'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={cancelEditingField}
                                                                disabled={savingField === field.field_name}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Tip: enter JSON for objects/arrays. Plain strings are saved as-is.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="bg-white dark:bg-zinc-900 p-3 rounded border border-gray-200 dark:border-gray-700 font-mono text-xs whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                                                            {formatValue(field.new_value)}
                                                        </div>
                                                        {isPending && (
                                                            <div className="mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => startEditingField(field)}
                                                                    disabled={savingField === field.field_name || actionLoading}
                                                                >
                                                                    Edit
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="fixed inset-x-0 bottom-4 z-40 px-4">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-default bg-background-secondary/95 p-3 shadow-2xl backdrop-blur">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground-tertiary">
                                <span>Review Flow</span>
                                {pendingFields.length > 0 && (
                                    <span>{pendingFields.length} pending</span>
                                )}
                                {selectedFields.size > 0 && (
                                    <span>{selectedFields.size} selected</span>
                                )}
                            </div>
                            <div className="mt-1 flex min-h-6 flex-wrap items-center gap-2 text-sm text-foreground-400">
                                {nextItem ? (
                                    <>
                                        <span className="text-foreground-tertiary">Up next:</span>
                                        <span className="truncate font-medium text-foreground-primary">
                                            {nextItem.eventTitle}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-foreground-tertiary">
                                        Finish this review to return to your preserved queue position.
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => goBackToQueueContext()} disabled={actionLoading}>
                                Back
                            </Button>
                            {pendingFields.length > 0 && (
                                <Button
                                    onClick={handleApproveAll}
                                    disabled={actionLoading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Approve All ({pendingFields.length})
                                </Button>
                            )}
                            {pendingFields.length > 0 && (
                                <Button
                                    onClick={handleApproveSelective}
                                    disabled={actionLoading || selectedFields.size === 0}
                                    variant="outline"
                                >
                                    Approve Selected ({selectedFields.size})
                                </Button>
                            )}
                            {pendingFields.length > 0 && (
                                <Button
                                    onClick={handleRejectAll}
                                    disabled={actionLoading}
                                    variant="destructive"
                                >
                                    Reject All
                                </Button>
                            )}
                            <Button
                                onClick={confirmDeleteEvent}
                                disabled={actionLoading || !queue.event_id}
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Delete Event
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShortcutsOpen(true)}
                                className="text-foreground-tertiary"
                            >
                                <MaterialIcon name="info" size={14} />
                                Shortcuts
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shortcuts Overlay */}
            {shortcutsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-default bg-background-secondary p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground-primary">Keyboard Shortcuts</h2>
                                <p className="text-sm text-foreground-400">Navigate and review fields without using your mouse.</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShortcutsOpen(false)}
                                className="text-foreground-tertiary hover:bg-background-tertiary"
                            >
                                <MaterialIcon name="close" size={16} />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {[
                                { keys: 'j / ↓', description: 'Move to next field' },
                                { keys: 'k / ↑', description: 'Move to previous field' },
                                { keys: 'a', description: 'Approve focused field' },
                                { keys: 'r', description: 'Reject focused field' },
                                { keys: 'Space', description: 'Toggle field selection' },
                                { keys: 'e', description: 'Edit focused field' },
                                { keys: 'Shift+A', description: 'Approve all fields' },
                                { keys: 'Shift+R', description: 'Reject all fields' },
                                { keys: 'Shift+D', description: 'Open delete event confirmation' },
                                { keys: 'B', description: 'Back to preserved queue position' },
                                { keys: 'Esc', description: 'Close this dialog' },
                            ].map((shortcut) => (
                                <div
                                    key={shortcut.keys}
                                    className="flex items-center justify-between gap-3 rounded-md border border-default800 bg-background-950/60 px-3 py-2"
                                >
                                    <span className="font-mono text-xs uppercase tracking-wide text-foreground-200">
                                        {shortcut.keys}
                                    </span>
                                    <span className="text-sm text-foreground-400">{shortcut.description}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-center text-xs text-foreground-500">Press Esc to close.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
