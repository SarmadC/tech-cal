'use client';

import { FC } from 'react';
import { CalendarIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';

interface GanttTimelineProps {
    event: Event;
}

const GanttTimeline: FC<GanttTimelineProps> = ({ event }) => {
    const agenda = event.agenda || [];
    
    if (agenda.length === 0) return null;
    
    // Convert time to minutes for positioning
    const toMinutes = (timeString: string): number => {
        const [h, m] = timeString.split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    };
    
    // Get time bounds
    const startTimes = agenda.map(item => toMinutes(item.startTime));
    const endTimes = agenda.map(item => toMinutes(item.endTime));
    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);
    const totalMinutes = maxTime - minTime;
    
    // Group overlapping events into lanes
    const lanes: AgendaItem[][] = [];
    const sortedAgenda = [...agenda].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    
    for (const item of sortedAgenda) {
        const itemStart = toMinutes(item.startTime);
        const itemEnd = toMinutes(item.endTime);
        
        // Find the first lane where this item fits
        let placed = false;
        for (const lane of lanes) {
            const conflicts = lane.some(existing => {
                const existingStart = toMinutes(existing.startTime);
                const existingEnd = toMinutes(existing.endTime);
                return itemStart < existingEnd && existingStart < itemEnd;
            });
            
            if (!conflicts) {
                lane.push(item);
                placed = true;
                break;
            }
        }
        
        if (!placed) {
            lanes.push([item]);
        }
    }
    
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
    
    const getTypeColor = (type: AgendaItem['type']) => {
        const colors: Record<AgendaItem['type'], string> = {
            keynote: 'bg-blue-500',
            session: 'bg-green-500',
            workshop: 'bg-purple-500',
            break: 'bg-orange-500',
            networking: 'bg-pink-500',
            panel: 'bg-teal-500',
            registration: 'bg-indigo-500',
            certification: 'bg-yellow-500',
            support: 'bg-cyan-500',
            exhibition: 'bg-violet-500',
            meal: 'bg-amber-500',
            entertainment: 'bg-rose-500',
            other: 'bg-gray-500'
        };
        return colors[type] || 'bg-gray-500';
    };
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Schedule Overview
            </h3>
            
            {/* Time ruler */}
            <div className="relative">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{formatTime(`${Math.floor(minTime / 60)}:${String(minTime % 60).padStart(2, '0')}`)}</span>
                    <span>{formatTime(`${Math.floor(maxTime / 60)}:${String(maxTime % 60).padStart(2, '0')}`)}</span>
                </div>
                <div className="h-px bg-gray-700 mb-4"></div>
                
                {/* Event lanes */}
                <div className="space-y-2">
                    {lanes.map((lane, laneIndex) => (
                        <div key={laneIndex} className="relative h-12">
                            {lane.map((item, itemIndex) => {
                                const start = toMinutes(item.startTime);
                                const end = toMinutes(item.endTime);
                                const leftPercent = ((start - minTime) / totalMinutes) * 100;
                                const widthPercent = ((end - start) / totalMinutes) * 100;
                                
                                return (
                                    <div
                                        key={itemIndex}
                                        className={`absolute top-0 h-10 rounded ${getTypeColor(item.type)} flex items-center px-2 text-white text-xs font-medium group cursor-pointer`}
                                        style={{
                                            left: `${leftPercent}%`,
                                            width: `${widthPercent}%`,
                                            minWidth: '120px'
                                        }}
                                    >
                                        <div className="truncate">
                                            {item.title}
                                        </div>
                                        
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                            <div className="font-medium">{item.title}</div>
                                            <div className="text-gray-300">
                                                {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                            </div>
                                            {item.location && (
                                                <div className="text-gray-400">{item.location}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GanttTimeline;