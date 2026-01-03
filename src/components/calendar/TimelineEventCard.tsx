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
}

export const TimelineEventCard: FC<TimelineEventCardProps> = ({ item, showIndividualTime, eventTimezone }) => {
    const theme = useTimelineTheme();

    return (
        <>
            {/* Tag positioned absolutely in top-right */}
            <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getTypeColor(item.type, theme.isDark).className}`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
            </div>

            {/* Title and individual time */}
            <div className="pr-20">
                <h5 className={`font-medium mb-1 whitespace-normal break-words ${theme.textPrimary}`}>
                    {item.title}
                </h5>
                {showIndividualTime && (
                    <div className={`flex items-center gap-1 text-xs ${theme.textMuted} mb-2`}>
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatEventTimeRange(item.startTime, item.endTime, eventTimezone)}</span>
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
                                            <div className={`relative w-8 h-8 rounded-full border ${theme.borderLight} overflow-hidden flex-shrink-0`}>
                                                <Image
                                                    src={getSpeakerAvatarUrl(speaker, 32)}
                                                    alt={speaker.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="32px"
                                                />
                                            </div>
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
                                    <div className={`relative w-8 h-8 rounded-full border ${theme.borderLight} overflow-hidden flex-shrink-0`}>
                                        <Image
                                            src={getSpeakerAvatarUrl(item.speaker!, 32)}
                                            alt={item.speaker!.name}
                                            fill
                                            className="object-cover"
                                            sizes="32px"
                                        />
                                    </div>
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
};
