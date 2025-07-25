// src/app/dashboard/page.tsx (Corrected)

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking, TrackedEvent } from '@/hooks/useEventTracking'; // 👈 1. Import TrackedEvent
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 👇 2. Define a type for your upcoming events
type UpcomingEvent = {
    id: string;
    title: string;
    start_time: string;
    organizer: string;
};

export default function DashboardPage() {
    const { user } = useAuth();
    const { getTrackedEvents } = useEventTracking();

    // 👇 3. Use the specific types with useState
    const [trackedEvents, setTrackedEvents] = useState<TrackedEvent[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getUpcomingEvents() {
            const { data, error } = await supabase
                .from('events')
                .select('id, title, start_time, organizer')
                .order('start_time', { ascending: true })
                .limit(5);

            if (error) {
                console.error('Error fetching upcoming events:', error);
                return [];
            }
            return data;
        }

        async function loadDashboardData() {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const [tracked, upcoming] = await Promise.all([
                getTrackedEvents(),
                getUpcomingEvents(),
            ]);
            setTrackedEvents(tracked);
            setUpcomingEvents(upcoming);
            setLoading(false);
        }

        loadDashboardData();
    }, [user, getTrackedEvents]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-8 p-4 md:p-8">
                <Skeleton className="h-32 w-full" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Tracked Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{trackedEvents.length}</div>
                            <p className="text-xs text-muted-foreground">
                                You are currently tracking events.
                            </p>
                        </CardContent>
                    </Card>
                </div>
                <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                    <Card className="xl:col-span-2">
                        <CardHeader className="flex flex-row items-center">
                            <div className="grid gap-2">
                                <CardTitle>Upcoming Tracked Events</CardTitle>
                                <CardDescription>
                                    Events you have bookmarked or marked as attending.
                                </CardDescription>
                            </div>
                            <Button asChild size="sm" className="ml-auto gap-1">
                                <Link href="/calendar">
                                    View All
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trackedEvents.slice(0, 5).map((event) => ( // ✅ No 'any' error here
                                        <TableRow key={event.id}>
                                            <TableCell>
                                                <div className="font-medium">{event.events?.title}</div>
                                                <div className="hidden text-sm text-muted-foreground md:inline">
                                                    {event.events?.organizer}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatDate(event.events?.start_time || '')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Discover More Events</CardTitle>
                            <CardDescription>
                                Here are some upcoming events in the community.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-8">
                            {upcomingEvents.map((event) => ( // ✅ No 'any' error here
                                <div key={event.id} className="flex items-center gap-4">
                                    <div className="grid gap-1">
                                        <p className="text-sm font-medium leading-none">
                                            {event.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {event.organizer}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        <Badge variant="outline">
                                            {formatDate(event.start_time)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}