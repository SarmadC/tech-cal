'use client';

import { FC, useState } from 'react';
import { ClockIcon, MapPinIcon, UserIcon, UsersIcon, CalendarIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimelineTime, getTypeColor, getEmptyState, eventsOverlap, getSpeakerAvatarUrl } from '@/utils/timelineUtils';

interface TimelineViewProps {
    event: Event;
}

const TimelineView: FC<TimelineViewProps> = ({ event }) => {
    const theme = useTimelineTheme();
    // Get agenda from event
    const agenda = event.agenda || [];
    
    // Initialize with all days collapsed by default
    const [collapsedDays, setCollapsedDays] = useState<Set<number>>(() => {
        const allDays = new Set<number>();
        agenda.forEach(item => {
            if (item.dayNumber) {
                allDays.add(item.dayNumber);
            }
        });
        return allDays;
    });
    
    // Toggle day collapse state
    const toggleDayCollapse = (day: number) => {
        setCollapsedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(day)) {
                newSet.delete(day);
            } else {
                newSet.add(day);
            }
            return newSet;
        });
    };
    
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
    
    const formatTime = formatTimelineTime;
    
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
    const renderEventCard = (item: AgendaItem, showIndividualTime: boolean = false) => (
        <>
            {/* Tag positioned absolutely in top-right */}
            <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getTypeColor(item.type, theme.isDark).className}`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
            </div>
            
            {/* Title and individual time */}
            <div className="pr-20">
                <h5 className={`font-medium mb-1 ${theme.textPrimary}`}>
                    {item.title}
                </h5>
                {showIndividualTime && (
                    <div className={`flex items-center gap-1 text-xs ${theme.textMuted} mb-2`}>
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                    </div>
                )}
            </div>
            
            {/* Description */}
            {item.description && (
                <p className={`text-sm mb-3 ${theme.textSecondary}`}>
                    {item.description}
                </p>
            )}
            
            {/* Location */}
            {item.location && (
                <div className={`flex items-center gap-2 text-sm mb-2 ${theme.textMuted}`}>
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
                        <div className={`flex items-center gap-2 text-xs font-medium mb-2 ${theme.textMuted}`}>
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
                                            className={`flex items-center gap-3 p-2 rounded-lg border ${theme.bgCard} ${theme.borderCard} ${hasLinkedIn ? `${theme.hoverCard} ${theme.hoverBorder} cursor-pointer transition-colors` : ''}`}
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
                                                className={`w-8 h-8 rounded-full object-cover border ${theme.borderLight}`}
                                                onError={(e) => {
                                                    const target = e.currentTarget as HTMLImageElement;
                                                    target.style.display = 'none';
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-medium text-sm truncate ${theme.textPrimary}`}>{speaker.name}</div>
                                                {speaker.title && (
                                                    <div className={`text-xs truncate ${theme.textSecondary}`}>{speaker.title}</div>
                                                )}
                                                {speaker.company && (
                                                    <div className={`text-xs truncate ${theme.textMuted}`}>{speaker.company}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div 
                                    className={`flex items-center gap-3 p-2 rounded-lg border ${theme.bgCard} ${theme.borderCard} ${item.speaker!.socialLinks?.linkedin ? `${theme.hoverCard} ${theme.hoverBorder} cursor-pointer transition-colors` : ''}`}
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
                                        className={`w-8 h-8 rounded-full object-cover border ${theme.borderLight}`}
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-medium text-sm truncate ${theme.textPrimary}`}>{item.speaker!.name}</div>
                                        {item.speaker!.title && (
                                            <div className={`text-xs truncate ${theme.textSecondary}`}>{item.speaker!.title}</div>
                                        )}
                                        {item.speaker!.company && (
                                            <div className={`text-xs truncate ${theme.textMuted}`}>{item.speaker!.company}</div>
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
            <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>
                Event Timeline
            </h3>
            
            {Object.entries(timelineClusters)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([day, clusters]) => {
                    const dayNumber = parseInt(day);
                    const isCollapsed = collapsedDays.has(dayNumber);
                    const totalEvents = clusters.reduce((sum, cluster) => sum + cluster.items.length, 0);
                    
                    return (
                        <div key={day} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleDayCollapse(dayNumber)}
                                    className={`flex items-center gap-2 ${theme.textPrimary} hover:${theme.textSecondary} transition-colors group`}
                                >
                                    <div className={`transform transition-transform duration-200 ease-in-out ${
                                        isCollapsed ? 'rotate-0' : 'rotate-90'
                                    }`}>
                                        <CaretRightIcon className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-md font-medium">
                                        Day {day}
                                    </h4>
                                    <span className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${theme.bgMuted} ${theme.textMuted} group-hover:scale-105`}>
                                        {totalEvents} event{totalEvents !== 1 ? 's' : ''}
                                    </span>
                                </button>
                                <div className={`flex-1 h-px ${theme.timelineLine}`}></div>
                            </div>
                        
                        {/* Collapsible content with smooth animation */}
                        <div 
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
                            }`}
                        >
                            <div className="space-y-6">
                                {clusters.map((cluster, clusterIndex) => (
                                <div key={clusterIndex} className="flex gap-4">
                                    {/* Timeline connector */}
                                    <div className="flex flex-col items-center">
                                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${theme.timelineConnector}`}></div>
                                        {clusterIndex < clusters.length - 1 && (
                                            <div className={`w-px flex-1 mt-2 mb-2 ${theme.timelineLine}`} style={{ minHeight: '40px' }}></div>
                                        )}
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 pb-6">
                                        {/* Time slot header */}
                                        <div className={`flex items-center gap-2 text-sm mb-3 ${theme.textMuted}`}>
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{cluster.timeSlot}</span>
                                            {cluster.items.length > 1 && (
                                                <span className={`px-2 py-0.5 text-xs rounded ${
                                                    theme.isDark 
                                                        ? 'bg-orange-500/20 text-orange-300' 
                                                        : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {cluster.items.length} parallel events
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Parallel events layout */}
                                        {cluster.items.length === 1 ? (
                                            /* Single event */
                                            <div className={`relative rounded-lg p-4 transition-all duration-200 hover:shadow-md ${theme.bgCard} ${theme.borderCard}`}>
                                                {renderEventCard(cluster.items[0], false)}
                                            </div>
                                        ) : (
                                            /* Multiple parallel events */
                                            <div className="space-y-3">
                                                {cluster.items.map((item, itemIndex) => (
                                                    <div key={item.id || itemIndex} className="relative animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${itemIndex * 50}ms` }}>
                                                        {/* Branch connector for parallel events */}
                                                        {itemIndex > 0 && (
                                                            <div className={`absolute -left-8 top-6 w-6 h-px ${theme.timelineLine}`}></div>
                                                        )}
                                                        <div className={`relative rounded-lg p-4 ml-4 transition-all duration-200 hover:shadow-md ${theme.bgCard} ${theme.borderCard} border-l-2 ${theme.borderLight}`}>
                                                            {renderEventCard(item, true)}
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
                    </div>
                );
                })}
        </div>
    );
};

export default TimelineView;