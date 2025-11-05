/**
 * Enrichment Dashboard Client Component
 * 
 * Interactive UI for browsing events that need enrichment.
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface EnrichmentEvent {
    id: string;
    title: string;
    start_time: string;
    source_url: string;
    organizer: { id: string; name: string; logo_url: string | null } | null;
    has_agenda: boolean;
    has_speakers: boolean;
    ingestion_source_id: string | null;
}

interface EnrichmentDashboardClientProps {
    initialEvents: EnrichmentEvent[];
}

export default function EnrichmentDashboardClient({
    initialEvents,
}: EnrichmentDashboardClientProps) {
    const router = useRouter();
    const events = initialEvents;
    const [filter, setFilter] = useState<'all' | 'needs_agenda' | 'needs_speakers' | 'needs_both'>('all');

    const filteredEvents = events.filter(event => {
        if (filter === 'all') return true;
        if (filter === 'needs_agenda') return !event.has_agenda;
        if (filter === 'needs_speakers') return !event.has_speakers;
        if (filter === 'needs_both') return !event.has_agenda && !event.has_speakers;
        return true;
    });

    const handleEnrich = useCallback((eventId: string) => {
        router.push(`/admin/ingestion/enrichment/${eventId}`);
    }, [router]);

    const handleOpenSourceUrl = useCallback((url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    const getEnrichmentStatus = (event: EnrichmentEvent) => {
        if (event.has_agenda && event.has_speakers) {
            return { label: 'Complete', variant: 'default' as const };
        }
        if (event.has_agenda) {
            return { label: 'Needs Speakers', variant: 'secondary' as const };
        }
        if (event.has_speakers) {
            return { label: 'Needs Agenda', variant: 'secondary' as const };
        }
        return { label: 'Needs Both', variant: 'destructive' as const };
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All Events ({events.length})
                </Button>
                <Button
                    variant={filter === 'needs_both' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('needs_both')}
                >
                    Needs Both ({events.filter(e => !e.has_agenda && !e.has_speakers).length})
                </Button>
                <Button
                    variant={filter === 'needs_agenda' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('needs_agenda')}
                >
                    Needs Agenda ({events.filter(e => !e.has_agenda).length})
                </Button>
                <Button
                    variant={filter === 'needs_speakers' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('needs_speakers')}
                >
                    Needs Speakers ({events.filter(e => !e.has_speakers).length})
                </Button>
            </div>

            {/* Events List */}
            {filteredEvents.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                            No events found matching your filter.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredEvents.map((event) => {
                        const status = getEnrichmentStatus(event);
                        return (
                            <Card key={event.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg mb-2">
                                                {event.title}
                                            </CardTitle>
                                            <CardDescription>
                                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                    <span>
                                                        {format(new Date(event.start_time), 'PPp')}
                                                    </span>
                                                    {event.organizer && (
                                                        <span className="text-sm">
                                                            Organizer: {event.organizer.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </CardDescription>
                                        </div>
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            onClick={() => handleEnrich(event.id)}
                                            size="sm"
                                        >
                                            Enrich Now
                                        </Button>
                                        {event.source_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenSourceUrl(event.source_url)}
                                            >
                                                Open Event Page
                                            </Button>
                                        )}
                                    </div>
                                    <div className="mt-4 flex gap-2 flex-wrap">
                                        {event.has_agenda && (
                                            <Badge variant="outline" className="text-xs">
                                                Has Agenda
                                            </Badge>
                                        )}
                                        {event.has_speakers && (
                                            <Badge variant="outline" className="text-xs">
                                                Has Speakers
                                            </Badge>
                                        )}
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

