// src/components/growth/GrowthComponents.tsx
'use client';

import { FC, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
    Target,
    Calendar,
    Trophy,
    Clock,
    BarChart3,
    Activity,
    Flame,
    CheckCircle,
} from 'lucide-react';

// --- Type Definitions ---
interface ChartData {
    month: string;
    [key: string]: string | number;
}

interface CategoryStats {
    category: string;
    attended: number;
    color: string;
    growth: number;
}

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: ReactNode;
    unlocked: boolean;
    progress?: number;
    threshold?: number;
}

interface UserEvent {
    attendedAt: string;
    category: string;
    status: string;
    eventTitle: string;
    organizer: string;
    eventId: string;
}

interface LearningStreak {
    current: number;
    longest: number;
    lastEventDate: string | null;
}

// --- Component Implementations ---

export const TimeframeSelector: FC<{
    selectedTimeframe: '3m' | '6m' | '1y' | 'all';
    setSelectedTimeframe: (tf: '3m' | '6m' | '1y' | 'all') => void;
}> = ({ selectedTimeframe, setSelectedTimeframe }) => (
    <div className="flex gap-2 mt-4 md:mt-0">
        {(['3m', '6m', '1y', 'all'] as const).map((period) => (
            <button
                key={period}
                onClick={() => setSelectedTimeframe(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTimeframe === period
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
            >
                {period === 'all' ? 'All Time' : period.toUpperCase()}
            </button>
        ))}
    </div>
);


export const MetricCard: FC<{ title: string; value: string | number; description: string; icon: ReactNode; }> = ({ title, value, description, icon }) => (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-400">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="text-sm text-green-400 font-medium">{description}</p>
            </div>
            <div className="p-3 bg-blue-600/20 rounded-lg">
                {icon}
            </div>
        </div>
    </div>
);

export const AttendanceChart: FC<{ data: ChartData[]; colors: Record<string, string> }> = ({ data, colors }) => (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 h-96">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Monthly Attendance
        </h2>
        {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#a3a3a3" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#a3a3a3" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #404040', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(100,100,100,0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                    {Object.entries(colors).map(([category, color]) => (
                        <Bar key={category} dataKey={category} stackId="a" fill={color} radius={[4, 4, 0, 0]} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="text-center py-12 h-full flex flex-col justify-center items-center">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No attendance data available yet.</p>
            </div>
        )}
    </div>
);

export const FocusAreas: FC<{ stats: CategoryStats[] }> = ({ stats }) => (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 h-full">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Learning Focus Areas
        </h2>
        {stats.length > 0 ? (
            <div className="space-y-4">
                {stats.slice(0, 6).map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                            <span className="font-medium text-gray-200">{category.category}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-sm font-semibold text-white">{category.attended}</div>
                                <div className="text-xs text-gray-400">attended</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-12 h-full flex flex-col justify-center items-center">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No learning data available yet.</p>
            </div>
        )}
    </div>
);

export const AchievementsList: FC<{ achievements: Achievement[] }> = ({ achievements }) => (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Achievements & Milestones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => (
                <div key={achievement.id} className={`p-4 rounded-lg border-2 ${achievement.unlocked ? 'border-green-500/30 bg-green-500/10' : 'border-gray-700 bg-gray-900/50'}`}>
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${achievement.unlocked ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                            {achievement.unlocked ? <CheckCircle className="w-6 h-6" /> : achievement.icon}
                        </div>
                        <div>
                            <h3 className={`font-semibold ${achievement.unlocked ? 'text-green-300' : 'text-gray-200'}`}>{achievement.title}</h3>
                            <p className={`text-sm ${achievement.unlocked ? 'text-green-400' : 'text-gray-400'}`}>{achievement.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

export const RecentActivity: FC<{ events: UserEvent[] }> = ({ events }) => (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 h-full">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Recent Learning Activity
        </h2>
        <div className="space-y-4">
            {events.slice(0, 5).map((event, index) => (
                <div key={`${event.eventId}-${index}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-700/50">
                    <div className="p-2 rounded-lg bg-blue-600/20">
                        <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-200">{event.eventTitle}</h3>
                        <p className="text-sm text-gray-400">{formatDate(event.attendedAt)}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const LearningInsights: FC<{ streak: LearningStreak }> = ({ streak }) => (
    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white h-full flex flex-col justify-center shadow-lg">
        <h2 className="text-xl font-bold mb-2">Keep Your Momentum Going! 🚀</h2>
        <p className="text-blue-200 mb-4">
            {streak.current > 0
                ? `You're on a ${streak.current}-event learning streak!`
                : `Ready to start a new learning streak?`
            }
        </p>
        <div className="flex items-center gap-4 text-sm mt-auto">
            <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>Current Streak: {streak.current}</span>
            </div>
            <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Best Streak: {streak.longest}</span>
            </div>
        </div>
    </div>
);
