/**
 * Update Review Client Component
 * 
 * Shows field-by-field diffs with approve/reject actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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

export default function UpdateReviewClient({ queueId, initialData }: UpdateReviewClientProps) {
    const [queue, setQueue] = useState<QueueItem | null>(initialData?.queue || null);
    const [fields, setFields] = useState<QueueField[]>(initialData?.fields || []);
    const [loading, setLoading] = useState(!initialData);
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchQueueDetail = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/ingestion/update-queue/${queueId}`);
            if (!response.ok) throw new Error('Failed to fetch queue item');
            const data = await response.json();
            setQueue(data.queue);
            setFields(data.fields || []);
        } catch (error) {
            console.error('Error fetching queue detail:', error);
            setMessage({ type: 'error', text: 'Failed to load queue item details' });
        } finally {
            setLoading(false);
        }
    }, [queueId]);

    useEffect(() => {
        if (!initialData) {
            fetchQueueDetail();
        }
    }, [initialData, fetchQueueDetail]);

    const handleApproveAll = async () => {
        setActionLoading(true);
        setMessage(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue/${queueId}?action=approve`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error('Failed to approve');
            setMessage({ type: 'success', text: 'All fields approved successfully' });
            await fetchQueueDetail();
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
            if (!response.ok) throw new Error('Failed to reject');
            setMessage({ type: 'success', text: 'All fields rejected' });
            await fetchQueueDetail();
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
                window.location.href = '/admin/ingestion/update-queue';
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
            if (!response.ok) throw new Error('Failed to approve selected fields');
            setMessage({ type: 'success', text: `${selectedFields.size} field(s) approved successfully` });
            setSelectedFields(new Set());
            await fetchQueueDetail();
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to approve' });
        } finally {
            setActionLoading(false);
        }
    };

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
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return value.length > 0 ? value.join(', ') : '(empty array)';
            }
            return JSON.stringify(value, null, 2);
        }
        return String(value);
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
                    className={`p-4 rounded-lg ${
                        message.type === 'success'
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
                            {fields.map((field) => {
                                const isPending = field.field_status === 'pending';
                                const isSelected = selectedFields.has(field.field_name);

                                return (
                                    <div
                                        key={field.id}
                                        className={`border rounded-lg p-4 ${
                                            isPending
                                                ? 'border-yellow-200 bg-yellow-50'
                                                : field.field_status === 'approved'
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-red-200 bg-red-50'
                                        }`}
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
                                                <div className="font-medium text-gray-700 mb-2">Old Value</div>
                                                <div className="bg-white p-3 rounded border font-mono text-xs whitespace-pre-wrap break-words">
                                                    {formatValue(field.old_value)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-700 mb-2">New Value</div>
                                                <div className="bg-white p-3 rounded border font-mono text-xs whitespace-pre-wrap break-words">
                                                    {formatValue(field.new_value)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

