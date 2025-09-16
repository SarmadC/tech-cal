'use client';

import { FC, useState } from 'react';
import { CalendarIcon, ClockIcon, DotsThreeIcon, MapPinIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { getSpeakerAvatarUrl } from '@/services/avatarService';

interface StackedTimelineProps {
    event: Event;
}

const StackedTimeline: FC<StackedTimelineProps> = ({ event }) => {
    const agenda = event.agenda || [];
    const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
    
    if (agenda.length === 0) return null;
    
    // Group by time slot
    const timeSlots = agenda.reduce((acc, item) => {
        const timeKey = `${item.startTime}-${item.endTime}`;
        if (!acc[timeKey]) {
            acc[timeKey] = {
                startTime: item.startTime,
                endTime: item.endTime,
                events: []
            };
        }
        acc[timeKey].events.push(item);
        return acc;
    }, {} as Record<string, { startTime: string; endTime: string; events: AgendaItem[] }>);
    
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
    
    const toggleSlot = (timeKey: string) => {
        setExpandedSlots(prev => {
            const newSet = new Set(prev);
            if (newSet.has(timeKey)) {
                newSet.delete(timeKey);
            } else {
                newSet.add(timeKey);
            }
            return newSet;
        });
    };
    
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                Stacked Timeline
            </h3>
            
            <div className="space-y-3">
                {Object.entries(timeSlots)
                    .sort(([, a], [, b]) => a.startTime.localeCompare(b.startTime))
                    .map(([timeKey, slot]) => {
                        const isExpanded = expandedSlots.has(timeKey);
                        const visibleEvents = isExpanded ? slot.events : slot.events.slice(0, 2);
                        const hiddenCount = slot.events.length - visibleEvents.length;
                        
                        return (
                            <div key={timeKey} className="relative">
                                {/* Time header */}
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>
                                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                        </span>
                                    </div>
                                    {slot.events.length > 1 && (
                                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                            {slot.events.length} options
                                        </span>
                                    )}
                                </div>
                                
                                {/* Stacked events */}
                                <div className="space-y-2">
                                    {visibleEvents.map((item, index) => (
                                        <div
                                            key={item.id || index}
                                            className="bg-gray-800/40 border border-gray-700/60 rounded-lg p-3"
                                            style={{
                                                transform: `translateX(${index * 8}px)`,
                                                zIndex: visibleEvents.length - index
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h5 className="text-white font-medium mb-1">
                                                        {item.title}
                                                    </h5>
                                                    {item.speaker && (
                                                        <div 
                                                            className={`flex items-center gap-2 text-gray-400 text-sm mb-1 ${
                                                                item.speaker.socialLinks?.linkedin ? 'hover:text-gray-300 cursor-pointer transition-colors' : ''
                                                            }`}
                                                            onClick={() => {
                                                                if (item.speaker?.socialLinks?.linkedin) {
                                                                    window.open(item.speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
                                                                }
                                                            }}
                                                            title={item.speaker.socialLinks?.linkedin ? `View ${item.speaker.name}'s LinkedIn profile` : item.speaker.name}
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img 
                                                                src={getSpeakerAvatarUrl(item.speaker, 20)} 
                                                                alt={item.speaker.name}
                                                                className="w-5 h-5 rounded-full object-cover border border-gray-600"
                                                                onError={(e) => {
                                                                    const target = e.currentTarget as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                }}
                                                            />
                                                            <span className="font-medium">{item.speaker.name}</span>
                                                        </div>
                                                    )}
                                                    {item.location && (
                                                        <div className="text-gray-500 text-xs flex items-center gap-1">
                                                            <MapPinIcon className="w-3.5 h-3.5" />
                                                            <span>{item.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded ml-2">
                                                    {item.type}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Show more/less button */}
                                    {hiddenCount > 0 && (
                                        <button
                                            onClick={() => toggleSlot(timeKey)}
                                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 p-2 rounded hover:bg-gray-800/30"
                                        >
                                            <DotsThreeIcon className="w-4 h-4" />
                                            {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default StackedTimeline;