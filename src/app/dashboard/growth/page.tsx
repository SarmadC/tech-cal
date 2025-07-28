// src/app/dashboard/growth/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking } from '@/hooks/useEventTracking';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    GrowthDashboardHeader,
    FollowThroughRateCard,
    LearningConsistencyCard,
    TechStackCurrencyCard,
    UpcomingOpportunitiesCard,
    IndustryPulseCard,
    NetworkExpansionCard,
    IndustryPulseScoreCard
} from '@/components/growth/GrowthComponents';
import { AppEvent, SupabaseEventType } from '@/types';
import { fetchRecommendedOpportunities } from '@/lib/eventServices';
import { supabase } from '@/lib/supabaseClient';
import { mapSupabaseEventTypeToAppEventType } from '@/lib/dataMapper';

// --- Type Definitions for this component's state ---
interface CategoryStats {
    category: string;
    attended: number;
    color: string;
}

interface TechStackCurrencyData {
    category: string;
    score: number;
    color: string;
}

interface LearningStreak {
    current: number;
    longest: number;
}


function EnhancedGrowthDashboard() {
    // --- State Declarations ---
    const [techStackCurrency, setTechStackCurrency] = useState<TechStackCurrencyData[]>([]);
    const [upcomingOpportunities, setUpcomingOpportunities] = useState<AppEvent[]>([]);
    const [followThroughRate, setFollowThroughRate] = useState(0);
    const [learningStreak, setLearningStreak] = useState<LearningStreak>({ current: 0, longest: 0 });
    const [industryPulseScore, setIndustryPulseScore] = useState(0);
    const [networkExpansion, setNetworkExpansion] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user, profile } = useAuth();
    const { getTrackedEvents } = useEventTracking();
    const userId = user?.id;
    const [selectedPeriod, setSelectedPeriod] = useState('Yearly');

    // --- Static Data ---
    const industryPulseTrends = ['Generative AI', 'RAGs', 'DevEx', 'Platform Engineering'];
    const majorAnnouncers = useMemo(() => ['apple', 'google', 'openai', 'microsoft', 'amazon', 'meta', 'nvidia'], []);
    const categoryColors = useMemo(() => ({
        'AI & ML': '#a855f7', 'Web Dev': '#3b82f6', 'Cloud': '#f59e0b',
        'Security': '#ef4444', 'Mobile': '#8b5cf6', 'DevOps': '#059669',
        'AR/VR': '#f97316', 'Programming': '#8b5cf6', 'Data Science': '#ec4899',
        'Blockchain': '#10b981'
    }), []);

    // --- Data Fetching and Processing ---
    const loadData = useCallback(async () => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        try {
            const [trackedEvents, eventTypesData] = await Promise.all([
                getTrackedEvents(),
                supabase.from('event_type').select('*')
            ]);

            const eventTypes = (eventTypesData.data as SupabaseEventType[] || []).map(mapSupabaseEventTypeToAppEventType);

            const attendedEvents = trackedEvents.filter(te => te.status === 'attended');
            const bookmarkedEvents = trackedEvents.filter(te => te.status === 'bookmarked');

            // --- Analytics Calculation Logic ---

            // 1. Follow-Through Rate (No changes, this logic is correct)
            if (bookmarkedEvents.length > 0) {
                const attendedFromBookmarks = bookmarkedEvents.filter(b => attendedEvents.some(a => a.eventId === b.eventId)).length;
                setFollowThroughRate(Math.round((attendedFromBookmarks / bookmarkedEvents.length) * 100));
            } else if (attendedEvents.length > 0) {
                setFollowThroughRate(100);
            } else {
                setFollowThroughRate(0);
            }

            // 2. Learning Streak (No changes, this logic is correct)
            if (attendedEvents.length > 0) {
                const sortedEvents = attendedEvents.sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());
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
                setLearningStreak({ current, longest });
            }

            // 3. Category Statistics
            const categoryCount = attendedEvents.reduce((acc, te) => {
                // This check correctly handles the null case.
                if (!te.event) return acc;
                const categoryName = eventTypes.find(et => et.id === te.event.eventTypeId)?.name || 'Unknown';
                if (categoryName === 'Unknown') return acc;
                if (!acc[categoryName]) { acc[categoryName] = { attended: 0, color: categoryColors[categoryName as keyof typeof categoryColors] || '#6B7280' }; }
                acc[categoryName].attended++;
                return acc;
            }, {} as Record<string, { attended: number; color: string }>);
            const statsArray: CategoryStats[] = Object.entries(categoryCount).map(([category, stats]) => ({ category, ...stats })).sort((a, b) => b.attended - a.attended);

            // 4. Tech Stack Currency
            const currencyData: TechStackCurrencyData[] = statsArray.slice(0, 3).map(stat => {
                const recentEvent = attendedEvents
                    .filter(te => {
                        // This check correctly handles the null case.
                        if (!te.event) return false;
                        const categoryName = eventTypes.find(et => et.id === te.event.eventTypeId)?.name;
                        return categoryName === stat.category;
                    })
                    .sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime())[0];
                const daysSince = recentEvent ? (new Date().getTime() - new Date(recentEvent.trackedAt).getTime()) / (1000 * 3600 * 24) : 180;
                const score = Math.max(0, Math.round(100 - (daysSince / 1.8)));
                return { category: stat.category, score, color: stat.color };
            });
            setTechStackCurrency(currencyData);

            // 5. Industry Pulse Score
            const quarterAgo = new Date();
            quarterAgo.setMonth(quarterAgo.getMonth() - 3);
            const recentAttended = attendedEvents.filter(te => new Date(te.trackedAt) > quarterAgo);
            // This check correctly handles the null case.
            const majorEventsAttended = recentAttended.filter(te => te.event && majorAnnouncers.some(a => te.event.organizer.toLowerCase().includes(a))).length;
            const totalMajorEventsInPeriod = 10;
            setIndustryPulseScore(Math.round((majorEventsAttended / totalMajorEventsInPeriod) * 100));

            // 6. Network Expansion
            // This logic correctly handles the null case by filtering out falsy values (null, undefined).
            const uniqueOrganizers = new Set(
                recentAttended
                    .map(te => te.event?.organizer)
                    .filter(Boolean)
            ).size;
            setNetworkExpansion(uniqueOrganizers);

            // 7. Upcoming Opportunities
            const topCategories = statsArray.slice(0, 3).map(s => s.category);
            const trackedEventIds = trackedEvents.map(e => e.eventId);
            const opportunities = await fetchRecommendedOpportunities(topCategories, trackedEventIds);
            setUpcomingOpportunities(opportunities);

        } catch (err) { console.error('Error loading growth data:', err); }
        finally { setLoading(false); }
    }, [userId, getTrackedEvents, categoryColors, majorAnnouncers]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- Render Logic ---
    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-100 pt-20 p-8">
                    <div className="animate-pulse space-y-8">
                        <div className="h-8 bg-gray-300 rounded w-64"></div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-300 rounded-xl"></div>)}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="h-96 bg-gray-300 rounded-xl"></div>
                            <div className="h-96 bg-gray-300 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <GrowthDashboardHeader userName={profile?.full_name?.split(' ')[0] || 'User'} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
                    <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)]">
                        <IndustryPulseScoreCard score={industryPulseScore} />
                        <FollowThroughRateCard rate={followThroughRate} />
                        <LearningConsistencyCard currentStreak={learningStreak.current} longestStreak={learningStreak.longest} />
                        <TechStackCurrencyCard data={techStackCurrency} />
                        <NetworkExpansionCard count={networkExpansion} />
                        <UpcomingOpportunitiesCard opportunities={upcomingOpportunities.map(o => ({
                            title: o.title,
                            date: new Date(o.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                            // This part still needs a proper mapping from eventTypeId to name, which is a separate task
                            category: 'General'
                        }))} />
                        <IndustryPulseCard trends={industryPulseTrends} />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default EnhancedGrowthDashboard;