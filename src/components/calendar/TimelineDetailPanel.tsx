import { FC } from 'react';
import { AgendaItem } from '@/types';
import { XIcon, MapPinIcon, ClockIcon } from '@phosphor-icons/react';
import { formatTimeRange } from '@/utils/dateUtils';
import { getSpeakerAvatarUrls } from '@/utils/timelineUtils';

interface TimelineDetailPanelProps {
    event: AgendaItem;
    eventTimezone?: string;
    onClose?: () => void;
}

export const TimelineDetailPanel: FC<TimelineDetailPanelProps> = ({ event, eventTimezone = 'UTC', onClose }) => {
    return (
        <div className="h-full timeline-detail-glass-panel p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="text-sm font-semibold mb-2 text-foreground-secondary">
                        Session Details
                    </div>
                    <h2 className="text-2xl font-bold text-foreground-primary">{event.title}</h2>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:bg-background-tertiary/80"
                    >
                        <XIcon className="w-5 h-5 text-foreground-tertiary" />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Time & Location */}
                <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-foreground-secondary">
                        <ClockIcon className="w-4 h-4 text-[var(--calendar-selection-blue)]" />
                        <span className="text-sm font-medium">
                            {formatTimeRange(event.startTime, event.endTime, eventTimezone)}
                        </span>
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-2 text-foreground-secondary">
                            <MapPinIcon className="w-4 h-4 text-[var(--calendar-selection-blue)]" />
                            <span className="text-sm font-medium">{event.location}</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                {event.description && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="leading-relaxed whitespace-pre-wrap text-foreground-secondary">
                            {event.description}
                        </p>
                    </div>
                )}

                {event.topics && event.topics.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold mb-3 text-foreground-secondary">Topics</h3>
                        <div className="flex flex-wrap gap-2">
                            {event.topics.map((topic) => (
                                <span
                                    key={topic}
                                    className="rounded-full border border-border-subtle bg-background-tertiary/70 px-3 py-1 text-xs font-medium text-foreground-secondary"
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Speakers */}
                {event.speakers && event.speakers.length > 0 && (
                    <div className="pt-6 border-t border-border-subtle">
                        <h3 className="text-sm font-semibold mb-4 text-foreground-secondary">Speakers</h3>
                        <div className="space-y-4">
                            {event.speakers.map((speaker) => {
                                const { primary: avatarSrc, fallback: fallbackSrc } = getSpeakerAvatarUrls(speaker, 40);

                                return (
                                    <div key={speaker.id} className="flex items-center gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={avatarSrc}
                                            alt={speaker.name}
                                            className="w-10 h-10 rounded-full object-cover border border-border-subtle bg-background-tertiary/60"
                                            onError={(e) => {
                                                if (e.currentTarget.src !== fallbackSrc) {
                                                    e.currentTarget.src = fallbackSrc;
                                                }
                                            }}
                                        />
                                        <div>
                                            <div className="font-medium text-foreground-primary">{speaker.name}</div>
                                            {speaker.title && (
                                                <div className="text-xs text-foreground-tertiary">{speaker.title}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
