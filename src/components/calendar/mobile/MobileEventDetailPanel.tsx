'use client';

import { FC, useState, useEffect } from 'react';
import { XIcon, CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from '@phosphor-icons/react';
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import { getSpeakerAvatarUrl } from '@/services/avatarService';
import { formatTime, formatDate } from '@/utils/dateUtils';

interface MobileEventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const MobileEventDetailPanel: FC<MobileEventDetailPanelProps> = ({ event, onClose, categories }) => {
    const category = categories.find(c => c.id === event.eventTypeId);
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

    const displayEvent = eventWithAgenda || event;
    const agenda = displayEvent.agenda || [];

    const formatEventTime = (startTime: string, endTime: string, timezone?: string) => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        return {
            date: formatDate(startTime, timezone),
            time: `${formatTime(startTime, timezone)} - ${formatTime(endTime, timezone)}`,
            duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        };
    };

    const eventTime = formatEventTime(
        displayEvent.startTime || '', 
        displayEvent.endTime || '', 
        displayEvent.timezone || undefined
    );

    return (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--background-main)] border-b border-[var(--border-default)] px-4 py-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold font-dm-sans text-white">Event Details</h2>
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
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium font-dm-sans transition-colors ${
                            activeTab === 'details'
                                ? 'bg-gray-700 text-white font-dm-sans'
                                : 'text-gray-400 hover:text-white font-dm-sans'
                        }`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab('agenda')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium font-dm-sans transition-colors ${
                            activeTab === 'agenda'
                                ? 'bg-gray-700 text-white font-dm-sans'
                                : 'text-gray-400 hover:text-white font-dm-sans'
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
                            <h1 className="text-2xl font-bold font-dm-sans text-white mb-2">{displayEvent.title}</h1>
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
                                    <div className="text-white font-dm-sans font-medium font-dm-sans">{eventTime.date}</div>
                                    <div className="text-gray-400 text-sm">{eventTime.time}</div>
                                    <div className="text-gray-500 text-xs">{eventTime.duration} minutes</div>
                                </div>
                            </div>

                            {displayEvent.location && (
                                <div className="flex items-start gap-3">
                                    <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-white font-dm-sans font-medium font-dm-sans">Location</div>
                                        <div className="text-gray-400 text-sm">{displayEvent.location}</div>
                                    </div>
                                </div>
                            )}

                            {displayEvent.organizer && (
                                <div className="flex items-start gap-3">
                                    <UsersIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-white font-dm-sans font-medium font-dm-sans">Organizer</div>
                                        <div className="text-gray-400 text-sm">{displayEvent.organizer}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {displayEvent.description && (
                            <div>
                                <h3 className="text-lg font-semibold font-dm-sans text-white mb-3">About</h3>
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
                                    <h3 className="text-lg font-semibold font-dm-sans text-white mb-3">Speakers ({speakers.length})</h3>
                                    <div className="space-y-3">
                                        {speakers.map((speaker, index) => {
                                            if (!speaker) return null;
                                            return (
                                            <div key={speaker.id || index} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
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
                                                    <div className="font-medium font-dm-sans text-white text-sm">{speaker.name}</div>
                                                    {speaker.title && (
                                                        <div className="text-xs text-gray-400 truncate">{speaker.title}</div>
                                                    )}
                                                    {speaker.company && (
                                                        <div className="text-xs text-gray-500 truncate">{speaker.company}</div>
                                                    )}
                                                </div>
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
                                <h3 className="text-lg font-semibold font-dm-sans text-white mb-4">Event Agenda</h3>
                                {agenda.map((item, index) => (
                                    <div key={item.id || index} className="bg-gray-800/50 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <ClockIcon className="w-4 h-4" />
                                                <span>{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-medium font-dm-sans bg-gray-700 text-gray-300 rounded">
                                                {item.type}
                                            </span>
                                        </div>
                                        
                                        <h4 className="text-white font-dm-sans font-medium font-dm-sans mb-2">{item.title}</h4>
                                        
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
                                                <div className="text-xs font-medium font-dm-sans text-gray-400">
                                                    Speaker{(item.speakers?.length || 0) > 1 ? 's' : ''}
                                                </div>
                                                {Array.isArray(item.speakers) && item.speakers.length > 0 ? (
                                                    item.speakers.map((speaker, speakerIndex) => (
                                                        <div key={speaker.id || speakerIndex} className="flex items-center gap-2">
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
                                                        </div>
                                                    ))
                                                ) : item.speaker && (
                                                    <div className="flex items-center gap-2">
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
