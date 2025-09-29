'use client';

import { FC, useState } from 'react';
import { CalendarIcon, ClockIcon, DotsThreeIcon, MapPinIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimelineTime, getTypeColor, getEmptyState, getSpeakerAvatarUrl } from '@/utils/timelineUtils';

interface StackedTimelineProps {
    event: Event;
}

const StackedTimeline: FC<StackedTimelineProps> = ({ event }) => {
    const theme = useTimelineTheme();
    const agenda = event.agenda || [];
    const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
    
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
    
    const formatTime = formatTimelineTime;
    
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
            <h3 className={`text-lg font-semibold flex items-center ${theme.textPrimary}`}>
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
                                    <div className={`flex items-center gap-2 text-sm ${theme.textMuted}`}>
                                        <ClockIcon className="w-4 h-4" />
                                        <span>
                                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                        </span>
                                    </div>
                                    {slot.events.length > 1 && (
                                        <span className={`px-2 py-0.5 text-xs rounded ${
                                            theme.isDark 
                                                ? 'bg-blue-500/20 text-blue-300' 
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {slot.events.length} options
                                        </span>
                                    )}
                                </div>
                                
                                {/* Stacked events */}
                                <div className="space-y-2">
                                    {visibleEvents.map((item, index) => (
                                        <div
                                            key={item.id || index}
                                            className={`rounded-lg p-3 ${theme.bgCard} ${theme.borderCard}`}
                                            style={{
                                                transform: `translateX(${index * 8}px)`,
                                                zIndex: visibleEvents.length - index
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h5 className={`font-medium mb-1 ${theme.textPrimary}`}>
                                                        {item.title}
                                                    </h5>
                                                    {item.speaker && (
                                                        <div 
                                                            className={`flex items-center gap-2 text-sm mb-1 ${theme.textSecondary} ${item.speaker.socialLinks?.linkedin ? `${theme.hoverText} cursor-pointer transition-colors` : ''}`}
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
                                                                className={`w-5 h-5 rounded-full object-cover border ${theme.borderLight}`}
                                                                onError={(e) => {
                                                                    const target = e.currentTarget as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                }}
                                                            />
                                                            <span className="font-medium">{item.speaker.name}</span>
                                                        </div>
                                                    )}
                                                    {item.location && (
                                                        <div className={`text-xs flex items-center gap-1 ${theme.textMuted}`}>
                                                            <MapPinIcon className="w-3.5 h-3.5" />
                                                            <span>{item.location}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-1 text-xs rounded ml-2 ${getTypeColor(item.type, theme.isDark).background} ${getTypeColor(item.type, theme.isDark).text}`}>
                                                    {item.type}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Show more/less button */}
                                    {hiddenCount > 0 && (
                                        <button
                                            onClick={() => toggleSlot(timeKey)}
                                            className={`flex items-center gap-2 text-sm p-2 rounded transition-colors ${theme.textMuted} ${theme.hoverText} ${theme.hoverCard}`}
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