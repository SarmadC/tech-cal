// src/app/events/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, MapPin, Users, Tag, ArrowLeft } from 'lucide-react';

// 1. UPDATE IMPORTS:
// Use the new `Event` type and import your date formatting utilities.
import type { Event } from '@/types';
import { formatDate, formatTime } from '@/utils/dateUtils';

import EventTracking from '@/components/calendar/EventTracking';
import EventActions from '@/components/calendar/EventActions';

type EventDetailPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
    const supabase = await createClient();

    const { id: eventId } = await params;

    // 2. UPDATE TYPE ANNOTATION:
    // The `event` variable is now correctly typed as `Event`.
    let event: Event;
    try {
        // This works because EventService.getEventById now returns an `Event`.
        event = await EventService.getEventById(eventId, supabase);
    } catch (error) {
        console.error('Failed to fetch event:', eventId, error);
        notFound();
    }

    // 3. UPDATE DATE FORMATTING:
    // Replace the .toLocaleString() calls with your new, consistent utilities.
    const datePart = formatDate(event.startTime, event.timezone); // e.g., "Sep 17, 2025"
    const timePart = formatTime(event.startTime, event.timezone); // e.g., "5:30 PM (PDT)"
    const formattedStartTime = `${datePart} at ${timePart}`;

    const formattedEndTime = event.endTime ? formatTime(event.endTime, event.timezone) : null;

    return (
        <div className="min-h-screen bg-background-main pt-20">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <Link href="/calendar" className="inline-flex items-center space-x-2 text-sm text-foreground-secondary hover:text-foreground-primary mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Calendar</span>
                </Link>

                <div className="bg-background-secondary rounded-2xl border border-border-color overflow-hidden">
                    <div className="h-48 bg-gradient-to-br from-accent-primary/20 to-purple-600/20" />

                    <div className="p-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground-primary mb-4">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap gap-x-6 gap-y-4 text-foreground-secondary mb-8">
                            <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-accent-primary" />
                                <span>{formattedStartTime} {formattedEndTime && `- ${formattedEndTime}`}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4 text-accent-primary" />
                                <span>{event.location}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-accent-primary" />
                                <span>{event.organizer}</span>
                            </div>
                        </div>

                        {event.category && (
                            <div className="flex items-center space-x-2 mb-8">
                                <div className="px-3 py-1 text-xs rounded-full flex items-center space-x-2" style={{ backgroundColor: `${event.category.color}33`, color: event.category.color }}>
                                    <Tag className="w-3 h-3" />
                                    <span>{event.category.name}</span>
                                </div>
                            </div>
                        )}

                        <div className="prose prose-invert max-w-none text-foreground-secondary mb-8">
                            <p>{event.description}</p>
                        </div>

                        <div className="border-t border-border-color my-8" />

                        <div className="space-y-4">
                            {/* These components now correctly receive the `Event` type because you migrated them earlier */}
                            <EventTracking event={event} />
                            <EventActions event={event} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}