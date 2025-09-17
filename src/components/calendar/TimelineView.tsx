'use client';

import { FC } from 'react';
import { ClockIcon, MapPinIcon, UserIcon, UsersIcon, CalendarIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { getSpeakerAvatarUrl } from '@/services/avatarService';

interface TimelineViewProps {
    event: Event;
}

const TimelineView: FC<TimelineViewProps> = ({ event }) => {
    // Get agenda from event
    const agenda = event.agenda || [];
    
    if (agenda.length === 0) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">
                    No timeline available for this event.
                </p>
            </div>
        );
    }
    
    const formatTime = (timeString: string) => {
        if (timeString.includes('T') || timeString.includes(' ')) {
            return new Date(timeString).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
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
    
    // Helper function to convert time string to minutes
    const toMinutes = (timeString: string): number => {
        if (!timeString) return 0;
        if (timeString.includes('T') || timeString.includes(' ')) {
            const d = new Date(timeString);
            return d.getHours() * 60 + d.getMinutes();
        }
        const [h, m] = timeString.split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    };

    // Check if two events overlap
    const eventsOverlap = (event1: AgendaItem, event2: AgendaItem): boolean => {
        const start1 = toMinutes(event1.startTime);
        const end1 = toMinutes(event1.endTime);
        const start2 = toMinutes(event2.startTime);
        const end2 = toMinutes(event2.endTime);
        
        return start1 < end2 && start2 < end1;
    };

    // Group agenda items by day and create timeline clusters
    const groupedByDay = agenda.reduce((acc, item) => {
        const day = item.dayNumber || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
    }, {} as Record<number, AgendaItem[]>);
    
    // Create timeline clusters for each day (handling overlapping events)
    const timelineClusters = Object.entries(groupedByDay).reduce((acc, [day, dayItems]) => {
        // Sort items by start time
        const sortedItems = dayItems.sort((a, b) => {
            const timeA = toMinutes(a.startTime);
            const timeB = toMinutes(b.startTime);
            return timeA - timeB;
        });

        const clusters: Array<{
            timeSlot: string;
            startMinutes: number;
            endMinutes: number;
            items: AgendaItem[];
        }> = [];

        for (const item of sortedItems) {
            const itemStart = toMinutes(item.startTime);
            const itemEnd = toMinutes(item.endTime);
            
            // Find if this item overlaps with any existing cluster
            let addedToCluster = false;
            for (const cluster of clusters) {
                // Check if item overlaps with any item in this cluster
                const overlapsWithCluster = cluster.items.some(clusterItem => 
                    eventsOverlap(item, clusterItem)
                );
                
                if (overlapsWithCluster) {
                    cluster.items.push(item);
                    cluster.startMinutes = Math.min(cluster.startMinutes, itemStart);
                    cluster.endMinutes = Math.max(cluster.endMinutes, itemEnd);
                    addedToCluster = true;
                    break;
                }
            }
            
            if (!addedToCluster) {
                // Create new cluster
                clusters.push({
                    timeSlot: `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`,
                    startMinutes: itemStart,
                    endMinutes: itemEnd,
                    items: [item]
                });
            }
        }

        acc[parseInt(day)] = clusters;
        return acc;
    }, {} as Record<number, Array<{
        timeSlot: string;
        startMinutes: number;
        endMinutes: number;
        items: AgendaItem[];
    }>>);
    
    // Helper function to render individual event cards
    const renderEventCard = (item: AgendaItem) => (
        <>
            {/* Tag positioned absolutely in top-right */}
            <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getTypeColor(item.type)}`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
            </div>
            
            {/* Title */}
            <h5 className="text-white font-medium mb-2 pr-20">
                {item.title}
            </h5>
            
            {/* Description */}
            {item.description && (
                <p className="text-gray-300 text-sm mb-3">
                    {item.description}
                </p>
            )}
            
            {/* Location */}
            {item.location && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{item.location}</span>
                </div>
            )}
            
            {/* Speaker(s) - Only show if there are actual speakers */}
            {(() => {
                const hasMultipleSpeakers = Array.isArray(item.speakers) && item.speakers.length > 0;
                const hasSingleSpeaker = item.speaker && item.speaker.name;
                
                if (!hasMultipleSpeakers && !hasSingleSpeaker) {
                    return null; // Don't render anything if no speakers
                }
                
                const speakerCount = hasMultipleSpeakers ? item.speakers!.length : 1;
                
                return (
                    <div className="mb-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
                            {speakerCount > 1 ? (
                                <UsersIcon className="w-3.5 h-3.5" />
                            ) : (
                                <UserIcon className="w-3.5 h-3.5" />
                            )}
                            <span>Speaker{speakerCount > 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className="space-y-2">
                            {hasMultipleSpeakers ? (
                                item.speakers!.map((speaker, index) => {
                                    const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                    return (
                                        <div 
                                            key={speaker.id || index} 
                                            className={`flex items-center gap-3 p-2 bg-gray-700/40 rounded-lg border border-gray-600/30 ${
                                                hasLinkedIn ? 'hover:bg-gray-600/40 hover:border-gray-500/50 cursor-pointer transition-colors' : ''
                                            }`}
                                            onClick={() => {
                                                if (hasLinkedIn) {
                                                    window.open(speaker.socialLinks!.linkedin, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            title={hasLinkedIn ? `View ${speaker.name}'s LinkedIn profile` : speaker.name}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                        </div>
                                    );
                                })
                            ) : (
                                <div 
                                    className={`flex items-center gap-3 p-2 bg-gray-700/40 rounded-lg border border-gray-600/30 ${
                                        item.speaker!.socialLinks?.linkedin ? 'hover:bg-gray-600/40 hover:border-gray-500/50 cursor-pointer transition-colors' : ''
                                    }`}
                                    onClick={() => {
                                        if (item.speaker?.socialLinks?.linkedin) {
                                            window.open(item.speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    title={item.speaker!.socialLinks?.linkedin ? `View ${item.speaker!.name}'s LinkedIn profile` : item.speaker!.name}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={getSpeakerAvatarUrl(item.speaker!, 32)} 
                                        alt={item.speaker!.name}
                                        className="w-8 h-8 rounded-full object-cover border border-gray-500"
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white text-sm truncate">{item.speaker!.name}</div>
                                        {item.speaker!.title && (
                                            <div className="text-xs text-gray-400 truncate">{item.speaker!.title}</div>
                                        )}
                                        {item.speaker!.company && (
                                            <div className="text-xs text-gray-500 truncate">{item.speaker!.company}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            
        </>
    );
    
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">
                Event Timeline
            </h3>
            
            {Object.entries(timelineClusters)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([day, clusters]) => (
                    <div key={day} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h4 className="text-md font-medium text-white">
                                Day {day}
                            </h4>
                            <div className="flex-1 h-px bg-gray-700"></div>
                        </div>
                        
                        <div className="space-y-6">
                            {clusters.map((cluster, clusterIndex) => (
                                <div key={clusterIndex} className="flex gap-4">
                                    {/* Timeline connector */}
                                    <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-600 flex-shrink-0"></div>
                                        {clusterIndex < clusters.length - 1 && (
                                            <div className="w-px bg-gray-600 flex-1 mt-2 mb-2" style={{ minHeight: '40px' }}></div>
                                        )}
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 pb-6">
                                        {/* Time slot header */}
                                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{cluster.timeSlot}</span>
                                            {cluster.items.length > 1 && (
                                                <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-300 rounded">
                                                    {cluster.items.length} parallel events
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Parallel events layout */}
                                        {cluster.items.length === 1 ? (
                                            /* Single event */
                                            <div className="relative bg-gray-800/40 border border-gray-700/60 rounded-lg p-4">
                                                {renderEventCard(cluster.items[0])}
                                            </div>
                                        ) : (
                                            /* Multiple parallel events */
                                            <div className="space-y-3">
                                                {cluster.items.map((item, itemIndex) => (
                                                    <div key={item.id || itemIndex} className="relative">
                                                        {/* Branch connector for parallel events */}
                                                        {itemIndex > 0 && (
                                                            <div className="absolute -left-8 top-6 w-6 h-px bg-gray-600"></div>
                                                        )}
                                                        <div className="relative bg-gray-800/40 border border-gray-700/60 rounded-lg p-4 ml-4">
                                                            {renderEventCard(item)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default TimelineView;