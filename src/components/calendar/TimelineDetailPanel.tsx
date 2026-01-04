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
        <div className={`h-full flex flex-col ${theme.isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
            <div className="flex-1 overflow-y-auto p-8 relative">
                {/* Header Section */}
                <div className="mb-8 relative">
                    {/* Action Bar - Top Right */}
                    {/* Action Bar - Top Right - Moved to Footer */}
                    {/* <div className="absolute top-0 right-0 flex items-center gap-2"> ... </div> */}

                    <div className="mb-3">
                        <span className={`inline-block px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] rounded ${theme.isDark
                            ? 'border border-[#444] text-[#AAA] bg-white/5'
                            : 'border border-gray-200 text-gray-500 bg-gray-50'
                            }`}>
                            {event.type}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold leading-tight tracking-tight mb-4 pr-24">
                        {event.title}
                    </h2>
                </div>

                {/* Meta Information - Key-Value Grid */}
                <div className="grid grid-cols-[80px_1fr] gap-y-3 mb-8 text-sm">
                    {/* Date/Time */}
                    <div className={`font-mono text-[11px] uppercase tracking-wider py-0.5 ${theme.isDark ? 'text-[#666]' : 'text-gray-500'}`}>
                        Date
                    </div>
                    <div className={`font-medium ${theme.isDark ? 'text-[#EEE]' : 'text-gray-700'}`}>
                        {formatDate(event.startTime)} <span className="mx-1 text-zinc-600">•</span> {formatTimeRange(event.startTime, event.endTime, eventTimezone)}
                    </div>

                    {/* Location */}
                    {event.location && (
                        <>
                            <div className={`font-mono text-[11px] uppercase tracking-wider py-0.5 ${theme.isDark ? 'text-[#666]' : 'text-gray-500'}`}>
                                Location
                            </div>
                            <div className={`font-medium ${theme.isDark ? 'text-[#EEE]' : 'text-gray-700'}`}>
                                {event.location}
                            </div>
                        </>
                    )}

                    {/* Speakers - Moved into grid */}
                    {((event.speakers && event.speakers.length > 0) || event.speaker) && (
                        <>
                            <div className={`font-mono text-[11px] uppercase tracking-wider py-1.5 ${theme.isDark ? 'text-[#666]' : 'text-gray-500'}`}>
                                Speakers
                            </div>
                            <div className={`font-medium ${theme.isDark ? 'text-[#EEE]' : 'text-gray-700'}`}>
                                <div className="flex flex-col gap-2">
                                    {(event.speakers && event.speakers.length > 0 ? event.speakers : [event.speaker!]).map((speaker, idx) => {
                                        const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                        return (
                                            <div key={speaker.id || idx} className="flex items-center gap-2">
                                                <div className={`relative w-6 h-6 rounded-full border ${theme.borderLight} overflow-hidden flex-shrink-0`}>
                                                    <Image
                                                        src={getSpeakerAvatarUrl(speaker, 24)}
                                                        alt={speaker.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <span
                                                        className={`text-sm ${hasLinkedIn ? 'cursor-pointer hover:underline' : ''}`}
                                                        onClick={(e) => {
                                                            if (hasLinkedIn) {
                                                                e.stopPropagation();
                                                                window.open(speaker.socialLinks!.linkedin, '_blank', 'noopener,noreferrer');
                                                            }
                                                        }}
                                                    >
                                                        {speaker.name}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
            </div>

            {/* Sticky Action Footer */}
            <div className={`relative p-6 ${theme.isDark ? 'bg-[#111]' : 'bg-white'}`}>
                {/* Gradient Fade - "slides under" effect */}
                <div
                    className={`absolute -top-10 left-0 right-0 h-10 pointer-events-none ${theme.isDark
                        ? 'bg-gradient-to-t from-[#111] to-transparent'
                        : 'bg-gradient-to-t from-white to-transparent'
                        }`}
                />

                {/* Toolbar */}
                <div className="flex items-center gap-3">
                    <button
                        className={`flex-1 font-medium py-2.5 px-4 rounded transition-all flex items-center justify-center gap-2 ${theme.isDark
                            ? 'bg-[#EDEDED] text-black hover:bg-white'
                            : 'bg-black text-white hover:bg-gray-800'
                            }`}
                        onClick={() => console.log('Register clicked')}
                    >
                        Register for Session
                    </button>

                    <div className={`w-px h-8 mx-1 ${theme.isDark ? 'bg-zinc-800' : 'bg-gray-200'}`} />

                    <button
                        className={`p-2.5 rounded transition-colors ${theme.isDark
                            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        title="Add to Calendar"
                    >
                        <StarIcon className="w-5 h-5" />
                    </button>

                    <button
                        className={`p-2.5 rounded transition-colors ${theme.isDark
                            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        title="Share"
                    >
                        <ShareNetworkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
