// src/app/dashboard/growth/page.tsx (Refactored)
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    MetricCard,
    AttendanceChart,
    FocusAreas,
    AchievementsList,
    RecentActivity,
    LearningInsights
} from '@/components/growth/GrowthComponents';
import {
    Award,
    Target,
    Calendar,
    BookOpen,
    Star,
    Trophy,
    Flame,
} from 'lucide-react';

// --- Type Definitions ---
interface UserEvent {
    attendedAt: string;
    category: string;
    status: string;
    eventTitle: string;
    organizer: string;
    eventId: string;
}

interface ChartData {
    month: string;
    [key: string]: string | number;
}

interface CategoryStats {
    category: string;
    attended: number;
    bookmarked: number;
    total: number;
    growth: number;
    color: string;
}

interface LearningStreak {
    current: number;
    longest: number;
    lastEventDate: string | null;
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    unlocked: boolean;
    progress?: number;
    threshold?: number;
}

interface FetchedGrowthEvent {
    created_at: string;
    status: string;
    events: {
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
        .select('created_at, status, events(title, organizer, event_type(name))')
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
            eventId: userEvent.created_at
        }))
        .filter(event => event.category !== 'Unknown');
};

const prepareChartData = (events: UserEvent[]): ChartData[] => {
    const monthlyData: Record<string, Record<string, number>> = {};
    events.forEach(event => {
        const month = new Date(event.attendedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) monthlyData[month] = {};
        monthlyData[month][event.category] = (monthlyData[month][event.category] || 0) + 1;
    });
    return Object.keys(monthlyData).map(month => ({ month, ...monthlyData[month] })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()).slice(-12);
};


