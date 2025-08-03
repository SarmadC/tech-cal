// src/app/events/[id]/page.tsx

import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {Clock, MapPin, Users, Tag, ArrowLeft } from 'lucide-react';

// Import our interactive client component
import EventTracking from '@/components/calendar/EventTracking';
import EventActions from '@/components/calendar/EventActions';

// This is an async Server Component
export default async function EventDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const eventId = params.id;

    // Fetch the specific event data on the server
    const { data: event, error } = await EventService.getEventById(eventId, supabase);

    // If the event is not found or there's an error, show a 404 page
    if (error || !event) {
        notFound();
    }

    // Format dates for display
    const formattedStartTime = new Date(event.startTime).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
    });

    const formattedEndTime = event.endTime ? new Date(event.endTime).toLocaleString('en-US', {
        timeStyle: 'short',
    }) : null;

    return (
        <div className="min-h-screen bg-background-main pt-20">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Back to Calendar Link */}
                <Link href="/calendar" className="inline-flex items-center space-x-2 text-sm text-foreground-secondary hover:text-foreground-primary mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Calendar</span>
                </Link>

                <div className="bg-background-secondary rounded-2xl border border-border-color overflow-hidden">
                    {/* Optional Header Image */}
                    <div className="h-48 bg-gradient-to-br from-accent-primary/20 to-purple-600/20" />

                    <div className="p-8">
                        {/* Event Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground-primary mb-4">
                            {event.title}
                        </h1>

                        {/* Event Meta Info */}
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

                        {/* Category Tag */}
                        {event.category && (
                            <div className="flex items-center space-x-2 mb-8">
                                <div className="px-3 py-1 text-xs rounded-full flex items-center space-x-2" style={{ backgroundColor: `${event.category.color}33`, color: event.category.color }}>
                                    <Tag className="w-3 h-3" />
                                    <span>{event.category.name}</span>
                                </div>
                            </div>
                        )}

                        {/* Event Description */}
                        <div className="prose prose-invert max-w-none text-foreground-secondary mb-8">
                            <p>{event.description}</p>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border-color my-8" />

                        {/* Interactive Client Components */}
                        <div className="space-y-4">
                            {/* This component handles all the client-side logic for tracking */}
                            <EventTracking event={event} />

                            {/* This component handles adding to Google Cal, ICS download, etc. */}
                            <EventActions event={event} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}