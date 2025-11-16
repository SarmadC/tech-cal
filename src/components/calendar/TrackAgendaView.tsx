'use client';

import { FC, useMemo } from 'react';
import { ClockIcon, MapPinIcon, UsersIcon } from '@phosphor-icons/react';

import { AgendaItem } from '@/types';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { formatTimelineTime, formatTrackName } from '@/utils/timelineUtils';

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
}

const TrackAgendaView: FC<TrackAgendaViewProps> = ({ tracks }) => {
    const theme = useTimelineTheme();

    const orderedTracks = useMemo(() => tracks.filter(track => track.items.length > 0), [tracks]);

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
            <div className="grid gap-4 lg:grid-cols-2">
                {orderedTracks.map(({ track, items }) => {
                    const accent = getTrackAccent(track);
                    return (
                    <section
                        key={track}
                        className={`rounded-2xl border p-4 md:p-6 backdrop-blur-sm ${theme.bgCard} ${theme.borderCard}`}
                        aria-label={`${formatTrackName(track)} track`}
                    >
                        <header className="flex items-center justify-between gap-3">
                            <div>
                                <p className={`text-xs uppercase tracking-wide ${theme.textMuted}`}>
                                    Track
                                </p>
                                <h4 className={`text-lg font-semibold ${theme.textPrimary}`}>
                                    {formatTrackName(track)}
                                </h4>
                            </div>
                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full border ${accent.border} ${accent.bg} ${accent.text}`}>
                                <span className="w-2 h-2 rounded-full bg-current opacity-80"></span>
                                {items.length} session{items.length !== 1 ? 's' : ''}
                            </span>
                        </header>

                        <div className="mt-5 space-y-4">
                            {items.map(item => {
                                const startLabel = formatTimelineTime(item.startTime);
                                const endLabel = item.endTime ? formatTimelineTime(item.endTime) : 'TBD';
                                const sessionType = item.type || 'Session';

                                return (
                                    <article
                                        key={`${track}-${item.id}-${item.startTime}`}
                                        className={`rounded-xl border p-4 transition-all duration-200 ${theme.bgElevated} ${theme.borderLight} ${theme.hoverBorder} ${theme.hoverCard}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className={`text-xs font-medium uppercase tracking-tight ${theme.textMuted}`}>
                                                    {sessionType}
                                                </p>
                                                <h5 className={`text-base font-semibold ${theme.textPrimary}`}>
                                                    {item.title}
                                                </h5>
                                            </div>
                                            <div className="flex flex-col items-end text-right text-xs text-gray-500 dark:text-gray-400">
                                                <span className="inline-flex items-center gap-1 font-medium">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    {startLabel} – {endLabel}
                                                </span>
                                                {item.dayNumber && (
                                                    <span className="mt-1">
                                                        Day {item.dayNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {item.description && (
                                            <p className={`mt-2 text-sm leading-relaxed ${theme.textSecondary}`}>
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                                            {item.location && (
                                                <span className={`inline-flex items-center gap-1 ${theme.textMuted}`}>
                                                    <MapPinIcon className="w-4 h-4" />
                                                    {item.location}
                                                </span>
                                            )}
                                            {(() => {
                                                const speakerCount = item.speakers?.length || (item.speaker ? 1 : 0);
                                                if (!speakerCount) return null;
                                                return (
                                                    <span className={`inline-flex items-center gap-1 ${theme.textMuted}`}>
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
                    </section>
                );
                })}
            </div>
        </div>
    );
};

export default TrackAgendaView;

