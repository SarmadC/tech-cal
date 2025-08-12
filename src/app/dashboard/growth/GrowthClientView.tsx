// src/app/dashboard/growth/GrowthClientView.tsx (Fully Corrected)
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link'; // Keep Link for the empty state
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
    GrowthDashboardHeader,
    FollowThroughRateCard,
    LearningConsistencyCard,
    TechStackCurrencyCard,
    UpcomingOpportunitiesCard,
    NetworkExpansionCard,
    IndustryPulseScoreCard
} from '@/components/growth/GrowthComponents';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import { createClient } from '@/utils/supabase/client';
import type { AppTrackedEvent, AppEvent } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface GrowthClientViewProps {
    initialTrackedEvents: AppTrackedEvent[];
    initialOpportunities: AppEvent[];
}

interface CategoryStats {
    category: string;
    attended: number;
    color: string;
}

// Define a custom fallback for the cards
const CardFallback = () => (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 text-xs text-red-600">
        Error loading this metric.
    </div>
);


export default function GrowthClientView({
    initialTrackedEvents,
    initialOpportunities
}: GrowthClientViewProps) {
    const { user, profile } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
    const [supabase] = useState(() => createClient());

    const { data: trackedEvents, error: trackedEventsError } = useQuery({
        queryKey: ['trackedEvents', user?.id],
        queryFn: () => {
            if (!user) return [];
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
        initialData: initialTrackedEvents,
    });

    const analytics = useMemo(() => {
        if (!trackedEvents || trackedEvents.length === 0) {
            return null;
        }
        const attendedEvents = trackedEvents.filter((te: AppTrackedEvent) => te.status === 'attended');
        const bookmarkedEvents = trackedEvents.filter((te: AppTrackedEvent) => te.status === 'bookmarked');
        let followThroughRate = 0;
        if (bookmarkedEvents.length > 0) {
            const attendedFromBookmarks = bookmarkedEvents.filter((b: AppTrackedEvent) => attendedEvents.some((a: AppTrackedEvent) => a.eventId === b.eventId)).length;
            followThroughRate = Math.round((attendedFromBookmarks / bookmarkedEvents.length) * 100);
        } else if (attendedEvents.length > 0) {
            followThroughRate = 100;
        }
        let learningStreak = { current: 0, longest: 0 };
        if (attendedEvents.length > 0) {
            const sortedEvents = attendedEvents.sort((a: AppTrackedEvent, b: AppTrackedEvent) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());
            let current = 0, longest = 0, tempStreak = 1;
            const now = new Date();
            const daysSinceLastEvent = Math.floor((now.getTime() - new Date(sortedEvents[0].trackedAt).getTime()) / 86400000);
            if (daysSinceLastEvent <= 30) current = 1;
            for (let i = 1; i < sortedEvents.length; i++) {
                const daysDiff = Math.floor((new Date(sortedEvents[i - 1].trackedAt).getTime() - new Date(sortedEvents[i].trackedAt).getTime()) / 86400000);
                if (daysDiff <= 30) { tempStreak++; if (daysSinceLastEvent <= 30) current = tempStreak; }
                else { longest = Math.max(longest, tempStreak); tempStreak = 1; if (daysSinceLastEvent > 30) current = 0; }
            }
            longest = Math.max(longest, tempStreak);
            learningStreak = { current, longest };
        }
        const categoryColors = { 'AI & ML': '#a855f7', 'Web Dev': '#3b82f6', 'Cloud': '#f59e0b', 'Security': '#ef4444', 'Mobile': '#8b5cf6', 'DevOps': '#059669', 'AR/VR': '#f97316', 'Programming': '#8b5cf6', 'Data Science': '#ec4899', 'Blockchain': '#10b981' };
        const categoryCount = attendedEvents.reduce((acc: Record<string, { attended: number; color: string }>, te: AppTrackedEvent) => {
            if (!te.event?.category) return acc;
            const categoryName = te.event.category.name;
            if (!acc[categoryName]) { acc[categoryName] = { attended: 0, color: categoryColors[categoryName as keyof typeof categoryColors] || '#6B7280' }; }
            acc[categoryName].attended++;
            return acc;
        }, {} as Record<string, { attended: number; color: string }>);
        const statsArray: CategoryStats[] = Object.entries(categoryCount).map(([category, stats]) => ({ category, ...stats })).sort((a, b) => b.attended - a.attended);
        const techStackCurrency = statsArray.slice(0, 3).map(stat => {
            const recentEvent = attendedEvents.filter((te: AppTrackedEvent) => te.event?.category?.name === stat.category).sort((a: AppTrackedEvent, b: AppTrackedEvent) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime())[0];
            const daysSince = recentEvent ? (new Date().getTime() - new Date(recentEvent.trackedAt).getTime()) / (1000 * 3600 * 24) : 180;
            const score = Math.max(0, Math.round(100 - (daysSince / 1.8)));
            return { category: stat.category, score, color: stat.color };
        });
        const majorAnnouncers = ['apple', 'google', 'openai', 'microsoft', 'amazon', 'meta', 'nvidia'];
        const quarterAgo = new Date(); quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        const recentAttended = attendedEvents.filter((te: AppTrackedEvent) => new Date(te.trackedAt) > quarterAgo);
        const majorEventsAttended = recentAttended.filter((te: AppTrackedEvent) => te.event && majorAnnouncers.some(a => te.event!.organizer.toLowerCase().includes(a))).length;
        const industryPulseScore = Math.min(100, Math.round((majorEventsAttended / 5) * 100));
        const networkExpansion = new Set(recentAttended.map((te: AppTrackedEvent) => te.event?.organizer).filter(Boolean)).size;
        const topCategories = statsArray.slice(0, 3).map(s => s.category);
        const trackedEventIds = trackedEvents.map((e: AppTrackedEvent) => e.eventId);
        return { followThroughRate, learningStreak, techStackCurrency, industryPulseScore, networkExpansion, topCategories, trackedEventIds };
    }, [trackedEvents]);

    const { data: upcomingOpportunities, error: opportunitiesError } = useQuery({
        queryKey: ['upcomingOpportunities', analytics?.topCategories, analytics?.trackedEventIds],
        queryFn: () => {
            if (!analytics?.topCategories || analytics.topCategories.length === 0 || !analytics.trackedEventIds) {
                return [];
            }
            return EventService.getRecommendedEvents(analytics.topCategories, analytics.trackedEventIds, supabase);
        },
        enabled: !!analytics && analytics.topCategories.length > 0,
        initialData: initialOpportunities,
    });

    const queryError = trackedEventsError || opportunitiesError;

    if (queryError) {
        return <div className="text-center text-red-500 p-8">Error: {(queryError as Error).message}</div>;
    }

    // This block handles the case where there is no data to analyze yet.
    if (!analytics) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto text-center py-20">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Start Your Growth Journey</h2>
                    <p className="text-gray-500 mb-6">Track and attend events to see your professional development analytics here.</p>
                    <Link href="/calendar" className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700">Browse Events</Link>
                </div>
            </div>
        );
    }

    // By the time we reach this return statement, `analytics` is guaranteed to be non-null.
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <ErrorBoundary fallback={<CardFallback />}>
                    <GrowthDashboardHeader userName={profile?.fullName?.split(' ')[0] || 'User'} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
                </ErrorBoundary>

                <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)] mt-6">
                    <ErrorBoundary fallback={<CardFallback />}>
                        <UpcomingOpportunitiesCard opportunities={(upcomingOpportunities || []).map((o: AppEvent) => ({
                            title: o.title,
                            date: new Date(o.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                            category: o.category?.name || 'General'
                        }))} />
                    </ErrorBoundary>

                    <ErrorBoundary fallback={<CardFallback />}>
                        <IndustryPulseScoreCard score={analytics.industryPulseScore} />
                    </ErrorBoundary>

                    <ErrorBoundary fallback={<CardFallback />}>
                        <FollowThroughRateCard rate={analytics.followThroughRate} />
                    </ErrorBoundary>

                    <ErrorBoundary fallback={<CardFallback />}>
                        <LearningConsistencyCard currentStreak={analytics.learningStreak.current} longestStreak={analytics.learningStreak.longest} />
                    </ErrorBoundary>

                    <ErrorBoundary fallback={<CardFallback />}>
                        <TechStackCurrencyCard data={analytics.techStackCurrency} />
                    </ErrorBoundary>

                    <ErrorBoundary fallback={<CardFallback />}>
                        <NetworkExpansionCard count={analytics.networkExpansion} />
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
}