function EnhancedGrowthDashboard() {
    const [allEvents, setAllEvents] = useState<UserEvent[]>([]);
    const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [learningStreak, setLearningStreak] = useState<LearningStreak>({ current: 0, longest: 0, lastEventDate: null });
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const userId = user?.id;

    const categoryColors = useMemo(() => ({
        'AI & ML': '#8B5CF6', 'Web Dev': '#10B981', 'Cloud': '#F59E0B',
        'Security': '#EF4444', 'Mobile': '#3B82F6', 'DevOps': '#06B6D4',
        'AR/VR': '#F97316', 'Programming': '#8B5CF6', 'Data Science': '#EC4899',
        'Blockchain': '#84CC16'
    }), []);

    const calculateLearningStreak = useCallback((events: UserEvent[]): LearningStreak => {
        if (events.length === 0) return { current: 0, longest: 0, lastEventDate: null };
        const attendedEvents = events.filter(e => e.status === 'attended').sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime());
        if (attendedEvents.length === 0) return { current: 0, longest: 0, lastEventDate: null };
        let current = 0, longest = 0, tempStreak = 1;
        const now = new Date();
        const daysSinceLastEvent = Math.floor((now.getTime() - new Date(attendedEvents[0].attendedAt).getTime()) / 86400000);
        if (daysSinceLastEvent <= 30) current = 1;

        for (let i = 1; i < attendedEvents.length; i++) {
            const daysDiff = Math.floor((new Date(attendedEvents[i - 1].attendedAt).getTime() - new Date(attendedEvents[i].attendedAt).getTime()) / 86400000);
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
        return { current, longest, lastEventDate: attendedEvents[0]?.attendedAt || null };
    }, []);

    const calculateAchievements = useCallback((events: UserEvent[], streak: LearningStreak): Achievement[] => {
        const attendedCount = events.filter(e => e.status === 'attended').length;
        const uniqueCategories = new Set(events.map(e => e.category)).size;
        const thisYearEvents = events.filter(e => new Date(e.attendedAt).getFullYear() === new Date().getFullYear()).length;
        return [
            { id: 'first_event', title: 'Getting Started', description: 'Attended 1st event', icon: <Star className="w-6 h-6" />, unlocked: attendedCount >= 1 },
            { id: 'event_explorer', title: 'Event Explorer', description: 'Attended 10 events', icon: <BookOpen className="w-6 h-6" />, unlocked: attendedCount >= 10 },
            { id: 'tech_enthusiast', title: 'Tech Enthusiast', description: 'Attended 25 events', icon: <Trophy className="w-6 h-6" />, unlocked: attendedCount >= 25 },
            { id: 'category_explorer', title: 'Category Explorer', description: 'Explored 5 categories', icon: <Target className="w-6 h-6" />, unlocked: uniqueCategories >= 5 },
            { id: 'learning_streak', title: 'Consistent Learner', description: '5-event streak', icon: <Flame className="w-6 h-6" />, unlocked: streak.longest >= 5 },
            { id: 'yearly_goal', title: 'Annual Achiever', description: '20 events this year', icon: <Award className="w-6 h-6" />, unlocked: thisYearEvents >= 20 }
        ];
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!userId) { setLoading(false); return; }
            setLoading(true);
            try {
                const events = await fetchUserEventsForGrowth(userId);
                setAllEvents(events);
                const categoryCount = events.reduce((acc, event) => {
                    if (!acc[event.category]) acc[event.category] = { attended: 0, bookmarked: 0, total: 0 };
                    if (event.status === 'attended') acc[event.category].attended++;
                    else if (event.status === 'bookmarked') acc[event.category].bookmarked++;
                    acc[event.category].total++;
                    return acc;
                }, {} as Record<string, { attended: number; bookmarked: number; total: number }>);
                const statsArray: CategoryStats[] = Object.entries(categoryCount).map(([category, stats]) => ({
                    category, ...stats,
                    growth: stats.attended > 0 ? Math.round((stats.attended / stats.total) * 100) : 0,
                    color: categoryColors[category as keyof typeof categoryColors] || '#6B7280'
                })).sort((a, b) => b.total - a.total);
                setCategoryStats(statsArray);
                setChartData(prepareChartData(events));
                const streak = calculateLearningStreak(events);
                setLearningStreak(streak);
                setAchievements(calculateAchievements(events, streak));
            } catch (err) { console.error('Error loading growth data:', err); }
            finally { setLoading(false); }
        };
        loadData();
    }, [userId, categoryColors, calculateLearningStreak, calculateAchievements]);

    const keyMetrics = useMemo(() => {
        const attendedEvents = allEvents.filter(e => e.status === 'attended');
        const unlockedAchievements = achievements.filter(a => a.unlocked).length;
        return {
            totalAttended: attendedEvents.length,
            thisYear: attendedEvents.filter(e => new Date(e.attendedAt).getFullYear() === new Date().getFullYear()).length,
            uniqueCategories: new Set(attendedEvents.map(e => e.category)).size,
            topCategory: categoryStats[0]?.category || 'None',
            achievementsUnlocked: unlockedAchievements,
        };
    }, [allEvents, categoryStats, achievements]);

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 pt-20 p-8">
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
            <div className="min-h-screen bg-gray-50 pt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Learning Journey</h1>
                        <p className="text-lg text-gray-600">Track your growth and celebrate your achievements in tech</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="Events Attended" value={keyMetrics.totalAttended} description={`+${keyMetrics.thisYear} this year`} icon={<Calendar className="w-6 h-6 text-blue-600" />} />
                        <MetricCard title="Learning Streak" value={learningStreak.current} description={`Longest: ${learningStreak.longest}`} icon={<Flame className="w-6 h-6 text-orange-600" />} />
                        <MetricCard title="Categories Explored" value={keyMetrics.uniqueCategories} description={`Top: ${keyMetrics.topCategory}`} icon={<Target className="w-6 h-6 text-purple-600" />} />
                        <MetricCard title="Achievements" value={keyMetrics.achievementsUnlocked} description={`of ${achievements.length} unlocked`} icon={<Trophy className="w-6 h-6 text-green-600" />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <AttendanceChart data={chartData} colors={categoryColors} />
                        </div>
                        <div className="space-y-6">
                            <FocusAreas stats={categoryStats} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <AchievementsList achievements={achievements} />
                        </div>
                        <div className="space-y-6">
                            <RecentActivity events={allEvents} />
                            <LearningInsights streak={learningStreak} />
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default EnhancedGrowthDashboard;
