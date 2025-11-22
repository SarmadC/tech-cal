'use client';

import { FC, useMemo } from 'react';
import { ClockIcon, MapPinIcon, UsersIcon } from '@phosphor-icons/react';

import { AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimeRange as formatEventTimeRange } from '@/utils/dateUtils';
import { formatTrackName } from '@/utils/timelineUtils';

export type TrackGroup = {
    track: string;
    items: AgendaItem[];
};

const TRACK_ACCENTS = [
    {
        bg: 'bg-rose-500/10 dark:bg-rose-400/15',
        text: 'text-rose-600 dark:text-rose-200',
        border: 'border-rose-500/30 dark:border-rose-400/40'
    },
    {
        bg: 'bg-amber-500/10 dark:bg-amber-400/15',
        text: 'text-amber-600 dark:text-amber-100',
        border: 'border-amber-500/30 dark:border-amber-400/40'
    },
    {
        bg: 'bg-emerald-500/10 dark:bg-emerald-400/15',
        text: 'text-emerald-600 dark:text-emerald-200',
        border: 'border-emerald-500/30 dark:border-emerald-400/40'
    },
    {
        bg: 'bg-sky-500/10 dark:bg-sky-400/15',
        text: 'text-sky-600 dark:text-sky-100',
        border: 'border-sky-500/30 dark:border-sky-400/40'
    },
    {
        bg: 'bg-indigo-500/10 dark:bg-indigo-400/15',
        text: 'text-indigo-600 dark:text-indigo-200',
        border: 'border-indigo-500/30 dark:border-indigo-400/40'
    },
    {
        bg: 'bg-pink-500/10 dark:bg-pink-400/15',
        text: 'text-pink-600 dark:text-pink-200',
        border: 'border-pink-500/30 dark:border-pink-400/40'
    }
] as const;

