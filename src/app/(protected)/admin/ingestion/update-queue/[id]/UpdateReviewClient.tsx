/**
 * Update Review Client Component
 * 
 * Shows field-by-field diffs with approve/reject actions
 * Supports vim-style keyboard navigation: j/k to move, a to approve, r to reject
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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
        start_time: string;
        organizer?: {
            id: string;
            name: string;
        };
    };
}

interface UpdateReviewClientProps {
    queueId: string;
    initialData: {
        queue: QueueItem;
        fields: QueueField[];
    } | null;
}

interface NextPendingItem {
    id: string;
    eventTitle: string;
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

export default function UpdateReviewClient({ queueId, initialData }: UpdateReviewClientProps) {
    const router = useRouter();
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
    const [showNextPrompt, setShowNextPrompt] = useState(false);

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

    // Fetch next pending item for "up next" navigation
    const fetchNextPending = useCallback(async (): Promise<NextPendingItem | null> => {
        try {
            const response = await fetch('/api/admin/ingestion/update-queue?status=pending&pageSize=1&sort=created_at&direction=asc', {
                credentials: 'include',
            });
            if (!response.ok) return null;
            const data = await response.json();
            const items = data.items || [];
            // Find next item that's not the current one
            const next = items.find((item: { id: string }) => item.id !== queueId);
            if (next) {
                return {
                    id: next.id,
                    eventTitle: next.event?.title || 'Untitled Event',
                };
            }
            return null;
        } catch {
            return null;
        }
    }, [queueId]);

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
            setMessage(buildApprovalMessage(data, 'All fields approved successfully.'));

            // Check for next pending item
            const next = await fetchNextPending();
            if (next) {
                setNextItem(next);
                setShowNextPrompt(true);
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
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
            setMessage({ type: 'success', text: 'All fields rejected' });

            // Check for next pending item
            const next = await fetchNextPending();
            if (next) {
                setNextItem(next);
                setShowNextPrompt(true);
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to reject' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!queue?.event_id) return;

        if (!confirm(`Are you sure you want to delete this event? This cannot be undone.\n\nEvent: ${queue.event?.title || 'Unknown'}`)) {
            return;
        }

        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=delete-event`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error('Failed to delete event');
            setMessage({ type: 'success', text: 'Event deleted successfully' });
            // Redirect to queue list after a short delay
            setTimeout(() => {
                const queueUrl = '/admin/ingestion/update-queue';
                router.push(queueUrl);
            }, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete event' });
        } finally {
            setActionLoading(false);
        }
    };

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
            setMessage(
                buildApprovalMessage(data, `${selectedFields.size} field(s) approved successfully.`)
            );
            setSelectedFields(new Set());

            if (data.status && data.status !== 'pending') {
                const next = await fetchNextPending();
                if (next) {
                    setNextItem(next);
                    setShowNextPrompt(true);
                } else {
                    await fetchQueueDetail();
                }
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
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
            setMessage(buildApprovalMessage(data, `Field "${fieldName}" approved.`));

            if (data.status && data.status !== 'pending') {
                const next = await fetchNextPending();
                if (next) {
                    setNextItem(next);
                    setShowNextPrompt(true);
                } else {
                    await fetchQueueDetail();
                }
            } else {
                await fetchQueueDetail();
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
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
            setMessage({ type: 'success', text: `Field "${fieldName}" rejected` });
            await fetchQueueDetail();
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to reject' });
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
                setFocusedFieldIndex((prev) => Math.min(prev + 1, fields.length - 1));
                return;
            }

            if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedFieldIndex((prev) => Math.max(prev - 1, 0));
                return;
            }

            // Actions on focused field
            if (focusedFieldIndex >= 0 && focusedFieldIndex < fields.length) {
                const focusedField = fields[focusedFieldIndex];

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
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [fields, focusedFieldIndex, shortcutsOpen, handleApproveAll, handleRejectAll]); // eslint-disable-line react-hooks/exhaustive-deps -- keyboard handler intentionally uses the latest render state snapshot

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
        const currentFieldCount = fields.length;
        const refsMap = fieldRefs.current;
        for (const index of refsMap.keys()) {
            if (index >= currentFieldCount) {
                refsMap.delete(index);
            }
        }
    }, [fields.length]);

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

    const pendingFields = fields.filter(f => f.field_status === 'pending');
    const approvedFields = fields.filter(f => f.field_status === 'approved');
    const rejectedFields = fields.filter(f => f.field_status === 'rejected');

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
        <div className="space-y-6">
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
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-semibold text-orange-800 mb-2">
                                    ⚠️ Past Event Warning
                                </div>
                                <p className="text-sm text-orange-700 mb-3">
                                    This event occurred <strong>{daysAgo} days ago</strong> ({format(new Date(queue.event!.start_time), 'MMM d, yyyy')}).
                                    Past events are typically not relevant for a calendar of upcoming events.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleRejectAll}
                                        disabled={actionLoading}
                                        variant="outline"
                                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                                    >
                                        Reject Update
                                    </Button>
                                    <Button
                                        onClick={handleDeleteEvent}
                                        disabled={actionLoading}
                                        variant="destructive"
                                        className="bg-orange-600 hover:bg-orange-700"
                                    >
                                        Delete Event
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Queue Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-xl mb-2">
                                {queue.event?.title || 'Untitled Event'}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                {queue.event?.organizer && (
                                    <span>Organizer: {queue.event.organizer.name}</span>
                                )}
                                {queue.event?.start_time && (
                                    <span>
                                        {format(new Date(queue.event.start_time), 'MMM d, yyyy')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusBadge(queue.status)}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {queue.requires_review_reason && (
                        <div className="mb-4 text-sm text-gray-600">
                            <strong>Reason:</strong> {queue.requires_review_reason}
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-4 text-sm">
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
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {pendingFields.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                onClick={handleApproveAll}
                                disabled={actionLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Approve All ({pendingFields.length})
                            </Button>
                            <Button
                                onClick={handleApproveSelective}
                                disabled={actionLoading || selectedFields.size === 0}
                                variant="outline"
                            >
                                Approve Selected ({selectedFields.size})
                            </Button>
                            <Button
                                onClick={handleRejectAll}
                                disabled={actionLoading}
                                variant="destructive"
                            >
                                Reject All
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Event Option */}
            {queue && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                            If this event should not exist (for example, it is a blog post rather than an event), you can delete it entirely.
                        </p>
                        <Button
                            onClick={handleDeleteEvent}
                            disabled={actionLoading}
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete Event
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Field Diffs */}
            <Card>
                <CardHeader>
                    <CardTitle>Field Changes</CardTitle>
                </CardHeader>
                <CardContent>
                    {fields.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No field changes found</div>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => {
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
                                                <h3 className="font-mono font-semibold">{field.field_name}</h3>
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

            {/* Keyboard Hint */}
            <div className="fixed bottom-4 right-4 z-40">
                <button
                    onClick={() => setShortcutsOpen(true)}
                    className="flex items-center gap-2 rounded-lg border border-default bg-background-secondary/90 px-3 py-2 text-xs text-foreground-tertiary shadow-lg hover:bg-background-tertiary transition-colors"
                >
                    <MaterialIcon name="info" size={14} />
                    Press <kbd className="rounded bg-background-tertiary px-1.5 py-0.5 font-mono">?</kbd> for shortcuts
                </button>
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

            {/* Up Next Prompt */}
            {showNextPrompt && nextItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-default bg-background-secondary p-6 shadow-2xl">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                                <MaterialIcon name="check" size={24} className="text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-foreground-primary">Review Complete!</h2>
                            <p className="mt-2 text-sm text-foreground-400">
                                Would you like to review the next pending item?
                            </p>
                            <p className="mt-1 text-sm font-medium text-foreground-200 truncate">
                                {nextItem.eventTitle}
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-default text-foreground-tertiary hover:bg-background-tertiary"
                                onClick={() => {
                                    setShowNextPrompt(false);
                                    router.push('/admin/ingestion/update-queue');
                                }}
                            >
                                Back to Queue
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                    setShowNextPrompt(false);
                                    router.push(`/admin/ingestion/update-queue/${nextItem.id}`);
                                }}
                            >
                                Review Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
