// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query'; // Import useQuery

// Import services directly to be used within useQuery.
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { UserEventService } from '@/services/userEventService';

// UI and Icon components (no changes here)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, Calendar, TrendingUp, Clock, Star, Target, Users, Zap, BookOpen, Award, MapPin, Bell, ChevronRight, Sparkles, Activity, Plus } from 'lucide-react';

// App types (no changes here)
import { AppEvent, AppEventType, AppTrackedEvent } from '@/types';

type PersonalInsight = {
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
};

export default function EnhancedDashboard() {
    const { user, profile } = useAuth();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        const name = profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
        if (hour < 12) setGreeting(`Good morning, ${name}!`);
        else if (hour < 17) setGreeting(`Good afternoon, ${name}!`);
        else setGreeting(`Good evening, ${name}!`);
    }, [profile, user]);

    // --- QUERIES for Data Fetching ---

    // Query 1: Get the user's tracked events.
    const { data: trackedEvents = [], isLoading: isLoadingTracked } = useQuery<AppTrackedEvent[]>({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            const response = await UserEventService.getTrackedEvents(user!.id);
            return response.data || [];
        },
        enabled: !!user, // Only run this query when the user is authenticated.
    });

    // Query 2: Get all event types. This is cached effectively.
    const { data: eventTypes = [], isLoading: isLoadingTypes } = useQuery<AppEventType[]>({
        queryKey: ['eventTypes'],
        queryFn: async () => {
            const response = await EventTypeService.getEventTypes();
            return response.data || [];
        },
    });

    // Query 3: Get upcoming events for the "Recommended" section.
    const { data: upcomingEvents = [], isLoading: isLoadingUpcoming } = useQuery<AppEvent[]>({
        queryKey: ['dashboardUpcomingEvents'],
        queryFn: async () => {
            const response = await EventService.getEvents({ startDate: new Date() });
            return (response.data || []).slice(0, 10);
        },
    });

    // A single, unified loading state derived from all queries.
    const isLoading = isLoadingTracked || isLoadingTypes || isLoadingUpcoming;

    // --- MEMOIZED COMPUTATIONS ---
    // These hooks now automatically react to data changes from useQuery. No logic changes needed.

    const insights = useMemo((): PersonalInsight[] => {
        if (!trackedEvents.length || !eventTypes.length) return [];
        // ... (logic is correct and remains unchanged)
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const upcomingTracked = trackedEvents.filter(te => te.event && new Date(te.event.startTime) > now).length;
        const attendedThisMonth = trackedEvents.filter(te => te.status === 'attended' && new Date(te.trackedAt) >= thisMonth).length;

        const categoryCount = trackedEvents.reduce((acc, te) => {
            if (te.event?.eventTypeId) {
                acc[te.event.eventTypeId] = (acc[te.event.eventTypeId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const topCategoryId = Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0];
        const topCategory = eventTypes.find(et => et.id === topCategoryId);
        const recentActivity = trackedEvents.filter(te => new Date(te.trackedAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length;

        return [
            { title: 'Upcoming Events', value: upcomingTracked, description: 'Events you\'re tracking', icon: <Calendar className="w-5 h-5" />, trend: upcomingTracked > 5 ? 'up' : upcomingTracked > 2 ? 'stable' : 'down', trendValue: `${upcomingTracked} this week` },
            { title: 'Events Attended', value: attendedThisMonth, description: 'This month', icon: <Award className="w-5 h-5" />, trend: attendedThisMonth > 2 ? 'up' : 'stable', trendValue: `+${attendedThisMonth} this month` },
            { title: 'Top Interest', value: topCategory?.name || 'None', description: `${categoryCount[topCategoryId] || 0} events tracked`, icon: <Target className="w-5 h-5" /> },
            { title: 'Weekly Activity', value: recentActivity, description: 'Events tracked this week', icon: <Activity className="w-5 h-5" />, trend: recentActivity > 3 ? 'up' : 'stable' }
        ];
    }, [trackedEvents, eventTypes]);

    const nextTrackedEvents = useMemo(() => {
        return trackedEvents
            .filter(te => te.event && new Date(te.event.startTime) > new Date())
            .sort((a, b) => new Date(a.event!.startTime).getTime() - new Date(b.event!.startTime).getTime())
            .slice(0, 5);
    }, [trackedEvents]);

    const recommendedEvents = useMemo(() => {
        const trackedEventIds = new Set(trackedEvents.map(te => te.eventId));
        return upcomingEvents.filter(event => !trackedEventIds.has(event.id)).slice(0, 6);
    }, [upcomingEvents, trackedEvents]);

    const quickStats = useMemo(() => {
        const totalTracked = trackedEvents.length;
        const totalAttended = trackedEvents.filter(te => te.status === 'attended').length;
        const totalActionable = trackedEvents.filter(te => te.status === 'attended' || te.status === 'bookmarked').length;
        return { 
            totalTracked, 
            totalAttended, 
            completionRate: totalActionable > 0 ? Math.round((totalAttended / totalActionable) * 100) : 0 
        };
    }, [trackedEvents]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const formatDateShort = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 7. Update the loading check to use the new unified `isLoading` state.
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-80" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Skeleton className="h-96 lg:col-span-2" />
                        <Skeleton className="h-96" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Welcome Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            {greeting}
                        </h1>
                        <p className="text-lg text-gray-600 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            Ready to discover what is happening in tech today?
                        </p>
                    </div>
                    <div className="flex gap-3 mt-4 md:mt-0">
                        <Button asChild variant="outline">
                            <Link href="/calendar"><Calendar className="w-4 h-4 mr-2" />View Calendar</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/calendar"><Plus className="w-4 h-4 mr-2" />Track Events</Link>
                        </Button>
                    </div>
                </div>

                {/* Personal Insights */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {insights.map((insight, index) => (
                        <Card key={index} className="relative overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-blue-100 rounded-lg w-fit">{insight.icon}</div>
                                    {insight.trend && (
                                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${insight.trend === 'up' ? 'bg-green-100 text-green-700' : insight.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                            <TrendingUp className="w-3 h-3" />
                                            {insight.trendValue}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1">
                                    <h3 className="font-medium text-gray-900">{insight.title}</h3>
                                    <div className="text-2xl font-bold text-blue-600">{insight.value}</div>
                                    <p className="text-sm text-gray-600">{insight.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Your Upcoming Events */}
                    <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" />Your Upcoming Events</CardTitle>
                                    <CardDescription>Events you are tracking and planning to attend</CardDescription>
                                </div>
                                <Button asChild size="sm" variant="outline">
                                    <Link href="/calendar">View All<ArrowUpRight className="h-4 w-4 ml-1" /></Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {nextTrackedEvents.length > 0 ? (
                                nextTrackedEvents.map((trackedEvent) => (
                                    <div key={trackedEvent.trackingId} className="group p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{trackedEvent.event?.title}</h3>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDate(trackedEvent.event?.startTime || '')}</span>
                                                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{trackedEvent.event?.organizer}</span>
                                                </div>
                                                {trackedEvent.notes && (<p className="text-sm text-gray-500 mt-2 italic">`&quot;`{trackedEvent.notes}`&quot;`</p>)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={trackedEvent.status === 'attending' ? 'default' : trackedEvent.status === 'bookmarked' ? 'secondary' : 'outline'}>{trackedEvent.status}</Badge>
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="font-medium text-gray-900 mb-2">No upcoming events</h3>
                                    <p className="text-gray-600 mb-4">Start tracking events to see them here</p>
                                    <Button asChild><Link href="/calendar">Browse Events</Link></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Activity Summary & Quick Actions */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-green-500" />Your Progress</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">{quickStats.totalTracked}</div>
                                        <div className="text-sm text-gray-600">Total Tracked</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">{quickStats.totalAttended}</div>
                                        <div className="text-sm text-gray-600">Attended</div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">Completion Rate</span>
                                        <span className="text-sm font-medium">{quickStats.completionRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${quickStats.completionRate}%` }}></div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <Button asChild variant="outline" className="w-full justify-start"><Link href="/dashboard/growth"><BookOpen className="w-4 h-4 mr-2" />View Learning Progress</Link></Button>
                                <Button asChild variant="outline" className="w-full justify-start"><Link href="/settings"><Bell className="w-4 h-4 mr-2" />Notification Settings</Link></Button>
                                <Button asChild variant="outline" className="w-full justify-start"><Link href="/api-docs"><Zap className="w-4 h-4 mr-2" />API Integration</Link></Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Recommended Events */}
                {recommendedEvents.length > 0 && (
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500" />Recommended for You</CardTitle>
                                    <CardDescription>Events we think you might be interested in</CardDescription>
                                </div>
                                <Button asChild variant="outline" size="sm"><Link href="/calendar">See All</Link></Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {recommendedEvents.map((event) => (
                                    <div key={event.id} className="group p-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer">
                                        <h3 className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors mb-2">{event.title}</h3>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateShort(event.startTime)}</div>
                                            <div className="flex items-center gap-1"><Users className="w-3 h-3" />{event.organizer}</div>
                                            {event.location && (<div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</div>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}