const hashTrack = (track: string = 'track'): number => {
    let hash = 0;
    for (let i = 0; i < track.length; i += 1) {
        hash = (hash << 5) - hash + track.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

export const getTrackAccent = (track: string = 'track') => {
    const palette = TRACK_ACCENTS[hashTrack(track) % TRACK_ACCENTS.length];
    return palette;
};

export const groupAgendaByTrack = (agenda: AgendaItem[] = []): TrackGroup[] => {
    const groups = agenda.reduce<Record<string, AgendaItem[]>>((acc, item) => {
        const track = item.track?.trim();
        if (!track) {
            return acc;
        }

        if (!acc[track]) {
            acc[track] = [];
        }

        acc[track].push(item);
        return acc;
    }, {});

    return Object.entries(groups)
        .map(([track, items]) => ({
            track,
            items: [...items].sort((a, b) => {
                const startA = new Date(a.startTime).getTime();
                const startB = new Date(b.startTime).getTime();
                return startA - startB;
            })
        }))
        .sort((a, b) => a.track.localeCompare(b.track, undefined, { sensitivity: 'base' }));
};

interface TrackAgendaViewProps {
    tracks: TrackGroup[];
    timezone?: string | null;
}

const TIME_COLUMN_WIDTH = 84; // px
const MIN_TRACK_WIDTH = 220; // px

const TrackAgendaView: FC<TrackAgendaViewProps> = ({ tracks, timezone }) => {
    const theme = useTimelineTheme();
    const eventTimezone = timezone;

    const orderedTracks = useMemo(
        () => tracks.filter(track => track.items.length > 0),
        [tracks]
    );

    const trackNames = useMemo(
        () => orderedTracks.map(t => t.track),
        [orderedTracks]
    );

    type TimeSlot = {
        key: string;
        label: string;
        minutes: number;
        itemsByTrack: Record<string, AgendaItem[]>;
    };

    const timeSlots: TimeSlot[] = useMemo(() => {
        const slots: Record<string, TimeSlot> = {};

        const toMinutesAndLabel = (timeString: string): { minutes: number; label: string } => {
            if (!timeString) {
                return { minutes: 0, label: '' };
            }

            // Handle ISO strings and time-only strings
            if (timeString.includes('T') || timeString.includes(' ')) {
                const d = new Date(timeString);
                const hours = d.getHours();
                const minutes = d.getMinutes();
                const label = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                return { minutes: hours * 60 + minutes, label };
            }

            const [h, m] = timeString.split(':');
            const hours = parseInt(h || '0', 10);
            const minutes = parseInt(m || '0', 10);
            const label = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            return { minutes: hours * 60 + minutes, label };
        };

        orderedTracks.forEach(({ track, items }) => {
            items.forEach(item => {
                const { minutes, label } = toMinutesAndLabel(item.startTime);
                if (!label) return;

                const key = label;
                if (!slots[key]) {
                    slots[key] = {
                        key,
                        label,
                        minutes,
                        itemsByTrack: {}
                    };
                }

                if (!slots[key].itemsByTrack[track]) {
                    slots[key].itemsByTrack[track] = [];
                }

                slots[key].itemsByTrack[track].push(item);
            });
        });

        return Object.values(slots).sort((a, b) => a.minutes - b.minutes);
    }, [orderedTracks]);

    const gridTemplateColumns = useMemo(() => {
        const trackColumns = trackNames.length
            ? `repeat(${trackNames.length}, minmax(${MIN_TRACK_WIDTH}px, 1fr))`
            : '';
        return `${TIME_COLUMN_WIDTH}px${trackColumns ? ` ${trackColumns}` : ''}`;
    }, [trackNames.length]);

    const minGridWidth = useMemo(
        () => TIME_COLUMN_WIDTH + trackNames.length * MIN_TRACK_WIDTH,
        [trackNames.length]
    );

    if (orderedTracks.length === 0) {
        return (
            <div className="text-center py-10">
                <p className={`text-sm ${theme.textMuted}`}>
                    Track assignments are not available for this agenda.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="overflow-x-auto -mx-6 px-6 track-view-scrollable">
                <div className="space-y-4" style={{ minWidth: `${minGridWidth}px` }}>
                    {/* Track header row */}
                    <div
                        className="grid items-stretch gap-3"
                        style={{ gridTemplateColumns }}
                    >
                        <div style={{ width: TIME_COLUMN_WIDTH }} aria-hidden="true" />
                        {trackNames.map(track => {
                            const accent = getTrackAccent(track);
                            return (
                                <div
                                    key={track}
                                    className={`rounded-2xl border px-4 py-3 shadow-sm transition-colors ${theme.bgCard} ${theme.borderCard}`}
                                    aria-label={`${formatTrackName(track)} track`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`text-sm font-semibold tracking-tight truncate ${theme.textPrimary}`}
                                            title={formatTrackName(track)}
                                        >
                                            {formatTrackName(track)}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${accent.border} ${accent.bg} ${accent.text}`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                                            Track
                                        </span>
                                    </div>
                                    <p className={`mt-1 text-[12px] ${theme.textMuted}`}>
                                        Sessions scheduled
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time rows */}
                    <div className="space-y-3">
                        {timeSlots.map(slot => (
                            <div
                                key={slot.key}
                                className="grid items-stretch gap-3"
                                data-testid={`time-row-${slot.key}`}
                                style={{ gridTemplateColumns }}
                            >
                                {/* Time rail */}
                                <div className="flex items-start justify-center">
                                    <div className="inline-flex items-center justify-center rounded-full bg-yellow-400/95 text-black text-[12px] font-semibold px-3 py-1 shadow-sm tracking-tight">
                                        {slot.label}
                                    </div>
                                </div>

                                {/* Track cells */}
                                {trackNames.map(track => {
                                    const items = slot.itemsByTrack[track] || [];

                                    if (items.length === 0) {
                                        return (
                                            <div
                                                key={track}
                                                data-testid={`cell-${slot.key}-${track}`}
                                                className="min-h-[3.5rem] rounded-2xl border border-dashed border-white/5 dark:border-white/10"
                                            />
                                        );
                                    }

                                    return (
                                        <div
                                            key={track}
                                            data-testid={`cell-${slot.key}-${track}`}
                                            className="space-y-3"
                                        >
                                            {items.map(item => {
                                                const timeDisplay = item.endTime
                                                    ? formatEventTimeRange(item.startTime, item.endTime, eventTimezone)
                                                    : `${formatEventTimeRange(item.startTime, undefined, eventTimezone)} – TBD`;
                                                const sessionType = item.type || 'Session';

                                                return (
                                                    <article
                                                        key={`${track}-${item.id}-${item.startTime}`}
                                                        className={`rounded-2xl border px-5 py-4 transition-all duration-200 shadow-sm ${theme.bgElevated} ${theme.borderLight} ${theme.hoverBorder} ${theme.hoverCard}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>
                                                                    {sessionType}
                                                                </p>
                                                                <h5 className={`text-base font-semibold leading-snug ${theme.textPrimary}`}>
                                                                    {item.title}
                                                                </h5>
                                                            </div>
                                                            <div className="flex flex-col items-end text-right text-[12px] text-gray-600 dark:text-gray-300 gap-1">
                                                                <span className="inline-flex items-center gap-1.5 font-semibold">
                                                                    <ClockIcon className="w-4 h-4" />
                                                                    {timeDisplay}
                                                                </span>
                                                                {item.dayNumber && (
                                                                    <span className="px-2 py-0.5 rounded-full border border-white/10 text-[11px] font-medium">
                                                                        Day {item.dayNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {item.description && (
                                                            <p className={`mt-3 text-[13px] leading-relaxed ${theme.textSecondary}`}>
                                                                {item.description}
                                                            </p>
                                                        )}

                                                        <div className="mt-4 pt-3 border-t border-white/10 dark:border-white/5 flex flex-wrap items-center gap-3 text-[12px]">
                                                            {item.location && (
                                                                <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 ${theme.textMuted}`}>
                                                                    <MapPinIcon className="w-4 h-4" />
                                                                    {item.location}
                                                                </span>
                                                            )}
                                                            {(() => {
                                                                const speakerCount = item.speakers?.length || (item.speaker ? 1 : 0);
                                                                if (!speakerCount) return null;
                                                                return (
                                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 ${theme.textMuted}`}>
                                                                        <UsersIcon className="w-4 h-4" />
                                                                        {speakerCount} speaker{speakerCount !== 1 ? 's' : ''}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackAgendaView;
