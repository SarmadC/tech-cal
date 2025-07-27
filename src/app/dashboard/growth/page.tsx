// src/app/dashboard/growth/page.tsx (Refactored)
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
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

// --- Type Definitions ---
interface UserEvent {
    attendedAt: string;
    category: string;
    status: string;
    eventTitle: string;
    organizer: string;
    eventId: string;
}

interface UpcomingEvent {
    id: string;
    title: string;
    start_time: string;
    event_type: { name: string }[] | null;
}

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

interface FetchedGrowthEvent {
    created_at: string;
    status: string;
    events: {
        id: string;
        title: string;
        organizer: string;
        event_type: {
            name: string;
        }[] | null;
    }[] | null;
}

// --- Helper Functions ---
const fetchUserEventsForGrowth = async (userId: string): Promise<UserEvent[]> => {
    const { data, error } = await supabase
        .from('user_events')
        .select('created_at, status, events(id, title, organizer, event_type(name))')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching growth events:', error);
        return [];
    }

    return (data as FetchedGrowthEvent[])
        .map((userEvent) => ({
            attendedAt: userEvent.created_at,
            category: userEvent.events?.[0]?.event_type?.[0]?.name || 'Unknown',
            status: userEvent.status,
            eventTitle: userEvent.events?.[0]?.title || 'Unknown Event',
            organizer: userEvent.events?.[0]?.organizer || 'Unknown Organizer',
            eventId: userEvent.events?.[0]?.id || userEvent.created_at
        }))
        .filter(event => event.category !== 'Unknown');
};

const fetchUpcomingOpportunities = async (topCategories: string[], trackedEventIds: string[]): Promise<UpcomingEvent[]> => {
    if (topCategories.length === 0) return [];

    let query = supabase
        .from('events')
        .select('id, title, start_time, event_type!inner(name)')
        .in('event_type.name', topCategories)
        .gte('start_time', new Date().toISOString());

    if (trackedEventIds.length > 0) {
        query = query.not('id', 'in', `(${trackedEventIds.join(',')})`);
    }

    const { data, error } = await query.limit(3);

    if (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
    }
    return data as UpcomingEvent[];
};


function EnhancedGrowthDashboard() {
    // --- State Declarations ---
    const [techStackCurrency, setTechStackCurrency] = useState<TechStackCurrencyData[]>([]);
    const [upcomingOpportunities, setUpcomingOpportunities] = useState<UpcomingEvent[]>([]);
    const [followThroughRate, setFollowThroughRate] = useState(0);
    const [learningStreak, setLearningStreak] = useState<LearningStreak>({ current: 0, longest: 0 });
    const [industryPulseScore, setIndustryPulseScore] = useState(0);
    const [networkExpansion, setNetworkExpansion] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user, profile } = useAuth();
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
            const events = await fetchUserEventsForGrowth(userId);

            const attendedEvents = events.filter(e => e.status === 'attended');
            const bookmarkedEvents = events.filter(e => e.status === 'bookmarked');

            // --- Analytics Calculation Logic ---

            // 1. Community Engagement Rate (Follow-Through)
            if (bookmarkedEvents.length > 0) {
                const attendedFromBookmarks = bookmarkedEvents.filter(b => attendedEvents.some(a => a.eventId === b.eventId)).length;
                setFollowThroughRate(Math.round((attendedFromBookmarks / bookmarkedEvents.length) * 100));
            } else if (attendedEvents.length > 0) {
                setFollowThroughRate(100);
            } else {
                setFollowThroughRate(0);
            }

            // 2. Professional Engagement Streak (Learning Streak)
            if (attendedEvents.length > 0) {
                const sortedEvents = attendedEvents.sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime());
                let current = 0, longest = 0, tempStreak = 1;
                const now = new Date();
                const daysSinceLastEvent = Math.floor((now.getTime() - new Date(sortedEvents[0].attendedAt).getTime()) / 86400000);
                if (daysSinceLastEvent <= 30) current = 1;

                for (let i = 1; i < sortedEvents.length; i++) {
                    const daysDiff = Math.floor((new Date(sortedEvents[i - 1].attendedAt).getTime() - new Date(sortedEvents[i].attendedAt).getTime()) / 86400000);
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
                setLearningStreak({ current, longest });
            }

            // 3. Category Statistics for other calculations
            const categoryCount = attendedEvents.reduce((acc, event) => {
                if (!acc[event.category]) {
                    acc[event.category] = { attended: 0, color: categoryColors[event.category as keyof typeof categoryColors] || '#6B7280' };
                }
                acc[event.category].attended++;
                return acc;
            }, {} as Record<string, { attended: number; color: string }>);
            const statsArray: CategoryStats[] = Object.entries(categoryCount).map(([category, stats]) => ({ category, ...stats })).sort((a, b) => b.attended - a.attended);

            // 4. Tech Stack Currency
            const currencyData: TechStackCurrencyData[] = statsArray.slice(0, 3).map(stat => {
                const recentEvent = attendedEvents.filter(e => e.category === stat.category).sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime())[0];
                const daysSince = recentEvent ? (new Date().getTime() - new Date(recentEvent.attendedAt).getTime()) / (1000 * 3600 * 24) : 180;
                const score = Math.max(0, Math.round(100 - (daysSince / 1.8)));
                return { category: stat.category, score, color: stat.color };
            });
            setTechStackCurrency(currencyData);

            // 5. Industry Pulse Score
            const quarterAgo = new Date();
            quarterAgo.setMonth(quarterAgo.getMonth() - 3);
            const recentAttended = attendedEvents.filter(e => new Date(e.attendedAt) > quarterAgo);
            const majorEventsAttended = recentAttended.filter(e => majorAnnouncers.some(a => e.organizer.toLowerCase().includes(a))).length;
            const totalMajorEventsInPeriod = 10; // Mock value
            setIndustryPulseScore(Math.round((majorEventsAttended / totalMajorEventsInPeriod) * 100));

            // 6. Network Expansion
            const uniqueOrganizers = new Set(recentAttended.map(e => e.organizer)).size;
            setNetworkExpansion(uniqueOrganizers);

            // 7. Upcoming Opportunities
            const topCategories = statsArray.slice(0, 3).map(s => s.category);
            const trackedEventIds = events.map(e => e.eventId);
            const opportunities = await fetchUpcomingOpportunities(topCategories, trackedEventIds);
            setUpcomingOpportunities(opportunities);

        } catch (err) { console.error('Error loading growth data:', err); }
        finally { setLoading(false); }
    }, [userId, categoryColors, majorAnnouncers]);

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
                            date: new Date(o.start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                            category: o.event_type?.[0]?.name || 'General'
                        }))} />
                        <IndustryPulseCard trends={industryPulseTrends} />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default EnhancedGrowthDashboard;
