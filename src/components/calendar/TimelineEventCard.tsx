'use client';

import { FC } from 'react';
import Image from 'next/image';
import { ClockIcon, MapPinIcon, UserIcon, UsersIcon } from '@phosphor-icons/react';
import { AgendaItem } from '@/types';
import { getTypeColor, getSpeakerAvatarUrl } from '@/utils/timelineUtils';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';

interface TimelineEventCardProps {
    item: AgendaItem;
    showIndividualTime: boolean;
    eventTimezone: string;
    isSelected?: boolean;
    onClick?: () => void;
}

export const TimelineEventCard: FC<TimelineEventCardProps> = ({ item, showIndividualTime, eventTimezone, isSelected, onClick }) => {
    const theme = useTimelineTheme();

    return (
        <div
            onClick={onClick}
            className={`relative p-4 rounded-md border transition-all duration-200 cursor-pointer group ${isSelected
                    ? theme.isDark
                        ? 'bg-white/10 border-zinc-500 shadow-md'
                        : 'bg-blue-50 border-blue-300 shadow-md'
                    : theme.isDark
                        ? 'bg-[#18181B] border-white/5 hover:border-zinc-700'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
        >
            {/* Tag positioned absolutely in top-right - Subtle Style */}
            <div className="absolute top-3 right-3">
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${theme.isDark
                    ? 'bg-transparent border-white/10 text-zinc-400'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
            </div>

            {/* Time Display - Only shown if requested */}
            {showIndividualTime && (
                <div className={`text-[11px] font-mono mb-1.5 ${theme.isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    {formatEventTimeRange(item.startTime, item.endTime, eventTimezone)}
                </div>
            )}

            {/* Title */}
            <div className="pr-16">
                <h5 className={`text-[14px] font-semibold mb-1 leading-snug ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                </h5>
            </div>

            {/* Description */}
            {item.description && (
                <p className={`text-[13px] leading-relaxed mb-3 line-clamp-2 ${theme.isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                    {item.description}
                </p>
            )}

            {/* Location */}
            {item.location && (
                <div className={`flex items-center gap-1.5 text-[12px] mb-3 ${theme.textMuted}`}>
                    <MapPinIcon className="w-3.5 h-3.5" />
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

                return (
                    <div className="mt-3 pt-3 border-t border-dashed border-zinc-800">
                        <div className="space-y-2">
                            {hasMultipleSpeakers ? (
                                item.speakers?.map((speaker, index) => {
                                    const hasLinkedIn = Boolean(speaker.socialLinks?.linkedin);
                                    return (
                                        <div
                                            key={speaker.id || index}
                                            className={`flex items-center gap-2 ${hasLinkedIn ? 'cursor-pointer hover:opacity-80' : ''}`}
                                            onClick={(e) => {
                                                if (hasLinkedIn) {
                                                    e.stopPropagation();
                                                    window.open(speaker.socialLinks!.linkedin, '_blank', 'noopener,noreferrer');
                                                }
                                            }}
                                            title={hasLinkedIn ? `View ${speaker.name}'s LinkedIn profile` : speaker.name}
                                        >
                                            <div className={`relative w-5 h-5 rounded-full border ${theme.borderLight} overflow-hidden flex-shrink-0`}>
                                                <Image
                                                    src={getSpeakerAvatarUrl(speaker, 32)}
                                                    alt={speaker.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="20px"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-[12px] font-medium truncate ${theme.textPrimary}`}>{speaker.name}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div
                                    className={`flex items-center gap-2 ${item.speaker?.socialLinks?.linkedin ? 'cursor-pointer hover:opacity-80' : ''}`}
                                    onClick={(e) => {
                                        if (item.speaker?.socialLinks?.linkedin) {
                                            e.stopPropagation();
                                            window.open(item.speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    title={item.speaker?.socialLinks?.linkedin ? `View ${item.speaker!.name}'s LinkedIn profile` : item.speaker?.name}
                                >
                                    <div className={`relative w-5 h-5 rounded-full border ${theme.borderLight} overflow-hidden flex-shrink-0`}>
                                        <Image
                                            src={getSpeakerAvatarUrl(item.speaker!, 32)}
                                            alt={item.speaker!.name}
                                            fill
                                            className="object-cover"
                                            sizes="20px"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[12px] font-medium truncate ${theme.textPrimary}`}>{item.speaker!.name}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
