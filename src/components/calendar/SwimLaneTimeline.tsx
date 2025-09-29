'use client';

import { FC } from 'react';
import { ClockIcon, CalendarIcon } from '@phosphor-icons/react';
import { Event } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimelineTime, getTypeColor, getEmptyState } from '@/utils/timelineUtils';

interface SwimLaneTimelineProps {
    event: Event;
}

const SwimLaneTimeline: FC<SwimLaneTimelineProps> = ({ event }) => {
    const theme = useTimelineTheme();
    const agenda = event.agenda || [];
    
    if (agenda.length === 0) {
        const emptyState = getEmptyState(theme.isDark);
        return (
            <div className="text-center py-8">
                <CalendarIcon className={`w-12 h-12 mx-auto mb-4 ${emptyState.iconClass}`} />
                <p className={`text-sm ${emptyState.textClass}`}>
                    {emptyState.message}
                </p>
            </div>
        );
    }
    
    // Get unique tracks
    const tracks = [...new Set(agenda.map(item => item.track || 'Main'))];
    
    // Get time slots
    const timeSlots = [...new Set(agenda.map(item => item.startTime))].sort();
    
    // Create a grid: time x track
    const grid = timeSlots.map(time => ({
        time,
        events: tracks.map(track => 
            agenda.find(item => 
                (item.track || 'Main') === track && item.startTime === time
            )
        )
    }));
    
    const formatTime = formatTimelineTime;
    
    return (
        <div className="space-y-4">
            <h3 className={`text-lg font-semibold flex items-center ${theme.textPrimary}`}>
                <CalendarIcon className="w-5 h-5 mr-2" />
                Track Timeline
            </h3>
            
            {/* Header with track names */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${tracks.length}, 1fr)` }}>
                <div className={`text-sm font-medium p-2 ${theme.textMuted}`}>Time</div>
                {tracks.map(track => (
                    <div key={track} className={`text-sm font-medium p-2 text-center rounded ${theme.textSecondary} ${theme.bgMuted}`}>
                        {track}
                    </div>
                ))}
            </div>
            
            {/* Timeline grid */}
            <div className="space-y-1">
                {grid.map(({ time, events }) => (
                    <div key={time} className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${tracks.length}, 1fr)` }}>
                        {/* Time column */}
                        <div className={`flex items-center text-sm p-2 ${theme.textMuted}`}>
                            <ClockIcon className="w-4 h-4 mr-2" />
                            {formatTime(time)}
                        </div>
                        
                        {/* Event columns */}
                        {events.map((item, trackIndex) => (
                            <div key={trackIndex} className="p-2">
                                {item ? (
                                    <div className={`rounded p-3 min-h-[80px] ${theme.bgCard} ${theme.borderCard}`}>
                                        <h5 className={`font-medium text-sm mb-1 ${theme.textPrimary}`}>
                                            {item.title}
                                        </h5>
                                        {item.speaker && (
                                            <p className={`text-xs ${theme.textSecondary}`}>
                                                {item.speaker.name}
                                            </p>
                                        )}
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${getTypeColor(item.type, theme.isDark).background} ${getTypeColor(item.type, theme.isDark).text}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                ) : (
                                    <div className={`min-h-[80px] border border-dashed rounded opacity-30 ${theme.borderDashed}`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SwimLaneTimeline;