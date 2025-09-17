'use client';

import { FC, useState, useEffect } from 'react';
import { XIcon, CalendarIcon, ClockIcon, MapPinIcon, UsersIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Event, EventType, AgendaItem, MultiDayEventInstance, TrackedEvent } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import { getSpeakerAvatarUrl } from '@/services/avatarService';
import { formatDate } from '@/utils/dateUtils';

interface MobileEventDetailPanelProps {
    event: Event | TrackedEvent | MultiDayEventInstance;
    onClose: () => void;
    categories: EventType[];
}

const MobileEventDetailPanel: FC<MobileEventDetailPanelProps> = ({ event, onClose, categories }) => {
    
    const category = categories.find(c => c.id === event?.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'agenda'>('details');

    // Fetch complete event details with agenda
    useEffect(() => {
        const fetchEventWithAgenda = async () => {
            try {
                setIsLoading(true);
                const supabase = createClient();
                const fetchEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);
                setEventWithAgenda(fullEvent);
            } catch (error) {
                console.warn('Failed to fetch event agenda, using basic event data:', error);
                setEventWithAgenda(event);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventWithAgenda();
    }, [event.id, event]);

    // Handle case where event might be undefined or malformed
    if (!event) {
        console.error('MobileEventDetailPanel: No event provided');
        return null;
    }

    const displayEvent = eventWithAgenda || event;
    const agenda = displayEvent.agenda || [];
    

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

    const formatEventTime = (startTime: string, endTime: string, timezone?: string) => {
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            // Check if dates are valid
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return {
                    date: 'TBD',
                    time: 'TBD',
                    duration: 0
                };
            }
            
            return {
                date: formatDate(startTime, timezone),
                time: `${safeFormatTime(startTime)} - ${safeFormatTime(endTime)}`,
                duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60))
            };
        } catch (error) {
            console.warn('Error formatting event time:', { startTime, endTime, timezone }, error);
            return {
                date: 'TBD',
                time: 'TBD',
                duration: 0
            };
        }
    };

    const eventTime = formatEventTime(
        displayEvent.startTime || '', 
        displayEvent.endTime || '', 
        displayEvent.timezone || undefined
    );

    return (
        <div className="mobile-event-detail-panel fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--background-main)] border-b border-[var(--border-default)] px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Event Details</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <XIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex mt-3 bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('details');
                        }}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'details'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Details
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('agenda');
                        }}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'agenda'
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Agenda ({agenda.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-[var(--background-main)]">
                {activeTab === 'details' ? (
                    <div className="p-4 space-y-6">
                        {/* Event Title */}
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">{displayEvent.title}</h1>
                            {category && (
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                                        {category.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Event Info */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-white font-medium">{eventTime.date}</div>
                                    <div className="text-gray-400 text-sm">{eventTime.time}</div>
                                    <div className="text-gray-500 text-xs">{eventTime.duration} minutes</div>
                                </div>
                            </div>

                            {displayEvent.location && (
                                <div className="flex items-start gap-3">
                                    <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-white font-medium">Location</div>
                                        <div className="text-gray-400 text-sm">{displayEvent.location}</div>
                                    </div>
                                </div>
                            )}

                            {displayEvent.organizer && (
                                <div className="flex items-start gap-3">
                                    <UsersIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-white font-medium">Organizer</div>
                                        <div className="text-gray-400 text-sm">{displayEvent.organizer}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {displayEvent.description && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                                <p className="text-gray-300 leading-relaxed">{displayEvent.description}</p>
                            </div>
                        )}

                        {/* Speakers */}
                        {(() => {
                            const allSpeakers = new Set();
                            if (displayEvent.speakerLineup) {
                                displayEvent.speakerLineup.forEach(speaker => allSpeakers.add(speaker.id));
                            }
                            if (agenda) {
                                agenda.forEach(item => {
                                    if (item.speaker) allSpeakers.add(item.speaker.id);
                                    if (item.speakers) {
                                        item.speakers.forEach(sp => allSpeakers.add(sp.id));
                                    }
                                });
                            }
                            
                            const speakers = Array.from(allSpeakers).map(id => {
                                if (displayEvent.speakerLineup) {
                                    const speaker = displayEvent.speakerLineup.find(s => s.id === id);
                                    if (speaker) return speaker;
                                }
                                if (agenda) {
                                    for (const item of agenda) {
                                        if (item.speaker && item.speaker.id === id) return item.speaker;
                                        if (item.speakers) {
                                            const speaker = item.speakers.find(s => s.id === id);
                                            if (speaker) return speaker;
                                        }
                                    }
                                }
                                return null;
                            }).filter(Boolean);

                            if (speakers.length === 0) return null;

                            return (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3">Speakers ({speakers.length})</h3>
                                    <div className="space-y-3">
                                        {speakers.map((speaker, index) => {
                                            if (!speaker) return null;
                                            const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                            return (
                                            <div 
                                                key={speaker.id || index} 
                                                className={`flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg ${
                                                    hasLinkedIn ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : ''
                                                }`}
                                                onClick={() => {
                                                    if (hasLinkedIn) {
                                                        window.open(speaker.socialLinks!.linkedin, '_blank', 'noopener,noreferrer');
                                                    }
                                                }}
                                                title={hasLinkedIn ? `View ${speaker.name}'s LinkedIn profile` : speaker.name}
                                            >
                                                <img 
                                                    src={getSpeakerAvatarUrl(speaker, 40)} 
                                                    alt={speaker.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-600"
                                                    onError={(e) => {
                                                        const target = e.currentTarget as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-white text-sm">{speaker.name}</div>
                                                    {speaker.title && (
                                                        <div className="text-xs text-gray-400 truncate">{speaker.title}</div>
                                                    )}
                                                    {speaker.company && (
                                                        <div className="text-xs text-gray-500 truncate">{speaker.company}</div>
                                                    )}
                                                </div>
                                                {hasLinkedIn && (
                                                    <div className="text-gray-400 text-xs">
                                                        <ArrowSquareOutIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-gray-400 text-sm">Loading agenda...</div>
                            </div>
                        ) : agenda.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                <p className="text-gray-400 text-sm">No agenda available for this event.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white mb-4">Event Agenda</h3>
                                {agenda.map((item, index) => (
                                    <div key={item.id || index} className="bg-gray-800/50 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <ClockIcon className="w-4 h-4" />
                                                <span>
                                                    {safeFormatTime(item.startTime)} - {safeFormatTime(item.endTime)}
                                                </span>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded">
                                                {item.type}
                                            </span>
                                        </div>
                                        
                                        <h4 className="text-white font-medium mb-2">{item.title}</h4>
                                        
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
                                                <div className="text-xs font-medium text-gray-400">
                                                    Speaker{(item.speakers?.length || 0) > 1 ? 's' : ''}
                                                </div>
                                                {Array.isArray(item.speakers) && item.speakers.length > 0 ? (
                                                    item.speakers.map((speaker, speakerIndex) => {
                                                        const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                                        return (
                                                        <div 
                                                            key={speaker.id || speakerIndex} 
                                                            className={`flex items-center gap-2 ${
                                                                hasLinkedIn ? 'cursor-pointer hover:bg-gray-700/30 rounded px-1 py-0.5 transition-colors' : ''
                                                            }`}
                                                            onClick={() => {
                                                                if (hasLinkedIn) {
                                                                    window.open(speaker.socialLinks!.linkedin, '_blank', 'noopener,noreferrer');
                                                                }
                                                            }}
                                                            title={hasLinkedIn ? `View ${speaker.name}'s LinkedIn profile` : speaker.name}
                                                        >
                                                            <img 
                                                                src={getSpeakerAvatarUrl(speaker, 24)} 
                                                                alt={speaker.name}
                                                                className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                                                onError={(e) => {
                                                                    const target = e.currentTarget as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                }}
                                                            />
                                                            <span className="text-sm text-gray-300">{speaker.name}</span>
                                                            {hasLinkedIn && (
                                                                <ArrowSquareOutIcon className="w-3 h-3 text-gray-400" />
                                                            )}
                                                        </div>
                                                        );
                                                    })
                                                ) : item.speaker && (
                                                    <div 
                                                        className={`flex items-center gap-2 ${
                                                            item.speaker.socialLinks?.linkedin ? 'cursor-pointer hover:bg-gray-700/30 rounded px-1 py-0.5 transition-colors' : ''
                                                        }`}
                                                        onClick={() => {
                                                            if (item.speaker?.socialLinks?.linkedin) {
                                                                window.open(item.speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
                                                            }
                                                        }}
                                                        title={item.speaker.socialLinks?.linkedin ? `View ${item.speaker.name}'s LinkedIn profile` : item.speaker.name}
                                                    >
                                                        <img 
                                                            src={getSpeakerAvatarUrl(item.speaker, 24)} 
                                                            alt={item.speaker.name}
                                                            className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                                            onError={(e) => {
                                                                const target = e.currentTarget as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                        <span className="text-sm text-gray-300">{item.speaker.name}</span>
                                                        {item.speaker.socialLinks?.linkedin && (
                                                            <ArrowSquareOutIcon className="w-3 h-3 text-gray-400" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileEventDetailPanel;
