'use client';

import { FC } from 'react';
import Image from 'next/image';
import { Clock, MapPin, User, ExternalLink, Calendar, Users, UserCheck, HelpCircle, Trophy, Coffee, Music, Building } from 'lucide-react';
import { Event, AgendaItem } from '@/types';
import EventProgress from './EventProgress';
import { transformAgendaItemsToApp } from '@/utils/transformers';

interface EventAgendaProps {
    event: Event;
}

// Mock agenda data for demonstration - in a real app, this would come from the event data
// Real AWS re:Invent agenda data (sample from your database)
const realAgendaData = [
    {
        "id": "3f19e5e4-4967-4970-bbdd-4e84d72841eb",
        "event_id": "782d9d7e-54e0-41ca-84f7-df71ef7aa479",
        "day_number": 1,
        "start_time": "07:00:00",
        "end_time": "23:59:00",
        "title": "Badge pickup",
        "description": "Early badge pickup available",
        "location": "Harry Reid International Airport",
        "agenda_type": "registration",
        "duration_minutes": 1020,
        "speaker_id": null,
        "track": "logistics",
        "difficulty_level": null,
        "prerequisites": null,
        "capacity": null,
        "is_required": false,
        "sort_order": 1,
        "created_at": "2025-09-07 00:48:00.05064+00",
        "updated_at": "2025-09-07 00:48:00.05064+00"
    },
    {
        "id": "5325a404-ad50-4d71-b36f-d7e2c6f18fbc",
        "event_id": "782d9d7e-54e0-41ca-84f7-df71ef7aa479",
        "day_number": 1,
        "start_time": "10:00:00",
        "end_time": "20:00:00",
        "title": "Badge pickup and help desk",
        "description": "Main registration and assistance",
        "location": "Mandalay Bay, MGM Grand, The Venetian",
        "agenda_type": "registration",
        "duration_minutes": 600,
        "speaker_id": null,
        "track": "logistics",
        "difficulty_level": null,
        "prerequisites": null,
        "capacity": null,
        "is_required": false,
        "sort_order": 2,
        "created_at": "2025-09-07 00:48:00.05064+00",
        "updated_at": "2025-09-07 00:48:00.05064+00"
    },
    {
        "id": "f4e507d4-f1ec-44ac-b074-722629ee3fec",
        "event_id": "782d9d7e-54e0-41ca-84f7-df71ef7aa479",
        "day_number": 1,
        "start_time": "10:00:00",
        "end_time": "20:00:00",
        "title": "AWS Certification verification desk",
        "description": "Certification verification services",
        "location": "The Venetian",
        "agenda_type": "certification",
        "duration_minutes": 600,
        "speaker_id": null,
        "track": "certification",
        "difficulty_level": null,
        "prerequisites": null,
        "capacity": null,
        "is_required": false,
        "sort_order": 3,
        "created_at": "2025-09-07 00:48:00.05064+00",
        "updated_at": "2025-09-07 00:48:00.05064+00"
    },
    {
        "id": "625f0f16-2b4b-4cb4-8ebe-119dc7905739",
        "event_id": "782d9d7e-54e0-41ca-84f7-df71ef7aa479",
        "day_number": 1,
        "start_time": "10:00:00",
        "end_time": "18:00:00",
        "title": "Help desk",
        "description": "General assistance and information",
        "location": "Caesars Forum",
        "agenda_type": "support",
        "duration_minutes": 480,
        "speaker_id": null,
        "track": "logistics",
        "difficulty_level": null,
        "prerequisites": null,
        "capacity": null,
        "is_required": false,
        "sort_order": 4,
        "created_at": "2025-09-07 00:48:00.05064+00",
        "updated_at": "2025-09-07 00:48:00.05064+00"
    },
    {
        "id": "f7cbf411-6b14-4a6c-9f52-60d9de90ea98",
        "event_id": "782d9d7e-54e0-41ca-84f7-df71ef7aa479",
        "day_number": 1,
        "start_time": "10:00:00",
        "end_time": "18:00:00",
        "title": "Sports Forum",
        "description": "AWS in sports technology showcase",
        "location": "Caesars Forum",
        "agenda_type": "exhibition",
        "duration_minutes": 480,
        "speaker_id": null,
        "track": "sports",
        "difficulty_level": null,
        "prerequisites": null,
        "capacity": null,
        "is_required": false,
        "sort_order": 5,
        "created_at": "2025-09-07 00:48:00.05064+00",
        "updated_at": "2025-09-07 00:48:00.05064+00"
    }
];

// Helper to generate real agenda from database data
const generateRealAgenda = (event: Event): AgendaItem[] => {
    // Use the event's start date for the agenda items
    const eventDate = new Date(event.startTime).toISOString().split('T')[0];
    
    // Transform the real database data to app format
    const transformedData = realAgendaData.map(item => ({
        ...item,
        start_time: `${eventDate}T${item.start_time}`,
        end_time: `${eventDate}T${item.end_time}`
    }));
    
    return transformAgendaItemsToApp(transformedData);
};

const EventAgenda: FC<EventAgendaProps> = ({ event }) => {
    // Use real agenda data from database
    const agenda = generateRealAgenda(event);
    
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
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
                return <Calendar className="w-4 h-4" />;
            case 'session':
                return <Users className="w-4 h-4" />;
            case 'workshop':
                return <User className="w-4 h-4" />;
            case 'panel':
                return <Users className="w-4 h-4" />;
            case 'networking':
                return <Users className="w-4 h-4" />;
            case 'break':
                return <Clock className="w-4 h-4" />;
            case 'registration':
                return <UserCheck className="w-4 h-4" />;
            case 'certification':
                return <Trophy className="w-4 h-4" />;
            case 'support':
                return <HelpCircle className="w-4 h-4" />;
            case 'exhibition':
                return <Building className="w-4 h-4" />;
            case 'meal':
                return <Coffee className="w-4 h-4" />;
            case 'entertainment':
                return <Music className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="event-agenda space-y-6">
            <div className="event-agenda-header flex items-center justify-between mb-6">
                <h3 className="event-agenda-title flex items-center text-lg font-semibold text-white">
                    <Calendar className="w-5 h-5 mr-2" />
                    Event Agenda
                </h3>
                {event.agendaUrl && (
                    <a
                        href={event.agendaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-agenda-external-link flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Full Agenda
                    </a>
                )}
            </div>

            {/* Event Progress */}
            <EventProgress event={event} agenda={agenda} />
            
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
                                <Clock className="w-4 h-4 text-gray-300" />
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
                                        <User className="w-4 h-4" />
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
                                        <MapPin className="w-4 h-4" />
                                        <span>{item.location}</span>
                                    </div>
                                )}
                                
                                {item.tags && item.tags.length > 0 && (
                                    <div className="event-agenda-tags flex flex-wrap gap-1 mt-2">
                                        {item.tags.map((tag, tagIndex) => (
                                            <span key={tagIndex} className="event-agenda-tag px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
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
