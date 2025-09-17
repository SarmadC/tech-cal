'use client';

import { FC, useState } from 'react';
import { ClockIcon, MapPinIcon, UserIcon, UsersIcon, CalendarIcon, CaretDownIcon, CaretRightIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { getSpeakerAvatarUrl } from '@/services/avatarService';

interface MobileTimelineViewProps {
    event: Event;
}

const MobileTimelineView: FC<MobileTimelineViewProps> = ({ event }) => {
    const agenda = event.agenda || [];
    const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1])); // Expand first day by default

    // Helper function to safely format time values
    const safeFormatTime = (timeString: string | undefined | null): string => {
        if (!timeString || timeString.trim() === '') {
            return 'TBD';
        }
        
        try {
            // Handle different time formats
            let date: Date;
            
            // If it's a time-only string (HH:MM or HH:MM:SS format)
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeString.trim())) {
                // Create a date with today's date and the time
                const today = new Date();
                const timeParts = timeString.split(':');
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);
                const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
                
                date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, seconds);
                
                // Format directly without using formatTime
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
            } else {
                // Try to parse as a full date string
                date = new Date(timeString);
                
                if (isNaN(date.getTime())) {
                    console.warn('Invalid time string:', timeString);
                    return 'TBD';
                }
                
                // Format directly without using formatTime
                return date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
            }
        } catch (error) {
            console.warn('Error formatting time string:', timeString, error);
            return 'TBD';
        }
    };

    if (agenda.length === 0) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No timeline available for this event.</p>
            </div>
        );
    }

    const toggleDay = (day: number) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(day)) {
                newSet.delete(day);
            } else {
                newSet.add(day);
            }
            return newSet;
        });
    };

    const groupedByDay = agenda.reduce((acc, item) => {
        const day = item.dayNumber || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
    }, {} as Record<number, AgendaItem[]>);

    const getTypeColor = (type: AgendaItem['type']) => {
        switch (type) {
            case 'keynote':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'session':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'workshop':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            case 'break':
                return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
            case 'networking':
                return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const renderEventCard = (item: AgendaItem) => (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <ClockIcon className="w-4 h-4" />
                    <span>{safeFormatTime(item.startTime)} - {safeFormatTime(item.endTime)}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getTypeColor(item.type)}`}>
                    {item.type}
                </span>
            </div>
            
            <h5 className="text-white font-medium mb-2">{item.title}</h5>
            
            {item.description && (
                <p className="text-gray-300 text-sm mb-3">{item.description}</p>
            )}
            
            {item.location && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{item.location}</span>
                </div>
            )}
            
            {(item.speaker || (Array.isArray(item.speakers) && item.speakers.length > 0)) && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                        {Array.isArray(item.speakers) && item.speakers.length > 1 ? (
                            <UsersIcon className="w-3.5 h-3.5" />
                        ) : (
                            <UserIcon className="w-3.5 h-3.5" />
                        )}
                        <span>Speaker{(item.speakers?.length || 0) > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="space-y-2">
                        {Array.isArray(item.speakers) && item.speakers.length > 0 ? (
                            item.speakers.map((speaker, index) => {
                                const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                return (
                                <div 
                                    key={speaker.id || index} 
                                    className={`flex items-center gap-3 p-2 bg-gray-700/40 rounded-lg ${
                                        hasLinkedIn ? 'cursor-pointer hover:bg-gray-600/40 transition-colors' : ''
                                    }`}
                                    onClick={() => {
                                        if (hasLinkedIn) {
                                            window.open(speaker.socialLinks!.linkedin, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    title={hasLinkedIn ? `View ${speaker.name}'s LinkedIn profile` : speaker.name}
                                >
                                    <img 
                                        src={getSpeakerAvatarUrl(speaker, 32)} 
                                        alt={speaker.name}
                                        className="w-8 h-8 rounded-full object-cover border border-gray-500"
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white text-sm truncate">{speaker.name}</div>
                                        {speaker.title && (
                                            <div className="text-xs text-gray-400 truncate">{speaker.title}</div>
                                        )}
                                        {speaker.company && (
                                            <div className="text-xs text-gray-500 truncate">{speaker.company}</div>
                                        )}
                                    </div>
                                    {hasLinkedIn && (
                                        <ArrowSquareOutIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                </div>
                                );
                            })
                        ) : item.speaker && (
                            <div 
                                className={`flex items-center gap-3 p-2 bg-gray-700/40 rounded-lg ${
                                    item.speaker.socialLinks?.linkedin ? 'cursor-pointer hover:bg-gray-600/40 transition-colors' : ''
                                }`}
                                onClick={() => {
                                    if (item.speaker?.socialLinks?.linkedin) {
                                        window.open(item.speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                                title={item.speaker.socialLinks?.linkedin ? `View ${item.speaker.name}'s LinkedIn profile` : item.speaker.name}
                            >
                                <img 
                                    src={getSpeakerAvatarUrl(item.speaker, 32)} 
                                    alt={item.speaker.name}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-500"
                                    onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white text-sm truncate">{item.speaker.name}</div>
                                    {item.speaker.title && (
                                        <div className="text-xs text-gray-400 truncate">{item.speaker.title}</div>
                                    )}
                                    {item.speaker.company && (
                                        <div className="text-xs text-gray-500 truncate">{item.speaker.company}</div>
                                    )}
                                </div>
                                {item.speaker.socialLinks?.linkedin && (
                                    <ArrowSquareOutIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {Object.entries(groupedByDay)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([day, dayItems]) => {
                    const dayNumber = parseInt(day);
                    const isExpanded = expandedDays.has(dayNumber);
                    const sortedItems = dayItems.sort((a, b) => {
                        const timeA = new Date(`2000-01-01T${a.startTime}`);
                        const timeB = new Date(`2000-01-01T${b.startTime}`);
                        return timeA.getTime() - timeB.getTime();
                    });

                    return (
                        <div key={day} className="border border-gray-700/60 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleDay(dayNumber)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/60 hover:bg-gray-900/80"
                            >
                                <div className="flex items-center gap-3">
                                    <CalendarIcon className="w-5 h-5 text-gray-300" />
                                    <span className="text-white font-semibold">Day {day}</span>
                                    <span className="text-xs text-gray-400">{sortedItems.length} events</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                        <CaretDownIcon className="w-5 h-5 text-gray-300" />
                                    ) : (
                                        <CaretRightIcon className="w-5 h-5 text-gray-300" />
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-4 bg-gray-800/20">
                                    {sortedItems.map((item, index) => (
                                        <div key={item.id || index}>
                                            {renderEventCard(item)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
};

export default MobileTimelineView;
