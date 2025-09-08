// src/components/growth/GrowthComponents.tsx
'use client';

import React, { FC } from 'react';
import dynamic from 'next/dynamic';
import {
    ChevronDown,
    ArrowRight,
    Calendar,
    Zap,
    TrendingUp,
    CheckSquare,
    Flame,
    Globe,
    Lightbulb
} from 'lucide-react';

// Dynamic imports for chart components to reduce bundle size
const IndustryPulseScoreChart = dynamic(
    () => import('./ChartComponents').then(mod => ({ default: mod.IndustryPulseScoreChart })),
    { ssr: false, loading: () => <div className="w-full h-[150px] flex items-center justify-center text-gray-400">Loading chart...</div> }
);

// --- Type Definitions ---
interface UpcomingOpportunity {
    title: string;
    date: string;
    category: string;
}

interface TechStackCurrencyData {
    category: string;
    score: number;
    color: string;
}

// --- Component Implementations ---

export const GrowthDashboardHeader: FC<{
    userName: string;
    selectedPeriod: string;
    setSelectedPeriod: (period: string) => void;
}> = ({ userName, selectedPeriod }) => (
    <div className="flex items-center justify-between mb-8">
        <div>
            <p className="text-gray-500 text-sm mb-1">Welcome back, <span className="font-medium">{userName}!</span></p>
            <h1 className="text-4xl font-light text-gray-800">Your Professional Development</h1>
        </div>
        <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-600 text-sm hover:border-gray-300 transition-colors">
                <span>{selectedPeriod}</span>
                <ChevronDown className="w-4 h-4" />
            </button>
        </div>
    </div>
);

export const IndustryPulseScoreCard: FC<{ score: number }> = ({ score }) => {
    return (
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-700 font-medium">Industry Pulse Score</h3>
                <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-grow flex items-center justify-center my-4">
                <IndustryPulseScoreChart score={score} />
            </div>
            <p className="text-center text-sm text-gray-500">Your alignment with major tech announcements this quarter.</p>
        </div>
    );
};


export const FollowThroughRateCard: FC<{ rate: number }> = ({ rate }) => (
    <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-medium">Follow-Through Rate</h3>
            <CheckSquare className="w-5 h-5 text-green-500" />
        </div>
        <div className="text-5xl font-bold text-gray-800 mb-2">{rate}%</div>
        <p className="text-sm text-gray-500">Of bookmarked events you attended. Excellent community engagement!</p>
    </div>
);

export const LearningConsistencyCard: FC<{ currentStreak: number, longestStreak: number }> = ({ currentStreak, longestStreak }) => (
    <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-700 font-medium">Engagement Streak</h3>
            <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex items-baseline gap-6">
            <div>
                <div className="text-5xl font-bold text-gray-800">{currentStreak}</div>
                <p className="text-sm text-gray-500">Current Streak</p>
            </div>
            <div>
                <div className="text-2xl font-bold text-gray-400">{longestStreak}</div>
                <p className="text-sm text-gray-500">Longest</p>
            </div>
        </div>
    </div>
);

export const TechStackCurrencyCard: FC<{ data: TechStackCurrencyData[] }> = ({ data }) => (
    <div className="col-span-12 md:col-span-7 bg-white rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-800 font-medium">Tech Stack Relevance</h3>
            <Zap className="w-4 h-4 text-gray-600" />
        </div>
        <div className="space-y-4">
            {data.map(item => (
                <div key={item.category}>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.category}</span>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.score}% Current</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.color }}></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const NetworkExpansionCard: FC<{ count: number }> = ({ count }) => (
    <div className="col-span-12 md:col-span-5 bg-gray-800 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Network Expansion</h3>
            <Globe className="w-5 h-5 text-teal-300" />
        </div>
        <p className="text-5xl font-bold text-white mb-2">{count}</p>
        <p className="text-sm text-gray-400">New communities & organizers you&apos;ve engaged with this quarter.</p>
    </div>
);


export const UpcomingOpportunitiesCard: FC<{ opportunities: UpcomingOpportunity[] }> = ({ opportunities }) => (
    <div className="col-span-12 bg-white rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-800 font-medium">Trend Awareness: Upcoming Opportunities</h3>
            <button className="text-sm text-blue-600 font-medium flex items-center gap-1">
                <span>See All</span>
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
        <div className="space-y-4">
            {opportunities.length > 0 ? opportunities.map(opp => (
                <div key={opp.title} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-800">{opp.title}</div>
                            <div className="text-sm text-gray-500">{opp.date} - {opp.category}</div>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
            )) : (
                <p className="text-center text-gray-500 py-8">No specific opportunities based on your top categories right now. Broaden your horizons!</p>
            )}
        </div>
    </div>
);

export const IndustryPulseCard: FC<{ trends: string[] }> = ({ trends }) => (
    <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-gray-800 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Industry Pulse</h3>
            <Lightbulb className="w-4 h-4 text-yellow-300" />
        </div>
        <p className="text-sm text-gray-400 mb-6">Hot topics based on community engagement.</p>
        <div className="flex flex-wrap gap-2">
            {trends.map(trend => (
                <div key={trend} className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-sm font-medium">
                    {trend}
                </div>
            ))}
        </div>
    </div>
);
