'use client';

import { FC } from 'react';
import Image from 'next/image';
import { ShareNetworkIcon, StarIcon, DotsThreeIcon } from '@phosphor-icons/react';
import { AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimeRange, formatDate } from '@/utils/dateUtils';
import { getSpeakerAvatarUrl } from '@/utils/timelineUtils';

interface TimelineDetailPanelProps {
    event: AgendaItem;
    eventTimezone: string;
}

export const TimelineDetailPanel: FC<TimelineDetailPanelProps> = ({ event, eventTimezone }) => {
    const theme = useTimelineTheme();

    return (
        <div className={`h-full overflow-y-auto p-8 sticky top-0 ${theme.isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
            {/* Header Section */}
            <div className="mb-8 relative">
                {/* Action Bar - Top Right */}
                <div className="absolute top-0 right-0 flex items-center gap-2">
                    <button className={`p-1.5 rounded-md transition-colors ${theme.isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}>
                        <ShareNetworkIcon className="w-4 h-4" />
                    </button>
                    <button className={`p-1.5 rounded-md transition-colors ${theme.isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}>
                        <StarIcon className="w-4 h-4" />
                    </button>
                    <button className={`p-1.5 rounded-md transition-colors ${theme.isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}>
                        <DotsThreeIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="mb-3">
                    <span className={`inline-block px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] rounded border ${theme.isDark
                        ? 'bg-transparent border-zinc-800 text-zinc-500'
                        : 'bg-transparent border-gray-200 text-gray-500'
                        }`}>
                        {event.type}
                    </span>
                </div>
                <h2 className="text-2xl font-bold leading-tight tracking-tight mb-4 pr-24">
                    {event.title}
                </h2>
            </div>

            {/* Meta Information - Key-Value Grid */}
            <div className="grid grid-cols-[100px_1fr] gap-y-3 mb-8 text-sm">
                {/* Date/Time */}
                <div className={`font-mono text-[11px] uppercase tracking-wider py-0.5 ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    Date
                </div>
                <div className={`font-medium ${theme.isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {formatDate(event.startTime)} <span className="mx-1 text-zinc-600">•</span> {formatTimeRange(event.startTime, event.endTime, eventTimezone)}
                </div>

                {/* Location */}
                {event.location && (
                    <>
                        <div className={`font-mono text-[11px] uppercase tracking-wider py-0.5 ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                            Location
                        </div>
                        <div className={`font-medium ${theme.isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                            {event.location}
                        </div>
                    </>
                )}


            </div>

            {/* Description */}
            {event.description && (
                <div className="mb-10">
                    <div className={`prose prose-sm max-w-[65ch] ${theme.isDark ? 'prose-invert text-zinc-300' : 'text-gray-600'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {event.description}
                        </p>
                    </div>
                </div>
            )}

            {/* Speakers */}
            {(event.speakers && event.speakers.length > 0) || event.speaker ? (
                <div>
                    <h3 className={`text-[11px] font-mono uppercase tracking-wider mb-6 ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        Speakers
                    </h3>
                    <div className="space-y-6">
                        {(event.speakers && event.speakers.length > 0 ? event.speakers : [event.speaker!]).map((speaker, idx) => (
                            <div key={speaker.id || idx} className="flex items-start gap-4">
                                <div className={`relative w-10 h-10 rounded-full border ${theme.borderLight} overflow-hidden flex-shrink-0`}>
                                    <Image
                                        src={getSpeakerAvatarUrl(speaker, 40)}
                                        alt={speaker.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="font-medium text-sm mb-0.5">{speaker.name}</div>
                                    {speaker.title && (
                                        <div className={`text-xs ${theme.isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                                            {speaker.title}
                                            {speaker.company && ` • ${speaker.company}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
