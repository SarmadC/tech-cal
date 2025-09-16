'use client';

import React, { FC, useState } from 'react';
import { CalendarIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { getSpeakerAvatarUrl } from '@/services/avatarService';

interface MatrixTimelineProps {
    event: Event;
}

const MatrixTimeline: FC<MatrixTimelineProps> = ({ event }) => {
    const agenda = event.agenda || [];
    const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);
    const [visibleTracks, setVisibleTracks] = useState<Set<string>>(new Set());
    
    if (agenda.length === 0) return null;
    
    // Get unique time slots and tracks
    const timeSlots = [...new Set(agenda.map(item => `${item.startTime}-${item.endTime}`))].sort();
    const allTracks = [...new Set(agenda.map(item => item.track || 'General'))].sort();
    
    // Initialize visible tracks if not set
    if (visibleTracks.size === 0 && allTracks.length > 0) {
        setVisibleTracks(new Set(allTracks.slice(0, Math.min(3, allTracks.length)))); // Show first 3 tracks by default
    }
    
    const tracks = allTracks.filter(track => visibleTracks.has(track));
    
    // Create matrix
    const matrix = timeSlots.map(timeSlot => {
        const [startTime, endTime] = timeSlot.split('-');
        return {
            timeSlot,
            startTime,
            endTime,
            events: tracks.map(track => 
                agenda.find(item => 
                    `${item.startTime}-${item.endTime}` === timeSlot && 
                    (item.track || 'General') === track
                )
            )
        };
    });
    
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
    
    const getEventColor = (type: AgendaItem['type']) => {
        const colors: Record<AgendaItem['type'], string> = {
            keynote: 'bg-red-500/80',
            session: 'bg-blue-500/80',
            workshop: 'bg-green-500/80',
            break: 'bg-yellow-500/80',
            networking: 'bg-purple-500/80',
            panel: 'bg-teal-500/80',
            registration: 'bg-indigo-500/80',
            certification: 'bg-yellow-500/80',
            support: 'bg-cyan-500/80',
            exhibition: 'bg-violet-500/80',
            meal: 'bg-amber-500/80',
            entertainment: 'bg-rose-500/80',
            other: 'bg-gray-500/80'
        };
        return colors[type] || 'bg-gray-500/80';
    };

    const formatTrackName = (track: string): string => {
        // Handle common track name patterns
        const trackMappings: Record<string, string> = {
            'ai_adoption': 'AI Adoption',
            'ai_creativity': 'AI Creativity',
            'collaborative_intelligence': 'Collaborative Intelligence',
            'frontier_ai': 'Frontier AI',
            'future_gazing': 'Future Gazing',
            'innovation_insights': 'Innovation Insights',
            'intelligent_learning': 'Intelligent Learning',
            'logistics': 'Logistics',
            'main_stage': 'Main Stage',
            'moonshot': 'Moonshot',
            'tech_talks': 'Tech Talks',
            'workshops': 'Workshops',
            'general': 'General'
        };

        // Return mapped name if exists, otherwise convert snake_case to Title Case
        if (trackMappings[track]) {
            return trackMappings[track];
        }

        // Convert snake_case to Title Case
        return track
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };
    
    // Group events by hour for more compact display
    const groupedMatrix = matrix.reduce((acc, row) => {
        const hour = parseInt(row.startTime.split(':')[0]);
        const hourKey = `${hour}:00`;
        
        if (!acc[hourKey]) {
            acc[hourKey] = {
                timeSlot: hourKey,
                startTime: `${hour.toString().padStart(2, '0')}:00`,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                events: tracks.map(() => null),
                subEvents: []
            };
        }
        
        // Find which track this event belongs to
        const trackIndex = tracks.findIndex(track => row.events.some(event => event && (event.track || 'General') === track));
        if (trackIndex !== -1 && row.events[trackIndex]) {
            if (acc[hourKey].events[trackIndex]) {
                // If there's already an event in this track for this hour, add to subEvents
                acc[hourKey].subEvents.push(row.events[trackIndex]);
            } else {
                acc[hourKey].events[trackIndex] = row.events[trackIndex];
            }
        }
        
        return acc;
    }, {} as Record<string, {
        timeSlot: string;
        startTime: string;
        endTime: string;
        events: (AgendaItem | null)[];
        subEvents: AgendaItem[];
    }>);

    const groupedRows = Object.values(groupedMatrix);

    const toggleTrack = (track: string) => {
        setVisibleTracks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(track)) {
                newSet.delete(track);
            } else {
                newSet.add(track);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold text-white flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Schedule Matrix
                </h3>
                
                {/* Track Filter */}
                {allTracks.length > 3 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400">Tracks:</span>
                        <div className="flex flex-wrap gap-1">
                            {allTracks.map(track => (
                                <button
                                    key={track}
                                    onClick={() => toggleTrack(track)}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                        visibleTracks.has(track)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {formatTrackName(track)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Summary */}
            {visibleTracks.size !== allTracks.length && (
                <div className="text-xs text-gray-400 bg-gray-800/30 rounded p-2">
                    Showing {visibleTracks.size} of {allTracks.length} tracks. 
                    <button 
                        onClick={() => setVisibleTracks(new Set(allTracks))}
                        className="ml-1 text-blue-400 hover:text-blue-300 underline"
                    >
                        Show all tracks
                    </button>
                </div>
            )}
            
            <div className="overflow-x-auto">
                <div className="grid gap-0.5 min-w-max" style={{ gridTemplateColumns: `100px repeat(${tracks.length}, 140px)` }}>
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-10 p-2 text-xs font-medium text-gray-400 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
                        Time
                    </div>
                    {tracks.map(track => (
                        <div key={track} className="sticky top-0 z-10 p-2 text-xs font-medium text-gray-300 text-center bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 rounded-t">
                            {formatTrackName(track)}
                        </div>
                    ))}
                    
                    {/* Matrix rows */}
                    {groupedRows.map(({ timeSlot, startTime, endTime, events }) => (
                        <React.Fragment key={timeSlot}>
                            {/* Time column */}
                            <div className="p-1.5 text-xs text-gray-400 flex items-center bg-gray-900/30 border-r border-gray-700/30">
                                <ClockIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                <div className="truncate">
                                    <div className="font-medium">{formatTime(startTime)}</div>
                                    <div className="text-gray-500 text-[10px]">{formatTime(endTime)}</div>
                                </div>
                            </div>
                            
                            {/* Event cells */}
                            {events.map((item, index) => (
                                <div key={index} className="p-0.5">
                                    {item ? (
                                        <button
                                            onClick={() => setSelectedEvent(item)}
                                            className={`w-full h-8 rounded text-white text-xs p-1 hover:opacity-80 transition-opacity ${getEventColor(item.type)} flex items-center justify-center`}
                                            title={`${item.title} - ${item.speaker?.name || 'No speaker'}`}
                                        >
                                            <div className="truncate font-medium">{item.title}</div>
                                        </button>
                                    ) : (
                                        <div className="w-full h-8 border border-dashed border-gray-700/20 rounded opacity-10"></div>
                                    )}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            
            {/* Event detail modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h4 className="text-white font-semibold mb-3">{selectedEvent.title}</h4>
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                                <ClockIcon className="w-4 h-4" />
                                <span>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                            </div>
                            
                            {selectedEvent.speaker && (
                                <div 
                                    className={`flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg ${
                                        selectedEvent.speaker.socialLinks?.linkedin ? 'hover:bg-gray-600/30 cursor-pointer transition-colors' : ''
                                    }`}
                                    onClick={() => {
                                        if (selectedEvent.speaker?.socialLinks?.linkedin) {
                                            window.open(selectedEvent.speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    title={selectedEvent.speaker.socialLinks?.linkedin ? `View ${selectedEvent.speaker.name}'s LinkedIn profile` : selectedEvent.speaker.name}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={getSpeakerAvatarUrl(selectedEvent.speaker, 24)} 
                                        alt={selectedEvent.speaker.name}
                                        className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-white text-sm">{selectedEvent.speaker.name}</div>
                                        {selectedEvent.speaker.title && (
                                            <div className="text-xs text-gray-400">{selectedEvent.speaker.title}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {selectedEvent.location && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <MapPinIcon className="w-4 h-4" />
                                    <span>{selectedEvent.location}</span>
                                </div>
                            )}
                            
                            {selectedEvent.description && (
                                <p className="text-gray-300 mt-3">{selectedEvent.description}</p>
                            )}
                        </div>
                        
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatrixTimeline;