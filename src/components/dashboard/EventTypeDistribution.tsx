'use client';

import React, { useMemo } from 'react';
import type { TrackedEventRecord, Event } from '@/types';

interface EventTypeDistributionProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    className?: string;
}

// Normalize database category names
const normalizeCategoryName = (categoryName: string | null | undefined): string => {
    if (!categoryName) return 'Other';
    const normalized = categoryName.toLowerCase().trim();

    if (normalized === 'conference' || normalized === 'conferences') return 'Conferences';
    if (normalized === 'workshop' || normalized === 'workshops') return 'Workshops';
    if (normalized === 'meetup' || normalized === 'meetups') return 'Meetups';
    if (normalized === 'webinar' || normalized === 'webinars') return 'Webinars';
    if (normalized === 'hackathon' || normalized === 'hackathons') return 'Hackathons';
    if (normalized === 'training' || normalized === 'course' || normalized === 'courses') return 'Training';

    return 'Other';
};

// Color palette for the bar segments
const getCategoryColor = (categoryName: string): string => {
    const normalized = categoryName.toLowerCase();
    if (normalized === 'conferences') return 'bg-indigo-500';
    if (normalized === 'workshops') return 'bg-violet-500';
    if (normalized === 'hackathons') return 'bg-pink-500';
    if (normalized === 'meetups') return 'bg-emerald-500';
    if (normalized === 'webinars') return 'bg-blue-500';
    if (normalized === 'training') return 'bg-amber-500';
    return 'bg-zinc-600'; // Visible gray for "Other"
};

// Get event category
const getEventCategory = (event: Event | null | undefined): string => {
    if (!event) return 'Other';

    if (event.category?.name) {
        const normalized = normalizeCategoryName(event.category.name);
        if (normalized !== 'Other') return normalized;
    }

    const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    if (text.includes('workshop') || text.includes('hands-on')) return 'Workshops';
    if (text.includes('conference') || text.includes('summit')) return 'Conferences';
    if (text.includes('meetup') || text.includes('networking')) return 'Meetups';
    if (text.includes('webinar') || text.includes('online')) return 'Webinars';
    if (text.includes('hackathon') || text.includes('hack')) return 'Hackathons';
    if (text.includes('course') || text.includes('training')) return 'Training';

    return 'Other';
};

export function EventTypeDistribution({ trackedEvents, upcomingEvents: _upcomingEvents, className = '' }: EventTypeDistributionProps) {
    const chartData = useMemo(() => {
        const eventCategories: Record<string, { count: number }> = {};

        // Process only user's tracked events (attended + attending)
        // This shows the user's personal event composition, not the database-wide distribution
        const processEvent = (event: Event | undefined) => {
            if (!event) return;
            const category = getEventCategory(event);
            if (!eventCategories[category]) {
                eventCategories[category] = { count: 0 };
            }
            eventCategories[category].count++;
        };

        // Only include user's tracked events - both attended and upcoming commitments
        trackedEvents
            .filter(e => (e.status === 'attended' || e.status === 'attending') && e.event)
            .forEach(e => processEvent(e.event!));

        // Convert to array
        return Object.entries(eventCategories)
            .map(([name, data]) => ({
                name,
                count: data.count,
                colorClass: getCategoryColor(name),
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [trackedEvents]);

    const totalEvents = chartData.reduce((sum, item) => sum + item.count, 0);
    const dataWithPercentages = chartData.map(item => ({
        ...item,
        percentage: totalEvents > 0 ? (item.count / totalEvents) * 100 : 0
    }));

    // Show top 4 categories in the grid, group others if necessary? 
    // For now, let's just show top 4 to keep it clean, as usually there aren't many distinct types for a single user.
    const displayItems = dataWithPercentages.slice(0, 4);

    return (
        <div className={`bg-transparent border border-white/[0.08] rounded-md p-5 flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-semibold text-zinc-500 tracking-wide">
                    Your Event Mix
                </h3>
                <div className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] text-zinc-400 font-mono">
                    {totalEvents} Total
                </div>
            </div>

            {/* Visual Stacked Bar */}
            <div className="flex w-full h-2 rounded-full overflow-hidden mb-6 bg-zinc-800/50">
                {dataWithPercentages.map((item, index) => (
                    <React.Fragment key={item.name}>
                        <div
                            style={{ width: `${item.percentage}%` }}
                            className={`${item.colorClass} transition-all duration-500`}
                            title={`${item.name}: ${item.count} (${item.percentage.toFixed(0)}%)`}
                        />
                        {/* 1px separator, but not after the last item */}
                        {index < dataWithPercentages.length - 1 && (
                            <div className="w-px bg-black/20 flex-shrink-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-2 gap-4">
                {displayItems.map((item) => (
                    <div key={item.name}>
                        <div className="text-2xl font-medium text-white mb-1 tracking-tight">
                            {item.percentage.toFixed(0)}%
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.colorClass}`} />
                            <span className="text-xs text-zinc-500 tracking-wide truncate">
                                {item.name}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {dataWithPercentages.length === 0 && (
                <div className="text-center py-4 text-xs text-zinc-500 italic">
                    No events data available
                </div>
            )}
        </div>
    );
}
