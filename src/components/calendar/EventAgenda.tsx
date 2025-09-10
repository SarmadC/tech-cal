'use client';

import { FC } from 'react';
import Image from 'next/image';
import { ClockIcon, MapPinIcon, UserIcon, ArrowSquareOutIcon, CalendarIcon, UsersIcon, CheckCircleIcon, QuestionIcon, CertificateIcon, CoffeeIcon, MusicNotesIcon, BuildingsIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import EventProgress from './EventProgress';

interface EventAgendaProps {
    event: Event;
}

// Helper to get agenda data from event
const getEventAgenda = (event: Event): AgendaItem[] => {
    // Use the event's agenda if available
    if (event.agenda && event.agenda.length > 0) {
        return event.agenda;
    }
    
    // Fallback: return empty array if no agenda data
    return [];
};

const EventAgenda: FC<EventAgendaProps> = ({ event }) => {
    // Use the event's agenda data
    const agenda = getEventAgenda(event);
    
    const formatTime = (timeString: string) => {
        // Handle time-only strings (e.g., "06:00:00") and full datetime strings
        if (timeString.includes('T') || timeString.includes(' ')) {
            // Full datetime string
            return new Date(timeString).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
            // Time-only string (e.g., "06:00:00")
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    };
    
    const getTypeColor = (type: AgendaItem['type']) => {
        switch (type) {
            case 'keynote':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            case 'session':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'workshop':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'panel':
                return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
            case 'networking':
                return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
            case 'break':
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
            case 'registration':
                return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
            case 'certification':
                return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'support':
                return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
            case 'exhibition':
                return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'meal':
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'entertainment':
                return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };
    
    const getTypeIcon = (type: AgendaItem['type']) => {
        switch (type) {
            case 'keynote':
                return <CalendarIcon className="w-4 h-4" />;
            case 'session':
                return <UsersIcon className="w-4 h-4" />;
            case 'workshop':
                return <UserIcon className="w-4 h-4" />;
            case 'panel':
                return <UsersIcon className="w-4 h-4" />;
            case 'networking':
                return <UsersIcon className="w-4 h-4" />;
            case 'break':
                return <ClockIcon className="w-4 h-4" />;
            case 'registration':
                return <CheckCircleIcon className="w-4 h-4" />;
            case 'certification':
                return <CertificateIcon className="w-4 h-4" />;
            case 'support':
                return <QuestionIcon className="w-4 h-4" />;
            case 'exhibition':
                return <BuildingsIcon className="w-4 h-4" />;
            case 'meal':
                return <CoffeeIcon className="w-4 h-4" />;
            case 'entertainment':
                return <MusicNotesIcon className="w-4 h-4" />;
            default:
                return <ClockIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="event-agenda space-y-6">
            <div className="event-agenda-header flex items-center justify-between mb-6">
                <h3 className="event-agenda-title flex items-center text-lg font-semibold text-white">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Event Agenda
                </h3>
                {event.agendaUrl && (
                    <a
                        href={event.agendaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-agenda-external-link flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <ArrowSquareOutIcon className="w-4 h-4 mr-1" />
                        View Full Agenda
                    </a>
                )}
            </div>

            {/* Event Progress */}
            <EventProgress event={event} agenda={agenda} />
            
            {/* Show agenda items or fallback message */}
            {agenda.length > 0 ? (
                <div className="event-agenda-items space-y-4">
                    {agenda.map((item, index) => (
                    <div key={item.id} className="event-agenda-item relative">
                        {/* Timeline connector */}
                        {index < agenda.length - 1 && (
                            <div className="absolute left-4 top-12 w-0.5 h-8 bg-gray-600" />
                        )}
                        
                        <div className="event-agenda-item-content flex items-start space-x-4">
                            {/* Time indicator */}
                            <div className="event-agenda-time-indicator flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                                <ClockIcon className="w-4 h-4 text-gray-300" />
                            </div>
                            
                            {/* Content */}
                            <div className="event-agenda-details flex-1 min-w-0">
                                <div className="event-agenda-meta flex items-center space-x-2 mb-2">
                                    <span className="event-agenda-time text-sm text-gray-400">
                                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                    </span>
                                    <span className={`event-agenda-type-badge ${item.type} px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(item.type)}`}>
                                        {getTypeIcon(item.type)}
                                        <span className="ml-1 capitalize">{item.type}</span>
                                    </span>
                                </div>
                                
                                <h4 className="event-agenda-item-title text-white font-medium mb-1">{item.title}</h4>
                                
                                {item.description && (
                                    <p className="event-agenda-item-description text-sm text-gray-300 mb-2">{item.description}</p>
                                )}
                                
                                {item.speaker && (
                                    <div className="event-agenda-speaker flex items-center space-x-2 text-sm text-gray-400">
                                        <UserIcon className="w-4 h-4" />
                                        <span>{item.speaker.name}</span>
                                        {item.speaker.title && (
                                            <>
                                                <span>•</span>
                                                <span>{item.speaker.title}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                
                                {item.location && (
                                    <div className="event-agenda-location flex items-center space-x-2 text-sm text-gray-400 mt-1">
                                        <MapPinIcon className="w-4 h-4" />
                                        <span>{item.location}</span>
                                    </div>
                                )}
                                
                                {item.tags && item.tags.length > 0 && (
                                    <div className="event-agenda-tags flex flex-wrap gap-1 mt-2">
                                        {item.tags.map((tag, tagIndex) => (
                                            <span key={tagIndex} className="event-agenda-tag px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="event-agenda-empty text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">
                        No agenda details available for this event.
                    </p>
                    {event.agendaUrl && (
                        <a
                            href={event.agendaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center mt-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        >
                            <ArrowSquareOutIcon className="w-4 h-4 mr-1" />
                            Check event website for agenda
                        </a>
                    )}
                </div>
            )}
            
            {event.speakerLineup && event.speakerLineup.length > 0 && (
                <div className="event-agenda-speakers mt-6 pt-6 border-t border-gray-700">
                    <h4 className="event-agenda-speakers-title text-md font-semibold text-white mb-4">Featured Speakers</h4>
                    <div className="event-agenda-speakers-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {event.speakerLineup.slice(0, 3).map((speaker) => (
                            <div key={speaker.id} className="event-agenda-speaker-card flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                                {speaker.photoUrl && (
                                    <Image
                                        src={speaker.photoUrl}
                                        alt={speaker.name}
                                        width={40}
                                        height={40}
                                        className="event-agenda-speaker-photo w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    />
                                )}
                                <div className="event-agenda-speaker-info flex-1 min-w-0">
                                    <h5 className="event-agenda-speaker-name text-white font-medium">{speaker.name}</h5>
                                    {speaker.title && (
                                        <p className="event-agenda-speaker-title text-sm text-gray-400">{speaker.title}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventAgenda;
