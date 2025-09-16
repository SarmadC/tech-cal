'use client';

import { FC } from 'react';
import { ClockIcon, CalendarIcon } from '@phosphor-icons/react';
import { Event } from '@/types';

interface SwimLaneTimelineProps {
    event: Event;
}

const SwimLaneTimeline: FC<SwimLaneTimelineProps> = ({ event }) => {
    const agenda = event.agenda || [];
    
    if (agenda.length === 0) return null;
    
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
    
    const formatTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Track Timeline
            </h3>
            
            {/* Header with track names */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${tracks.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-400 p-2">Time</div>
                {tracks.map(track => (
                    <div key={track} className="text-sm font-medium text-gray-300 p-2 text-center bg-gray-800/30 rounded">
                        {track}
                    </div>
                ))}
            </div>
            
            {/* Timeline grid */}
            <div className="space-y-1">
                {grid.map(({ time, events }) => (
                    <div key={time} className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${tracks.length}, 1fr)` }}>
                        {/* Time column */}
                        <div className="flex items-center text-sm text-gray-400 p-2">
                            <ClockIcon className="w-4 h-4 mr-2" />
                            {formatTime(time)}
                        </div>
                        
                        {/* Event columns */}
                        {events.map((item, trackIndex) => (
                            <div key={trackIndex} className="p-2">
                                {item ? (
                                    <div className="bg-gray-800/40 border border-gray-700/60 rounded p-3 min-h-[80px]">
                                        <h5 className="text-white font-medium text-sm mb-1">
                                            {item.title}
                                        </h5>
                                        {item.speaker && (
                                            <p className="text-gray-400 text-xs">
                                                {item.speaker.name}
                                            </p>
                                        )}
                                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                            {item.type}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="min-h-[80px] border border-dashed border-gray-700/30 rounded opacity-30"></div>
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