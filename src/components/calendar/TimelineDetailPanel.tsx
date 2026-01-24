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
                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Session Details
                    </div>
                    <h2 className="text-2xl font-bold text-white">{event.title}</h2>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <XIcon className="w-5 h-5 text-zinc-400" />
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Time & Location */}
                <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <ClockIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">
                            {formatTimeRange(event.startTime, event.endTime, eventTimezone)}
                        </span>
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-2 text-zinc-300">
                            <MapPinIcon className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium">{event.location}</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                {event.description && (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {event.description}
                        </p>
                    </div>
                )}

                {/* Speakers */}
                {event.speakers && event.speakers.length > 0 && (
                    <div className="pt-6 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Speakers</h3>
                        <div className="space-y-4">
                            {event.speakers.map((speaker) => {
                                const { primary: avatarSrc, fallback: fallbackSrc } = getSpeakerAvatarUrls(speaker, 40);

                                return (
                                    <div key={speaker.id} className="flex items-center gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={avatarSrc}
                                            alt={speaker.name}
                                            className="w-10 h-10 rounded-full object-cover border border-white/10 bg-zinc-800"
                                            onError={(e) => {
                                                if (e.currentTarget.src !== fallbackSrc) {
                                                    e.currentTarget.src = fallbackSrc;
                                                }
                                            }}
                                        />
                                        <div>
                                            <div className="font-medium text-zinc-200">{speaker.name}</div>
                                            {speaker.title && (
                                                <div className="text-xs text-zinc-500">{speaker.title}</div>
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
