'use client';

import { FC, useMemo } from 'react';
import { ClockIcon, CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import { getEventTimeStatus } from '@/utils/dateUtils';

interface EventProgressProps {
    event: Event;
    agenda: AgendaItem[];
}

const EventProgress: FC<EventProgressProps> = ({ event, agenda }) => {
    const now = useMemo(() => new Date(), []);
    const eventStart = useMemo(() => new Date(event.startTime), [event.startTime]);
    const eventEnd = useMemo(() => 
        event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 4 * 60 * 60 * 1000),
        [event.endTime, eventStart]
    );
    
    const timeStatus = getEventTimeStatus(event.startTime, event.endTime);

    // Calculate progress based on agenda items
    const progressData = useMemo(() => {
        if (agenda.length === 0) {
            // Fallback to overall event progress if no agenda
            const totalMs = eventEnd.getTime() - eventStart.getTime();
            const elapsedMs = Math.min(Math.max(now.getTime() - eventStart.getTime(), 0), totalMs);
            const progressPercent = Math.round((elapsedMs / totalMs) * 100);
            
            return {
                currentItem: null,
                completedItems: 0,
                totalItems: 0,
                progressPercent,
                nextItem: null
            };
        }

        let completedItems = 0;
        let currentItem: AgendaItem | null = null;
        let nextItem: AgendaItem | null = null;

        for (let i = 0; i < agenda.length; i++) {
            const item = agenda[i];
            const itemStart = new Date(item.startTime);
            const itemEnd = new Date(item.endTime);

            if (now >= itemEnd) {
                // Item is completed
                completedItems++;
            } else if (now >= itemStart && now < itemEnd) {
                // Item is currently happening
                currentItem = item;
                break;
            } else if (now < itemStart) {
                // Item is upcoming
                nextItem = item;
                break;
            }
        }

        const progressPercent = Math.round((completedItems / agenda.length) * 100);

        return {
            currentItem,
            completedItems,
            totalItems: agenda.length,
            progressPercent,
            nextItem
        };
    }, [agenda, now, eventStart, eventEnd]);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (timeStatus === 'upcoming') {
        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <ClockIcon className="w-4 h-4" />
                    <span>Event starts in {Math.ceil((eventStart.getTime() - now.getTime()) / (1000 * 60 * 60))} hours</span>
                </div>
                {progressData.nextItem && (
                    <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-zinc-300">
                            <CircleIcon className="w-4 h-4" />
                            <span className="font-medium">Next: {progressData.nextItem.title}</span>
                        </div>
                        <div className="text-sm text-zinc-400 mt-1">
                            {formatTime(progressData.nextItem.startTime)} - {formatTime(progressData.nextItem.endTime)}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (timeStatus === 'past') {
        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Event completed</span>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between text-green-300">
                        <span className="font-medium">All sessions completed</span>
                        <span className="text-sm">{progressData.completedItems}/{progressData.totalItems}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Event is live or in progress
    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Event Progress</span>
                    <span className="text-gray-400">{progressData.completedItems}/{progressData.totalItems} sessions</span>
                </div>
                <div 
                    className="w-full bg-zinc-700 rounded h-2"
                    role="progressbar"
                    aria-valuenow={progressData.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Event progress: ${progressData.completedItems} of ${progressData.totalItems} sessions completed`}
                >
                    <div 
                        className="bg-zinc-200 dark:bg-zinc-300 h-2 rounded transition-all duration-300"
                        style={{ width: `${progressData.progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Current Session */}
            {progressData.currentItem && (
                <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-zinc-300">
                        <div className="w-2 h-2 bg-zinc-300 rounded-full animate-pulse" />
                        <span className="font-medium">Live: {progressData.currentItem.title}</span>
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                        {formatTime(progressData.currentItem.startTime)} - {formatTime(progressData.currentItem.endTime)}
                    </div>
                    {progressData.currentItem.speaker && (
                        <div className="text-sm text-zinc-400 mt-1">
                            Speaker: {progressData.currentItem.speaker.name}
                        </div>
                    )}
                </div>
            )}

            {/* Next Session */}
            {progressData.nextItem && !progressData.currentItem && (
                <div className="bg-gray-700/50 border border-gray-600/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-gray-300">
                        <CircleIcon className="w-4 h-4" />
                        <span className="font-medium">Next: {progressData.nextItem.title}</span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                        {formatTime(progressData.nextItem.startTime)} - {formatTime(progressData.nextItem.endTime)}
                    </div>
                </div>
            )}

            {/* Completed Sessions */}
            {progressData.completedItems > 0 && (
                <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-zinc-300">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="font-medium">{progressData.completedItems} sessions completed</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventProgress;
