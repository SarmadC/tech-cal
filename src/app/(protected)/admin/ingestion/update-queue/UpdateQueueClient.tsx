/**
 * Update Queue Client Component
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

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
    fieldCounts: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

export default function UpdateQueueClient() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
    });

    const fetchQueueItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/admin/ingestion/update-queue?status=${statusFilter}&page=${page}&pageSize=20`
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = errorData.error || `HTTP ${response.status}: Failed to fetch queue items`;
                
                // Check if it's a table not found error
                if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
                    setError('Database tables not found. Please run migrations: 20250101000010, 20250101000011, 20250101000012');
                } else {
                    setError(errorMessage);
                }
                throw new Error(errorMessage);
            }
            const data = await response.json();
            setItems(data.items || []);
            setPagination(data.pagination || {
                page,
                pageSize: 20,
                total: 0,
                totalPages: 0,
            });
        } catch (error) {
            console.error('Error fetching queue items:', error);
            // Error state is already set above
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => {
        fetchQueueItems();
    }, [fetchQueueItems]);

    const getStatusBadge = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            auto_applied: 'bg-blue-100 text-blue-800',
            partially_approved: 'bg-orange-100 text-orange-800',
        };
        return (
            <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    if (loading && items.length === 0) {
        return <div className="text-center py-8">Loading queue items...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Error Message */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="text-red-800">
                            <strong>Error:</strong> {error}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        {['pending', 'approved', 'rejected', 'all'].map((status) => (
                            <Button
                                key={status}
                                variant={statusFilter === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setStatusFilter(status);
                                    setPage(1);
                                }}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Queue Items */}
            {!loading && !error && items.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                        No queue items found for status: {statusFilter}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg mb-2">
                                            {item.event?.title || 'Untitled Event'}
                                        </CardTitle>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            {item.event?.organizer && (
                                                <span>Organizer: {item.event.organizer.name}</span>
                                            )}
                                            {item.event?.start_time && (
                                                <span>
                                                    {format(new Date(item.event.start_time), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(item.status)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                                    <div>
                                        <div className="text-gray-500">Total Fields</div>
                                        <div className="font-semibold">{item.fieldCounts.total}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Pending</div>
                                        <div className="font-semibold text-yellow-600">
                                            {item.fieldCounts.pending}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Approved</div>
                                        <div className="font-semibold text-green-600">
                                            {item.fieldCounts.approved}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500">Rejected</div>
                                        <div className="font-semibold text-red-600">
                                            {item.fieldCounts.rejected}
                                        </div>
                                    </div>
                                </div>
                                {item.requires_review_reason && (
                                    <div className="mb-4 text-sm text-gray-600">
                                        <strong>Reason:</strong> {item.requires_review_reason}
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-500">
                                        Created: {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                                    </div>
                                    <Link href={`/admin/ingestion/update-queue/${item.id}`}>
                                        <Button size="sm">Review Details</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

