// src/app/dashboard/growth/GrowthClientView.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
import { createClient } from '@/utils/supabase/client';
import type { Event } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
// --- (Step 1) Import the new service and type ---
import { AnalyticsService, type GrowthAnalytics } from '@/services/analyticsService';

interface GrowthClientViewProps {
    // We no longer need initialTrackedEvents
    initialOpportunities: Event[];
}

const CardFallback = () => (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50 text-xs text-red-600">
        Error loading this metric.
    </div>
);

export default function GrowthClientView({
    initialOpportunities
}: GrowthClientViewProps) {
    const { user, profile } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
    const [supabase] = useState(() => createClient());

    // --- (Step 2) Replace the old useQuery and useMemo with a single, efficient query ---
    const { data: analytics, error: analyticsError } = useQuery<GrowthAnalytics | null>({
        queryKey: ['growthAnalytics', user?.id],
        queryFn: () => {
            if (!user) return null;
            // Call our new RPC function via the service
            return AnalyticsService.getGrowthAnalytics(user.id, supabase);
        },
        enabled: !!user,
        staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    });

    // --- (Step 3) Derive topCategories from the new analytics object ---
    const topCategories = useMemo(() => {
        return analytics?.techStackCurrency?.map(tc => tc.category) || [];
    }, [analytics]);

    // The upcoming opportunities query now depends on the result of our analytics query
    const { data: upcomingOpportunities, error: opportunitiesError } = useQuery<Event[]>({
        queryKey: ['upcomingOpportunities', topCategories],
        queryFn: () => {
            if (topCategories.length === 0) {
                return [];
            }
            // We can pass an empty array for excludedEventIds or adjust the service if needed
            return EventService.getRecommendedEvents(topCategories, [], supabase);
        },
        enabled: topCategories.length > 0,
        initialData: initialOpportunities,
    });

    const queryError = analyticsError || opportunitiesError;

    if (queryError) {
        return <div className="text-center text-red-500 p-8">Error: {(queryError as Error).message}</div>;
    }

    if (!analytics) {
        // This now serves as both a loading state and an empty state
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

    // --- (Step 4) The rest of the component remains the same, as the data shape is identical ---
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <ErrorBoundary fallback={<CardFallback />}>
                    <GrowthDashboardHeader userName={profile?.fullName?.split(' ')[0] || 'User'} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
                </ErrorBoundary>

                <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)] mt-6">
                    <ErrorBoundary fallback={<CardFallback />}>
                        <UpcomingOpportunitiesCard opportunities={(upcomingOpportunities || []).map((o: Event) => ({
                            title: o.title,
                            date: new Date(o.startTime).toLocaleDateDateString('en-US', { month: 'long', day: 'numeric' }),
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