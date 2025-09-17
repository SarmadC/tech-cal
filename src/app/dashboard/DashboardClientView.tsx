'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/Loading';
import { CalendarIcon, ClockIcon, StarIcon, TargetIcon, UsersIcon, MedalIcon, SparkleIcon, PlusIcon } from '@phosphor-icons/react';
// 1. UPDATE IMPORTS: Use the new, canonical type names.
import type { TrackedEventRecord, EventType, Event } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import CareerProfilePrompt from '@/components/calendar/mobile/discovery/CareerProfilePrompt';
import { CareerProfileService } from '@/services/careerProfileService';
import { useLightweightTrackedEvents } from '@/hooks/useTrackedEventsUnified';
import { formatDateTime } from '@/utils/dateUtils';

// 2. UPDATE PROPS: The interface now uses the new types.
interface DashboardClientViewProps {
    initialTrackedEvents: TrackedEventRecord[];
    initialEventTypes: EventType[];
    initialUpcomingEvents: Event[];
}

type PersonalInsight = {
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
};

const SectionFallback = () => (
    <div className="flex h-full min-h-[150px] items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 text-sm text-red-600">
        There was an error loading this section.
    </div>
);

export default function DashboardClientView({
    initialTrackedEvents: _initialTrackedEvents,
    initialEventTypes,
    initialUpcomingEvents
}: DashboardClientViewProps) {
    const [supabase] = useState(() => createClient());
    const { user: _user, profile } = useAuth();

    const {
        data: trackedEvents,
        isLoading: _isTrackedLoading,
        error: trackedError,
        refetch: refetchTracked,
    } = useLightweightTrackedEvents();

    const isTrackedError = !!trackedError;

    const {
        data: eventTypes,
        isError: isTypesError,
        error: typesError,
        refetch: refetchTypes,
    } = useQuery<EventType[]>({
        queryKey: ['eventTypes'],
        queryFn: () => EventTypeService.getEventTypes(supabase),
        initialData: initialEventTypes,
    });

    const {
        data: allUpcomingEvents,
        isError: isUpcomingError,
        error: upcomingError,
        refetch: refetchUpcoming,
    } = useQuery<Event[]>({
        queryKey: ['allUpcomingEvents'],
        queryFn: () => EventService.getEvents({ startDate: new Date() }, supabase, 1, 100),
        initialData: initialUpcomingEvents,
    });

    const isError = isTrackedError || isTypesError || isUpcomingError;
    const errorMessage = [
        (trackedError as Error)?.message,
        (typesError as Error)?.message,
        (upcomingError as Error)?.message
    ].filter(Boolean).join('; ');

    const handleRetry = () => {
        if (isTrackedError) refetchTracked();
        if (isTypesError) refetchTypes();
        if (isUpcomingError) refetchUpcoming();
    };

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const name = profile?.fullName?.split(' ')[0] || 'there';
        if (hour < 12) return `Good morning, ${name}!`;
        if (hour < 17) return `Good afternoon, ${name}!`;
        return `Good evening, ${name}!`;
    }, [profile]);

    const insights = useMemo((): PersonalInsight[] => {
        if (!trackedEvents || !eventTypes) return [];
        // 4. UPDATE TYPE ANNOTATIONS inside the memoized calculation.
        const upcomingTracked = trackedEvents.filter((te: TrackedEventRecord) => te.event && new Date(te.event.startTime) > new Date()).length;
        const attendedThisMonth = trackedEvents.filter((te: TrackedEventRecord) => te.status === 'attended' && new Date(te.trackedAt).getMonth() === new Date().getMonth()).length;
        const categoryCount = trackedEvents.reduce((acc: Record<string, number>, te: TrackedEventRecord) => {
            if (te.event?.eventTypeId) acc[te.event.eventTypeId] = (acc[te.event.eventTypeId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topCategoryId = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a])[0];
        const topCategory = eventTypes.find((et: EventType) => et.id === topCategoryId);
        return [
            { title: 'Upcoming Events', value: upcomingTracked, description: "You're tracking", icon: <CalendarIcon className="w-5 h-5" /> },
            { title: 'Events Attended', value: attendedThisMonth, description: 'This month', icon: <MedalIcon className="w-5 h-5" /> },
            { title: 'Top Interest', value: topCategory?.name || 'N/A', description: 'Most tracked category', icon: <TargetIcon className="w-5 h-5" /> },
            { title: 'Total Tracked', value: trackedEvents.length, description: 'All time', icon: <StarIcon className="w-5 h-5" /> },
        ];
    }, [trackedEvents, eventTypes]);

    const nextTrackedEvents = useMemo(() => {
        return (trackedEvents || [])
            .filter((te: TrackedEventRecord) => te.event && new Date(te.event.startTime) > new Date())
            .sort((a: TrackedEventRecord, b: TrackedEventRecord) => new Date(a.event!.startTime).getTime() - new Date(b.event!.startTime).getTime())
            .slice(0, 5);
    }, [trackedEvents]);

    const recommendedEvents = useMemo(() => {
        const trackedEventIds = new Set((trackedEvents || []).map((te: TrackedEventRecord) => te.eventId));
        return (allUpcomingEvents || []).filter((event: Event) => !trackedEventIds.has(event.id)).slice(0, 6);
    }, [allUpcomingEvents, trackedEvents]);

    if (isError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 flex items-center justify-center">
                <ErrorState error={errorMessage} onRetry={handleRetry} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <ErrorBoundary fallback={<SectionFallback />}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">{greeting}</h1>
                            <p className="text-lg text-gray-600 flex items-center gap-2">
                                <SparkleIcon className="w-5 h-5 text-gray-500" />
                                Ready to discover what is happening in tech today?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <Button asChild><Link href="/calendar"><PlusIcon className="w-4 h-4 mr-2" />Track Events</Link></Button>
                        </div>
                    </div>
                </ErrorBoundary>

                {/* Career Profile Prompt */}
                {profile && !CareerProfileService.hasCompletedOnboarding(profile) && (
                    <ErrorBoundary fallback={<SectionFallback />}>
                        <CareerProfilePrompt profile={profile} />
                    </ErrorBoundary>
                )}

                <ErrorBoundary fallback={<SectionFallback />}>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {insights.map((insight, index) => (
                            <Card key={index} className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <div className="p-2 bg-gray-100 rounded-lg w-fit">{insight.icon}</div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-800">{insight.value}</div>
                                    <p className="text-sm text-gray-600">{insight.title}</p>
                                    <p className="text-xs text-gray-500">{insight.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ErrorBoundary>

                <ErrorBoundary fallback={<SectionFallback />}>
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Your Upcoming Events</CardTitle>
                            <CardDescription>Events you are tracking.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {nextTrackedEvents.length > 0 ? (
                                // 5. UPDATE MAPPING TYPE: Use `TrackedEventRecord` in the map callback.
                                nextTrackedEvents.map((trackedEvent: TrackedEventRecord) => (
                                    <div key={trackedEvent.trackingId} className="group p-4 rounded-lg border border-gray-100 hover:shadow-md transition-all">
                                        <h3 className="font-semibold text-gray-900">{trackedEvent.event?.title}</h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                            <span><ClockIcon className="w-4 h-4 inline mr-1" />{trackedEvent.event ? formatDateTime(trackedEvent.event.startTime, trackedEvent.event.timezone) : ''}</span>
                                            <span><UsersIcon className="w-4 h-4 inline mr-1" />{trackedEvent.event?.organizer}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="font-medium text-gray-900 mb-2">No upcoming events</h3>
                                    <p className="text-gray-600 mb-4">Start tracking events to see them here.</p>
                                    <Button asChild><Link href="/calendar">Browse Events</Link></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </ErrorBoundary>

                {recommendedEvents.length > 0 && (
                    <ErrorBoundary fallback={<SectionFallback />}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Recommended for You</CardTitle>
                                <CardDescription>Based on your interests.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {recommendedEvents.map((event: Event) => (
                                    <div key={event.id} className="group p-4 rounded-lg border border-gray-100 hover:shadow-md transition-all">
                                        <h3 className="font-medium text-gray-900 mb-2">{event.title}</h3>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </ErrorBoundary>
                )}
            </div>
        </div>
    );
}