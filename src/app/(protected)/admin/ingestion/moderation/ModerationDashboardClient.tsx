/**
 * Moderation Dashboard Client Component
 * 
 * Interactive UI for reviewing and moderating events.
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import * as Sentry from '@sentry/nextjs';

interface QueueItem {
    id: string;
    source_event_id: string;
    event_id: string | null;
    ingestion_quality_score: number;
    reason_codes: string[];
    recommended_tags: string[] | null;
    status: string;
    created_at: string;
    source_events: {
        raw_payload: {
            record: {
                title: string;
                description?: string;
                startTime: string;
                location: string;
                organizer?: string;
            };
        };
    } | null;
    events: {
        id: string;
        title: string;
        description: string;
        start_time: string;
        location: string;
        organizer: { name: string } | null;
        ingestion_quality_score: number | null;
        ingestion_provenance: {
            quality_components: {
                source_trust: number;
                metadata_completeness: number;
                speaker_verification: number;
                historical_performance: number;
            };
        } | null;
    } | null;
}

interface ModerationDashboardClientProps {
    initialQueueItems: QueueItem[];
    error?: string;
}

export default function ModerationDashboardClient({
    initialQueueItems,
    error,
}: ModerationDashboardClientProps) {
    const [queueItems, setQueueItems] = useState<QueueItem[]>(initialQueueItems);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<Record<string, string>>({});

    const handleSelectAll = useCallback(() => {
        if (selectedItems.size === queueItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(queueItems.map(item => item.id)));
        }
    }, [queueItems, selectedItems]);

    const handleSelectItem = useCallback((itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    }, [selectedItems]);

    const handleBulkAction = useCallback(async (action: 'approve' | 'reject') => {
        if (selectedItems.size === 0) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/ingestion/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    queueItemIds: Array.from(selectedItems),
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Remove processed items from queue
                setQueueItems(prev => prev.filter(item => !selectedItems.has(item.id)));
                setSelectedItems(new Set());
            } else {
                console.error('Moderation action failed:', result);
                alert('Failed to process moderation action');
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
            Sentry.captureException(error);
            alert('Error performing action');
        } finally {
            setLoading(false);
        }
    }, [selectedItems]);

    const handleSingleAction = useCallback(async (
        itemId: string,
        action: 'approve' | 'reject',
        eventId?: string
    ) => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/ingestion/moderate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    queueItemIds: [itemId],
                    eventId,
                    feedback: feedback[itemId] || null,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setQueueItems(prev => prev.filter(item => item.id !== itemId));
                setFeedback(prev => {
                    const newFeedback = { ...prev };
                    delete newFeedback[itemId];
                    return newFeedback;
                });
            } else {
                alert('Failed to process action');
            }
        } catch (error) {
            console.error('Error performing action:', error);
            Sentry.captureException(error);
            alert('Error performing action');
        } finally {
            setLoading(false);
        }
    }, [feedback]);

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-red-600">Error loading moderation queue: {error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Event Moderation</h1>
                    <p className="text-muted-foreground mt-2">
                        Review and moderate ingested events ({queueItems.length} pending)
                    </p>
                </div>
                {selectedItems.size > 0 && (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleBulkAction('approve')}
                            disabled={loading}
                            variant="default"
                        >
                            Approve Selected ({selectedItems.size})
                        </Button>
                        <Button
                            onClick={() => handleBulkAction('reject')}
                            disabled={loading}
                            variant="destructive"
                        >
                            Reject Selected ({selectedItems.size})
                        </Button>
                    </div>
                )}
            </div>

            {queueItems.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No events pending moderation
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Bulk selection header */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === queueItems.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm font-medium">
                                    Select all ({queueItems.length} items)
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Queue items */}
                    {queueItems.map((item) => {
                        const event = item.events;
                        const sourceRecord = item.source_events?.raw_payload?.record;
                        const qualityComponents = event?.ingestion_provenance?.quality_components;

                        return (
                            <Card key={item.id} className="border-l-4 border-l-yellow-500">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => handleSelectItem(item.id)}
                                                className="mt-1 w-4 h-4 rounded border-gray-300"
                                            />
                                            <div className="flex-1">
                                                <CardTitle className="text-xl">
                                                    {event?.title || sourceRecord?.title || 'Untitled Event'}
                                                </CardTitle>
                                                <CardDescription className="mt-2">
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <Badge
                                                            variant={
                                                                item.ingestion_quality_score >= 75
                                                                    ? 'default'
                                                                    : item.ingestion_quality_score >= 50
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                            }
                                                        >
                                                            Quality: {item.ingestion_quality_score.toFixed(0)}
                                                        </Badge>
                                                        {item.reason_codes.map(code => (
                                                            <Badge key={code} variant="outline">
                                                                {code.replace(/_/g, ' ')}
                                                            </Badge>
                                                        ))}
                                                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                                                    </div>
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSingleAction(item.id, 'approve', item.event_id || undefined)}
                                                disabled={loading}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleSingleAction(item.id, 'reject', item.event_id || undefined)}
                                                disabled={loading}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Quality Score Breakdown */}
                                    {qualityComponents && (
                                        <div className="grid grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <div className="text-muted-foreground">Source Trust</div>
                                                <div className="font-medium">{(qualityComponents.source_trust ?? 0).toFixed(0)}%</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Metadata</div>
                                                <div className="font-medium">{(qualityComponents.metadata_completeness ?? 0).toFixed(0)}%</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Speakers</div>
                                                <div className="font-medium">{(qualityComponents.speaker_verification ?? 0).toFixed(0)}%</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">History</div>
                                                <div className="font-medium">{(qualityComponents.historical_performance ?? 0).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Event Details */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">Start Time</div>
                                            <div className="font-medium">
                                                {event?.start_time
                                                    ? format(new Date(event.start_time), 'PPP p')
                                                    : sourceRecord?.startTime
                                                    ? format(new Date(sourceRecord.startTime), 'PPP p')
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Location</div>
                                            <div className="font-medium">{event?.location || sourceRecord?.location || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Organizer</div>
                                            <div className="font-medium">
                                                {event?.organizer?.name || sourceRecord?.organizer || 'Unknown'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Event ID</div>
                                            <div className="font-mono text-xs">{event?.id || 'Not created yet'}</div>
                                        </div>
                                    </div>

                                    {/* Description Diff View (if event exists) */}
                                    {event && sourceRecord && (
                                        <div className="border-t pt-4">
                                            <div className="text-sm font-medium mb-2">Description Preview</div>
                                            <div className="text-sm text-muted-foreground line-clamp-3">
                                                {event.description || sourceRecord.description || 'No description'}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommended Tags */}
                                    {item.recommended_tags && item.recommended_tags.length > 0 && (
                                        <div className="border-t pt-4">
                                            <div className="text-sm font-medium mb-2">Recommended Tags</div>
                                            <div className="flex flex-wrap gap-2">
                                                {item.recommended_tags.map(tag => (
                                                    <Badge key={tag} variant="outline">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Feedback Input */}
                                    <div className="border-t pt-4">
                                        <textarea
                                            className="w-full p-2 border rounded text-sm"
                                            placeholder="Add feedback (optional)..."
                                            value={feedback[item.id] || ''}
                                            onChange={(e) =>
                                                setFeedback(prev => ({ ...prev, [item.id]: e.target.value }))
                                            }
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

