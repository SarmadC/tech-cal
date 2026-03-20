// src/app/(protected)/events/[id]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ClockIcon, MapPinIcon, UsersIcon, TagIcon, ArrowLeftIcon } from '@phosphor-icons/react/ssr';
// Ensure client-only components are imported from client files; this page remains a Server Component

// 1. UPDATE IMPORTS:
// Use the new `Event` type and import your date formatting utilities.
import type { Event } from '@/types';
import { formatDate, formatTime } from '@/utils/dateUtils';
import { extractIdFromSlug } from '@/utils/slugUtils';

import EventTracking from '@/components/calendar/EventTracking';
import EventActions from '@/components/calendar/EventActions';

type EventDetailPageProps = {
    params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
    const supabase = await createClient();

    const { id: slugOrId } = await params;

    // Extract UUID from slug or use as-is if already a UUID
    // Supports: /events/react-summit-2024--550e8400-e29b-41d4-a716-446655440000
    // And: /events/550e8400-e29b-41d4-a716-446655440000 (backward compatibility)
    const eventId = extractIdFromSlug(slugOrId);

    let event: Event;
    try {
        event = await EventService.getEventById(eventId, supabase);
    } catch (error) {
        console.error('Failed to fetch event:', eventId, error);
        notFound();
    }

    const datePart = formatDate(event.startTime, event.timezone); // e.g., "Sep 17, 2025"
    const timePart = formatTime(event.startTime, event.timezone); // e.g., "5:30 PM (PDT)"
    const formattedStartTime = `${datePart} at ${timePart}`;

    const formattedEndTime = event.endTime ? formatTime(event.endTime, event.timezone) : null;

    return (
        <div className="responsive-page-shell min-h-[100dvh] bg-background-main mobile-top-nav-offset md:pt-20">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
                <Link href="/calendar" className="inline-flex items-center space-x-2 text-sm text-foreground-secondary hover:text-foreground-primary mb-8 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" />
                    <span>Back to Calendar</span>
                </Link>

                <div className="bg-background-secondary rounded-2xl border border-border-color overflow-hidden">
                    <div className="h-48 bg-gradient-to-br from-background-tertiary to-background-elevated" />

                    <div className="p-6 sm:p-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground-primary mb-4">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap gap-x-6 gap-y-4 text-foreground-secondary mb-8">
                            <div className="flex items-center space-x-2">
                                <ClockIcon className="w-4 h-4 text-accent-primary" />
                                <span>{formattedStartTime} {formattedEndTime && `- ${formattedEndTime}`}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <MapPinIcon className="w-4 h-4 text-accent-primary" />
                                <span>{event.location}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <UsersIcon className="w-4 h-4 text-accent-primary" />
                                <span>{event.organizer}</span>
                            </div>
                        </div>

                        {event.category && (
                            <div className="flex items-center space-x-2 mb-8">
                                <div className="px-3 py-1 text-xs rounded-full flex items-center space-x-2" style={{ backgroundColor: `${event.category.color}33`, color: event.category.color }}>
                                    <TagIcon className="w-3 h-3" />
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
