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
        <div className={`h-full flex flex-col ${theme.isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-gray-900'} overflow-y-auto`}>
            {/* Header / Actions Bar */}
            <div className={`sticky top-0 z-10 px-8 py-6 border-b flex items-center justify-between backdrop-blur-md ${theme.isDark
                ? 'bg-zinc-950/80 border-white/5'
                : 'bg-white/80 border-gray-100'
                }`}>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded-md border ${theme.isDark
                        ? 'bg-white/5 border-white/10 text-zinc-400'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                        {event.type}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className={`p-1.5 rounded-md transition-colors ${theme.isDark
                            ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        title="Add to Calendar"
                    >
                        <StarIcon className="w-4 h-4" />
                    </button>

                    <button
                        className={`p-1.5 rounded-md transition-colors ${theme.isDark
                            ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        title="Share"
                    >
                        <ShareNetworkIcon className="w-4 h-4" />
                    </button>

                    <button
                        className={`p-1.5 rounded-md transition-colors ${theme.isDark
                            ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        title="More"
                    >
                        <DotsThreeIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 p-8">
                {/* Title Section */}
                <div className="mb-8">
                    <h2 className={`text-2xl font-semibold leading-snug tracking-tight mb-2 ${theme.isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                        {event.title}
                    </h2>
                </div>

                {/* Properties Grid - Linear Style */}
                <div className="grid grid-cols-[100px_1fr] gap-y-5 text-sm mb-10">
                    {/* Status / Action - Moved to top of grid as per request */}
                    <div className={`text-[11px] font-medium uppercase tracking-widest self-center ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        Status
                    </div>
                    <div>
                        <button
                            className={`h-7 px-3 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-2 ${theme.isDark
                                ? 'bg-white text-black hover:bg-zinc-200'
                                : 'bg-black text-white hover:bg-zinc-800'
                                }`}
                            onClick={() => console.log('Register clicked')}
                        >
                            Register for Session
                        </button>
                    </div>

                    {/* Date */}
                    <div className={`text-[11px] font-medium uppercase tracking-widest pt-0.5 ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        Date
                    </div>
                    <div className={`flex items-center gap-2 ${theme.isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                        <span>{formatDate(event.startTime)}</span>
                        <span className={`text-[10px] ${theme.isDark ? 'text-zinc-600' : 'text-gray-400'}`}>•</span>
                        <span>{formatTimeRange(event.startTime, event.endTime, eventTimezone)}</span>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <>
                            <div className={`text-[11px] font-medium uppercase tracking-widest pt-0.5 ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                                Location
                            </div>
                            <div className={`${theme.isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                                {event.location}
                            </div>
                        </>
                    )}

                    {/* Speakers */}
                    {((event.speakers && event.speakers.length > 0) || event.speaker) && (
                        <>
                            <div className={`text-[11px] font-medium uppercase tracking-widest pt-1.5 ${theme.isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                                Speakers
                            </div>
                            <div className="flex flex-col gap-3">
                                {(event.speakers && event.speakers.length > 0 ? event.speakers : [event.speaker!]).map((speaker, idx) => {
                                    const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                    return (
                                        <div key={speaker.id || idx} className="flex items-center gap-2.5 group">
                                            <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800">
                                                <Image
                                                    src={getSpeakerAvatarUrl(speaker, 20)}
                                                    alt={speaker.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <span
                                                className={`text-sm transition-colors ${hasLinkedIn
                                                    ? `${theme.isDark ? 'text-zinc-300 group-hover:text-zinc-100' : 'text-gray-700 group-hover:text-gray-900'} cursor-pointer`
                                                    : (theme.isDark ? 'text-zinc-300' : 'text-gray-700')
                                                    }`}
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
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Description Divider */}
                <div className={`h-px w-full mb-8 ${theme.isDark ? 'bg-white/5' : 'bg-gray-100'}`} />

                {/* Description Body */}
                {event.description && (
                    <div className={`prose prose-sm max-w-none ${theme.isDark ? 'prose-invert text-zinc-400' : 'text-gray-600'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed font-normal">
                            {event.description}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
