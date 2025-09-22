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
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import type { Event } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AnalyticsService, type GrowthAnalytics } from '@/services/analyticsService';

interface GrowthClientViewProps {
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
    const { supabase, isReady } = useSupabaseSafe();

    const { data: analytics, error: analyticsError } = useQuery<GrowthAnalytics | null>({
        queryKey: ['growthAnalytics', user?.id],
        queryFn: () => {
            if (!user || !supabase) return null;
            return AnalyticsService.getGrowthAnalytics(user.id, supabase);
        },
        enabled: !!user && !!supabase,
        staleTime: 10 * 60 * 1000,
    });

    const topCategories = useMemo(() => {
        return analytics?.techStackCurrency?.map(tc => tc.category) || [];
    }, [analytics]);

    const { data: upcomingOpportunities, error: opportunitiesError } = useQuery<Event[]>({
        queryKey: ['upcomingOpportunities', topCategories],
        queryFn: () => {
            if (topCategories.length === 0 || !supabase) {
                return [];
            }
            return EventService.getRecommendedEvents(topCategories, [], supabase);
        },
        enabled: topCategories.length > 0 && !!supabase,
        initialData: initialOpportunities,
    });

    // Wait for Supabase client to be ready
    if (!isReady || !supabase) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading growth analytics...</p>
                </div>
            </div>
        );
    }

    // Show loading if supabase client is not ready yet
    if (!supabase) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const queryError = analyticsError || opportunitiesError;

    if (queryError) {
        return <div className="text-center text-red-500 p-8">Error: {(queryError as Error).message}</div>;
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto text-center py-20">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Start Your Growth Journey</h2>
                    <p className="text-gray-500 mb-6">Track and attend events to see your professional development analytics here.</p>
                    <Link href="/calendar" className="bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-800">Browse Events</Link>
                </div>
            </div>
        );
    }

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
                            // --- FIX IS HERE ---
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