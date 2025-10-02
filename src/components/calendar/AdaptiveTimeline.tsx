'use client';

import { FC, useMemo } from 'react';
import { CalendarIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import TimelineView from './TimelineView';

interface AdaptiveTimelineProps {
    event: Event;
}

const AdaptiveTimeline: FC<AdaptiveTimelineProps> = ({ event }) => {
    const theme = useTimelineTheme();
    
    // Simple analysis for display purposes only
    const analysis = useMemo(() => {
        const agenda = event.agenda || [];
        if (agenda.length === 0) return null;
        
        // Group by time slots to find max concurrent events
        const timeSlots = agenda.reduce((acc, item) => {
            const timeKey = `${item.startTime}-${item.endTime}`;
            if (!acc[timeKey]) acc[timeKey] = [];
            acc[timeKey].push(item);
            return acc;
        }, {} as Record<string, AgendaItem[]>);
        
        const maxConcurrent = Math.max(...Object.values(timeSlots).map(events => events.length));
        const trackCount = new Set(agenda.map(item => item.track || 'general')).size;
        const dayCount = new Set(agenda.map(item => item.dayNumber || 1)).size;
        
        return {
            totalEvents: agenda.length,
            maxConcurrent,
            trackCount,
            dayCount
        };
    }, [event.agenda]);
    
    if (!analysis) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className={`w-12 h-12 ${theme.emptyStateIcon} mx-auto mb-4`} />
                <p className={`${theme.textMuted} text-sm`}>No timeline available for this event.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {/* Simple event info header */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarIcon className="w-4 h-4" />
                <span className="truncate">
                    {analysis.totalEvents} events
                    <span className="hidden sm:inline">
                        {analysis.trackCount > 1 && ` • ${analysis.trackCount} tracks`}
                        {analysis.maxConcurrent > 1 && ` • ${analysis.maxConcurrent} concurrent events`}
                    </span>
                </span>
            </div>
            
            {/* Timeline view - always use the enhanced timeline */}
            <TimelineView event={event} />
        </div>
    );
};

export default AdaptiveTimeline;