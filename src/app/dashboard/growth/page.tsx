// src/app/dashboard/growth/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import {
    GrowthDashboardHeader,
    FollowThroughRateCard,
    LearningConsistencyCard,
    TechStackCurrencyCard,
    UpcomingOpportunitiesCard,
    NetworkExpansionCard,
    IndustryPulseScoreCard
} from '@/components/growth/GrowthComponents';
import { AppTrackedEvent } from '@/types';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';

// --- Type Definitions (Cleaned Up) ---
interface CategoryStats {
    category: string;
    attended: number;
    color: string;
}

const GrowthDashboardSkeleton = () => (
    <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto animate-pulse">
            {/* Skeleton layout... */}
        </div>
    </div>
);

function EnhancedGrowthDashboard() {
    const { user, profile } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState('Yearly');

    // --- Data Fetching with TanStack Query ---
    const { data: trackedEvents, isLoading: isLoadingTracked } = useQuery({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            const response = await UserEventService.getTrackedEvents(user!.id);
            if (!response.success) throw new Error(response.error || "Failed to fetch tracked events");
            return response.data || [];
        },
        enabled: !!user,
    });
    
    // --- Computed Analytics with useMemo ---
    const analytics = useMemo(() => {
        if (!trackedEvents || trackedEvents.length === 0) {
            return {
                followThroughRate: 0,
                learningStreak: { current: 0, longest: 0 },
                techStackCurrency: [],
                industryPulseScore: 0,
                networkExpansion: 0,
                topCategories: [],
                trackedEventIds: [],
            };
        }

        const attendedEvents = trackedEvents.filter(te => te.status === 'attended');
        const bookmarkedEvents = trackedEvents.filter(te => te.status === 'bookmarked');

        // 1. Follow-Through Rate
        let followThroughRate = 0;
        if (bookmarkedEvents.length > 0) {
            const attendedFromBookmarks = bookmarkedEvents.filter(b => attendedEvents.some(a => a.eventId === b.eventId)).length;
            followThroughRate = Math.round((attendedFromBookmarks / bookmarkedEvents.length) * 100);
        } else if (attendedEvents.length > 0) {
            followThroughRate = 100;
        }

        // 2. Learning Streak
        // FIX: Calculate and return the value directly, don't call `useState` setters.
        let learningStreak = { current: 0, longest: 0 };
        if (attendedEvents.length > 0) {
            const sortedEvents = attendedEvents.sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());
            let current = 0, longest = 0, tempStreak = 1;
            const now = new Date();
            const daysSinceLastEvent = Math.floor((now.getTime() - new Date(sortedEvents[0].trackedAt).getTime()) / 86400000);
            if (daysSinceLastEvent <= 30) current = 1;
            for (let i = 1; i < sortedEvents.length; i++) {
                const daysDiff = Math.floor((new Date(sortedEvents[i - 1].trackedAt).getTime() - new Date(sortedEvents[i].trackedAt).getTime()) / 86400000);
                if (daysDiff <= 30) {
                    tempStreak++;
                    if (daysSinceLastEvent <= 30) current = tempStreak;
                } else {
                    longest = Math.max(longest, tempStreak);
                    tempStreak = 1;
                    if (daysSinceLastEvent > 30) current = 0;
                }
            }
            longest = Math.max(longest, tempStreak);
            learningStreak = { current, longest };
        }

        // 3. Category Statistics
        const categoryColors = { 'AI & ML': '#a855f7', 'Web Dev': '#3b82f6', /* ...other colors */ };
        const categoryCount = attendedEvents.reduce((acc, te) => {
            if (!te.event?.category) return acc;
            const categoryName = te.event.category.name;
            if (!acc[categoryName]) { acc[categoryName] = { attended: 0, color: categoryColors[categoryName as keyof typeof categoryColors] || '#6B7280' }; }
            acc[categoryName].attended++;
            return acc;
        }, {} as Record<string, { attended: number; color: string }>);
        const statsArray: CategoryStats[] = Object.entries(categoryCount).map(([category, stats]) => ({ category, ...stats })).sort((a, b) => b.attended - a.attended);

        // 4. Tech Stack Currency
        // FIX: Calculate and return the value directly, don't call `useState` setters.
        const techStackCurrency = statsArray.slice(0, 3).map(stat => {
            const recentEvent = attendedEvents
                .filter(te => te.event?.category?.name === stat.category)
                .sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime())[0];
            const daysSince = recentEvent ? (new Date().getTime() - new Date(recentEvent.trackedAt).getTime()) / (1000 * 3600 * 24) : 180;
            // FIX: The score calculation was missing.
            const score = Math.max(0, Math.round(100 - (daysSince / 1.8)));
            return { category: stat.category, score, color: stat.color };
        });

        // 5. Industry Pulse Score & Network Expansion
        const majorAnnouncers = ['apple', 'google', 'openai', 'microsoft', 'amazon', 'meta', 'nvidia'];
        const quarterAgo = new Date();
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        const recentAttended = attendedEvents.filter(te => new Date(te.trackedAt) > quarterAgo);
        
        const majorEventsAttended = recentAttended.filter(te => te.event && majorAnnouncers.some(a => te.event!.organizer.toLowerCase().includes(a))).length;
        const industryPulseScore = Math.round((majorEventsAttended / 10) * 100); // Assume 10 major events
        const networkExpansion = new Set(recentAttended.map(te => te.event?.organizer).filter(Boolean)).size;

        // Extract data for the dependent query
        const topCategories = statsArray.slice(0, 3).map(s => s.category);
        const trackedEventIds = trackedEvents.map(e => e.eventId);

        return {
            followThroughRate,
            learningStreak,
            techStackCurrency,
            industryPulseScore,
            networkExpansion,
            topCategories,
            trackedEventIds,
        };
    }, [trackedEvents]);

    // --- Dependent Query for Upcoming Opportunities ---
    const { data: upcomingOpportunities, isLoading: isLoadingOpportunities } = useQuery({
        queryKey: ['upcomingOpportunities', analytics.topCategories, analytics.trackedEventIds],
        queryFn: async () => {
            const response = await EventService.getRecommendedEvents(analytics.topCategories, analytics.trackedEventIds);
            if (!response.success) throw new Error(response.error || "Failed to fetch opportunities");
            return response.data || [];
        },
        enabled: !!trackedEvents && analytics.topCategories.length > 0, // Enable only after trackedEvents are loaded
    });

    // Determine overall loading state
    const isLoading = isLoadingTracked || (analytics.topCategories.length > 0 && isLoadingOpportunities);

    if (isLoading) {
        return <ProtectedRoute><GrowthDashboardSkeleton /></ProtectedRoute>;
    }
    
    if (!trackedEvents || trackedEvents.length === 0) {
        // ... (Fallback UI, no changes needed)
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <GrowthDashboardHeader userName={profile?.fullName?.split(' ')[0] || 'User'} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
                    <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)]">
                        <UpcomingOpportunitiesCard opportunities={(upcomingOpportunities || []).map(o => ({
                            title: o.title,
                            date: new Date(o.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                            category: o.category?.name || 'General'
                        }))} />
                        <IndustryPulseScoreCard score={analytics.industryPulseScore} />
                        <FollowThroughRateCard rate={analytics.followThroughRate} />
                        <LearningConsistencyCard currentStreak={analytics.learningStreak.current} longestStreak={analytics.learningStreak.longest} />
                        <TechStackCurrencyCard data={analytics.techStackCurrency} />
                        <NetworkExpansionCard count={analytics.networkExpansion} />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default EnhancedGrowthDashboard;