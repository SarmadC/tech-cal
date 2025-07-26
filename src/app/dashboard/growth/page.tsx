// Enhanced Growth Dashboard with Comprehensive Learning Analytics
'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    TrendingUp,
    Award,
    Target,
    Calendar,
    BookOpen,
    Star,
    ChevronRight,
    Trophy,
    Clock,
    BarChart3,
    Activity,
    Flame,
    CheckCircle,
    ArrowUp,
    ArrowDown,
    Minus
} from 'lucide-react';

// Enhanced type definitions
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

interface MonthlyProgress {
    month: string;
    events: number;
    categories: number;
    growth: number;
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

// Helper functions
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
            eventId: userEvent.created_at // Using created_at as fallback ID
        }))
        .filter(event => event.category !== 'Unknown');
};

const prepareChartData = (events: UserEvent[]): ChartData[] => {
    const monthlyData: Record<string, Record<string, number>> = {};

    events.forEach(event => {
        const month = new Date(event.attendedAt).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!monthlyData[month]) {
            monthlyData[month] = {};
        }
        monthlyData[month][event.category] = (monthlyData[month][event.category] || 0) + 1;
    });

    return Object.keys(monthlyData)
        .map(month => ({
            month,
            ...monthlyData[month],
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-12); // Last 12 months
};

function EnhancedGrowthDashboard() {
    const [allEvents, setAllEvents] = useState<UserEvent[]>([]);
    const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [learningStreak, setLearningStreak] = useState<LearningStreak>({ current: 0, longest: 0, lastEventDate: null });
    const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
    const userId = useUserId();

    // Color palette for categories
    const categoryColors = useMemo(() => ({
        'AI & ML': '#8B5CF6',
        'Web Dev': '#10B981',
        'Cloud': '#F59E0B',
        'Security': '#EF4444',
        'Mobile': '#3B82F6',
        'DevOps': '#06B6D4',
        'AR/VR': '#F97316',
        'Programming': '#8B5CF6',
        'Data Science': '#EC4899',
        'Blockchain': '#84CC16'
    }), []);

    // Calculate learning streak
    const calculateLearningStreak = (events: UserEvent[]): LearningStreak => {
        if (events.length === 0) return { current: 0, longest: 0, lastEventDate: null };

        const attendedEvents = events
            .filter(e => e.status === 'attended')
            .sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime());

        if (attendedEvents.length === 0) return { current: 0, longest: 0, lastEventDate: null };

        let current = 0;
        let longest = 0;
        let tempStreak = 1;

        const now = new Date();
        const lastEvent = new Date(attendedEvents[0].attendedAt);

        // Check if current streak is active (within last 30 days)
        const daysSinceLastEvent = Math.floor((now.getTime() - lastEvent.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastEvent <= 30) {
            current = 1;
        }

        // Calculate longest streak
        for (let i = 1; i < attendedEvents.length; i++) {
            const prevDate = new Date(attendedEvents[i - 1].attendedAt);
            const currDate = new Date(attendedEvents[i].attendedAt);
            const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 30) { // Events within 30 days of each other
                tempStreak++;
                if (daysSinceLastEvent <= 30) current = tempStreak;
            } else {
                longest = Math.max(longest, tempStreak);
                tempStreak = 1;
                if (daysSinceLastEvent > 30) current = 0;
            }
        }

        longest = Math.max(longest, tempStreak);

        return {
            current,
            longest,
            lastEventDate: attendedEvents[0]?.attendedAt || null
        };
    };

    // Calculate achievements
    const calculateAchievements = (events: UserEvent[], streak: LearningStreak): Achievement[] => {
        const attendedCount = events.filter(e => e.status === 'attended').length;
        const uniqueCategories = new Set(events.map(e => e.category)).size;
        const thisYearEvents = events.filter(e => new Date(e.attendedAt).getFullYear() === new Date().getFullYear()).length;

        return [
            {
                id: 'first_event',
                title: 'Getting Started',
                description: 'Attended your first tech event',
                icon: <Star className="w-6 h-6" />,
                unlocked: attendedCount >= 1,
                progress: Math.min(attendedCount, 1),
                threshold: 1
            },
            {
                id: 'event_explorer',
                title: 'Event Explorer',
                description: 'Attended 10 tech events',
                icon: <BookOpen className="w-6 h-6" />,
                unlocked: attendedCount >= 10,
                progress: Math.min(attendedCount, 10),
                threshold: 10
            },
            {
                id: 'tech_enthusiast',
                title: 'Tech Enthusiast',
                description: 'Attended 25 tech events',
                icon: <Trophy className="w-6 h-6" />,
                unlocked: attendedCount >= 25,
                progress: Math.min(attendedCount, 25),
                threshold: 25
            },
            {
                id: 'category_explorer',
                title: 'Category Explorer',
                description: 'Explored 5 different tech categories',
                icon: <Target className="w-6 h-6" />,
                unlocked: uniqueCategories >= 5,
                progress: Math.min(uniqueCategories, 5),
                threshold: 5
            },
            {
                id: 'learning_streak',
                title: 'Consistent Learner',
                description: 'Maintained a 5-event learning streak',
                icon: <Flame className="w-6 h-6" />,
                unlocked: streak.longest >= 5,
                progress: Math.min(streak.longest, 5),
                threshold: 5
            },
            {
                id: 'yearly_goal',
                title: 'Annual Achiever',
                description: 'Attended 20 events this year',
                icon: <Award className="w-6 h-6" />,
                unlocked: thisYearEvents >= 20,
                progress: Math.min(thisYearEvents, 20),
                threshold: 20
            }
        ];
    };

    useEffect(() => {
        const loadData = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const events = await fetchUserEventsForGrowth(userId);
                setAllEvents(events);

                // Filter events based on timeframe
                const now = new Date();
                let filteredEvents = events;

                switch (selectedTimeframe) {
                    case '3m':
                        filteredEvents = events.filter(e => new Date(e.attendedAt) >= new Date(now.getFullYear(), now.getMonth() - 3, 1));
                        break;
                    case '6m':
                        filteredEvents = events.filter(e => new Date(e.attendedAt) >= new Date(now.getFullYear(), now.getMonth() - 6, 1));
                        break;
                    case '1y':
                        filteredEvents = events.filter(e => new Date(e.attendedAt) >= new Date(now.getFullYear() - 1, now.getMonth(), 1));
                        break;
                }

                // Calculate category statistics
                const categoryCount = filteredEvents.reduce((acc, event) => {
                    if (!acc[event.category]) {
                        acc[event.category] = { attended: 0, bookmarked: 0, total: 0 };
                    }
                    if (event.status === 'attended') acc[event.category].attended++;
                    else if (event.status === 'bookmarked') acc[event.category].bookmarked++;
                    acc[event.category].total++;
                    return acc;
                }, {} as Record<string, { attended: number; bookmarked: number; total: number }>);

                const categoryStatsArray: CategoryStats[] = Object.entries(categoryCount).map(([category, stats]) => ({
                    category,
                    ...stats,
                    growth: stats.attended > 0 ? Math.round((stats.attended / stats.total) * 100) : 0,
                    color: categoryColors[category as keyof typeof categoryColors] || '#6B7280'
                })).sort((a, b) => b.total - a.total);

                setCategoryStats(categoryStatsArray);
                setChartData(prepareChartData(filteredEvents));

                // Calculate learning streak
                const streak = calculateLearningStreak(events);
                setLearningStreak(streak);

                // Calculate monthly progress
                const monthlyData = prepareChartData(events);
                const progressData: MonthlyProgress[] = monthlyData.map((month, index) => {
                    const totalEvents = Object.keys(month).reduce((sum, key) => {
                        if (key !== 'month') sum += (month[key] as number);
                        return sum;
                    }, 0);
                    const categories = Object.keys(month).filter(key => key !== 'month' && month[key] > 0).length;
                    const prevMonth = index > 0 ? monthlyData[index - 1] : null;
                    const prevTotal = prevMonth ? Object.keys(prevMonth).reduce((sum, key) => {
                        if (key !== 'month') sum += (prevMonth[key] as number);
                        return sum;
                    }, 0) : 0;
                    const growth = prevTotal > 0 ? Math.round(((totalEvents - prevTotal) / prevTotal) * 100) : 0;

                    return {
                        month: month.month,
                        events: totalEvents,
                        categories,
                        growth
                    };
                });
                setMonthlyProgress(progressData);

                // Calculate achievements
                const achievementsList = calculateAchievements(events, streak);
                setAchievements(achievementsList);

            } catch (err) {
                console.error('Error loading growth data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId, selectedTimeframe]);

    // Calculate key metrics
    const keyMetrics = useMemo(() => {
        const attendedEvents = allEvents.filter(e => e.status === 'attended');
        const thisYearEvents = attendedEvents.filter(e => new Date(e.attendedAt).getFullYear() === new Date().getFullYear());
        const lastMonthEvents = attendedEvents.filter(e => {
            const eventDate = new Date(e.attendedAt);
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return eventDate >= lastMonth;
        });

        const topCategory = categoryStats[0];
        const unlockedAchievements = achievements.filter(a => a.unlocked).length;

        return {
            totalAttended: attendedEvents.length,
            thisYear: thisYearEvents.length,
            lastMonth: lastMonthEvents.length,
            uniqueCategories: new Set(attendedEvents.map(e => e.category)).size,
            topCategory: topCategory?.category || 'None',
            achievementsUnlocked: unlockedAchievements,
            totalAchievements: achievements.length
        };
    }, [allEvents, categoryStats, achievements]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="animate-pulse space-y-8">
                            <div className="h-8 bg-gray-300 rounded w-64"></div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-32 bg-gray-300 rounded-xl"></div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="h-96 bg-gray-300 rounded-xl"></div>
                                <div className="h-96 bg-gray-300 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Learning Journey</h1>
                            <p className="text-lg text-gray-600">Track your growth and celebrate your achievements in tech</p>
                        </div>
                        <div className="flex gap-2 mt-4 md:mt-0">
                            {(['3m', '6m', '1y', 'all'] as const).map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setSelectedTimeframe(period)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTimeframe === period
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                >
                                    {period === 'all' ? 'All Time' : period.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Events Attended</p>
                                    <p className="text-3xl font-bold text-gray-900">{keyMetrics.totalAttended}</p>
                                    <p className="text-sm text-green-600 font-medium">+{keyMetrics.thisYear} this year</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Learning Streak</p>
                                    <p className="text-3xl font-bold text-gray-900">{learningStreak.current}</p>
                                    <p className="text-sm text-orange-600 font-medium">Longest: {learningStreak.longest}</p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Flame className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Categories Explored</p>
                                    <p className="text-3xl font-bold text-gray-900">{keyMetrics.uniqueCategories}</p>
                                    <p className="text-sm text-purple-600 font-medium">Top: {keyMetrics.topCategory}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Target className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Achievements</p>
                                    <p className="text-3xl font-bold text-gray-900">{keyMetrics.achievementsUnlocked}</p>
                                    <p className="text-sm text-green-600 font-medium">of {keyMetrics.totalAchievements} unlocked</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Trophy className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Monthly Attendance Chart */}
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Monthly Attendance by Category
                            </h2>
                            {chartData.length > 0 ? (
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis
                                                dataKey="month"
                                                tick={{ fontSize: 12 }}
                                                stroke="#6b7280"
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fontSize: 12 }}
                                                stroke="#6b7280"
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                            />
                                            <Legend />
                                            {Object.entries(categoryColors).map(([category, color]) => (
                                                <Bar
                                                    key={category}
                                                    dataKey={category}
                                                    stackId="a"
                                                    fill={color}
                                                    radius={[2, 2, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No attendance data available yet.</p>
                                    <p className="text-sm text-gray-400 mt-2">Start attending events to see your progress!</p>
                                </div>
                            )}
                        </div>

                        {/* Category Distribution */}
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-purple-600" />
                                Learning Focus Areas
                            </h2>
                            {categoryStats.length > 0 ? (
                                <div className="space-y-4">
                                    {categoryStats.slice(0, 6).map((category, index) => (
                                        <div key={category.category} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                ></div>
                                                <span className="font-medium text-gray-900">{category.category}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-gray-900">{category.attended}</div>
                                                    <div className="text-xs text-gray-500">attended</div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {category.growth > 0 ? (
                                                        <ArrowUp className="w-4 h-4 text-green-500" />
                                                    ) : category.growth < 0 ? (
                                                        <ArrowDown className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    )}
                                                    <span className={`text-sm font-medium ${category.growth > 0 ? 'text-green-600' :
                                                            category.growth < 0 ? 'text-red-600' :
                                                                'text-gray-500'
                                                        }`}>
                                                        {category.growth}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No learning data available yet.</p>
                                    <p className="text-sm text-gray-400 mt-2">Start exploring different tech categories!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Achievements Section */}
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-600" />
                            Achievements & Milestones
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {achievements.map((achievement) => (
                                <div
                                    key={achievement.id}
                                    className={`p-4 rounded-lg border-2 transition-all ${achievement.unlocked
                                            ? 'border-green-200 bg-green-50'
                                            : 'border-gray-200 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${achievement.unlocked
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-gray-200 text-gray-400'
                                            }`}>
                                            {achievement.unlocked ? (
                                                <CheckCircle className="w-6 h-6" />
                                            ) : (
                                                achievement.icon
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-semibold ${achievement.unlocked ? 'text-green-900' : 'text-gray-700'
                                                }`}>
                                                {achievement.title}
                                            </h3>
                                            <p className={`text-sm ${achievement.unlocked ? 'text-green-700' : 'text-gray-500'
                                                }`}>
                                                {achievement.description}
                                            </p>
                                            {!achievement.unlocked && achievement.progress !== undefined && achievement.threshold && (
                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                        <span>Progress</span>
                                                        <span>{achievement.progress}/{achievement.threshold}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.min((achievement.progress / achievement.threshold) * 100, 100)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    {allEvents.length > 0 && (
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                Recent Learning Activity
                            </h2>
                            <div className="space-y-4">
                                {allEvents
                                    .sort((a, b) => new Date(b.attendedAt).getTime() - new Date(a.attendedAt).getTime())
                                    .slice(0, 8)
                                    .map((event, index) => (
                                        <div key={`${event.eventId}-${index}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className={`p-2 rounded-lg ${event.status === 'attended' ? 'bg-green-100' :
                                                    event.status === 'attending' ? 'bg-blue-100' :
                                                        'bg-yellow-100'
                                                }`}>
                                                {event.status === 'attended' ? (
                                                    <CheckCircle className={`w-4 h-4 ${event.status === 'attended' ? 'text-green-600' :
                                                            event.status === 'attending' ? 'text-blue-600' :
                                                                'text-yellow-600'
                                                        }`} />
                                                ) : event.status === 'attending' ? (
                                                    <Calendar className="w-4 h-4 text-blue-600" />
                                                ) : (
                                                    <BookOpen className="w-4 h-4 text-yellow-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900">{event.eventTitle}</h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span>{event.organizer}</span>
                                                    <span>•</span>
                                                    <span className="capitalize">{event.category}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(event.attendedAt)}</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'attended' ? 'bg-green-100 text-green-700' :
                                                    event.status === 'attending' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {event.status === 'attended' ? 'Completed' :
                                                    event.status === 'attending' ? 'Attending' : 'Bookmarked'}
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                            {allEvents.length > 8 && (
                                <div className="mt-6 text-center">
                                    <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 mx-auto">
                                        View All Activity
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Learning Insights */}
                    {learningStreak.lastEventDate && (
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold mb-2">Keep Your Momentum Going! 🚀</h2>
                                    <p className="text-blue-100 mb-4">
                                        {learningStreak.current > 0
                                            ? `You're on a ${learningStreak.current}-event learning streak! Your last event was ${formatDate(learningStreak.lastEventDate)}.`
                                            : `Your last event was ${formatDate(learningStreak.lastEventDate)}. Ready to start a new learning streak?`
                                        }
                                    </p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4" />
                                            <span>Current Streak: {learningStreak.current}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Trophy className="w-4 h-4" />
                                            <span>Best Streak: {learningStreak.longest}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                        <TrendingUp className="w-12 h-12" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Call to Action - No Events Yet */}
                    {allEvents.length === 0 && (
                        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <TrendingUp className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Start Your Learning Journey</h2>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Begin tracking your tech event attendance and watch your growth unfold.
                                Discover insights about your learning patterns and celebrate your achievements.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                    Browse Events
                                </button>
                                <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors">
                                    Learn More
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default EnhancedGrowthDashboard;