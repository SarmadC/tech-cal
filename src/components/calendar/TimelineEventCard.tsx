'use client';

import { FC } from 'react';
import Image from 'next/image';
import { MapPinIcon } from '@phosphor-icons/react';
import { AgendaItem } from '@/types';
import { getSpeakerAvatarUrl } from '@/utils/timelineUtils';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';

interface TimelineEventCardProps {
    item: AgendaItem;
    showIndividualTime: boolean;
    eventTimezone: string;
    isSelected?: boolean;
    onClick?: () => void;
}

export const TimelineEventCard: FC<TimelineEventCardProps> = ({ item, showIndividualTime, eventTimezone, isSelected, onClick }) => {
    const containerClasses = isSelected
        ? 'bg-[var(--accent-tertiary-light)] border-[var(--accent-tertiary)] shadow-md'
        : 'bg-background-secondary border-border-subtle hover:border-border-default hover:bg-background-tertiary/80';

    const tagClasses = 'bg-background-tertiary/80 border-border-subtle text-foreground-tertiary';
    const titleColor = 'text-foreground-primary';
    const textColor = 'text-foreground-secondary';
    const metaColor = 'text-foreground-tertiary';

    return (
        <div
            onClick={onClick}
            className={`relative p-4 rounded-md border transition-all duration-200 cursor-pointer group ${containerClasses}`}
        >
            {/* Tag positioned absolutely in top-right - Subtle Style */}
            <div className="absolute top-3 right-3">
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${tagClasses}`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </span>
            </div>

            {/* Time Display - Only shown if requested */}
            {showIndividualTime && (
                <div className={`text-[11px] font-mono mb-1.5 ${metaColor}`}>
                    {formatEventTimeRange(item.startTime, item.endTime, eventTimezone)}
                </div>
            )}

            {/* Title */}
            <div className="pr-16">
                <h5 className={`text-[14px] font-semibold mb-1 leading-snug ${titleColor}`}>
                    {item.title}
                </h5>
            </div>

            {/* Description */}
            {item.description && (
                <p className={`text-[13px] leading-relaxed mb-3 line-clamp-2 ${textColor}`}>
                    {item.description}
                </p>
            )}

            {/* Location */}
            {item.location && (
                <div className={`flex items-center gap-1.5 text-[12px] mb-3 ${metaColor}`}>
                    <MapPinIcon className="w-3.5 h-3.5" />
                    <span>{item.location}</span>
                </div>
            )}

            {/* Speaker(s) - Avatar stack only for scanning */}
            {(() => {
                const hasMultipleSpeakers = Array.isArray(item.speakers) && item.speakers.length > 0;
                const hasSingleSpeaker = item.speaker && item.speaker.name;

                if (!hasMultipleSpeakers && !hasSingleSpeaker) {
                    return null; // Don't render anything if no speakers
                }

                // Collect all speakers
                const allSpeakers = hasMultipleSpeakers
                    ? item.speakers || []
                    : item.speaker
                        ? [item.speaker]
                        : [];

                // Show up to 4 avatars, with overflow indicator
                const visibleSpeakers = allSpeakers.slice(0, 4);
                const overflowCount = Math.max(0, allSpeakers.length - 4);

                return (
                    <div className="mt-3 pt-3 border-t border-dashed border-border-subtle">
                        <div className="flex items-center -space-x-2">
                            {visibleSpeakers.map((speaker, index) => {
                                return (
                                    <div
                                        key={speaker.id || index}
                                        className="relative w-6 h-6 rounded-full border-2 border-[var(--background-secondary)] overflow-hidden flex-shrink-0"
                                        title={speaker.name}
                                    >
                                        <Image
                                            src={getSpeakerAvatarUrl(speaker, 24)}
                                            alt={speaker.name}
                                            fill
                                            className="object-cover"
                                            sizes="24px"
                                        />
                                    </div>
                                );
                            })}
                            {overflowCount > 0 && (
                                <div
                                    className="relative w-6 h-6 rounded-full border-2 border-[var(--background-secondary)] bg-background-tertiary flex items-center justify-center text-[10px] font-medium flex-shrink-0 text-foreground-secondary"
                                    title={`+${overflowCount} more speaker${overflowCount !== 1 ? 's' : ''}`}
                                >
                                    +{overflowCount}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
