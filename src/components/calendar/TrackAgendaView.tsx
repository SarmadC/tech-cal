'use client';

import { FC, useMemo, useState } from 'react';
import { ClockIcon, MapPinIcon, UsersIcon, CaretDown, CaretUp } from '@phosphor-icons/react';

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

    const [selectedTrackNames, setSelectedTrackNames] = useState<Set<string> | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const allTrackNames = useMemo(
        () => tracks.map(t => t.track).sort(),
        [tracks]
    );

    const toggleTrack = (trackName: string) => {
        setSelectedTrackNames(prev => {
            if (prev === null) {
                // If currently showing all (null), switch to specific selection
                // When toggling one *off* from all, we want to keep the others.
                // When toggling one *on* (which shouldn't happen if all are on), it's a no-op?
                // Actually, let's treat null as "All Selected".
                // If I click a track when "All Selected", does it mean "Only this one" or "Toggle this off"?
                // "Toggle this off" is standard. So we initialize the set with all tracks minus the one clicked.
                const newSet = new Set(allTrackNames);
                newSet.delete(trackName);
                return newSet;
            }

            const newSet = new Set(prev);
            if (newSet.has(trackName)) {
                newSet.delete(trackName);
            } else {
                newSet.add(trackName);
            }
            return newSet;
        });
    };

    const selectAll = () => setSelectedTrackNames(null);
    const clearAll = () => setSelectedTrackNames(new Set());

    const orderedTracks = useMemo(
        () => tracks.filter(track => {
            if (selectedTrackNames === null) return true; // Show all by default
            return selectedTrackNames.has(track.track);
        }).filter(track => track.items.length > 0),
        [tracks, selectedTrackNames]
    );

    const visibleTrackNames = useMemo(
        () => orderedTracks.map(t => t.track),
        [orderedTracks]
    );

    // ... existing TimeSlot logic ...

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
        const trackColumns = visibleTrackNames.length
            ? `repeat(${visibleTrackNames.length}, minmax(${MIN_TRACK_WIDTH}px, 1fr))`
            : '';
        return `${TIME_COLUMN_WIDTH}px${trackColumns ? ` ${trackColumns}` : ''}`;
    }, [visibleTrackNames.length]);

    const minGridWidth = useMemo(
        () => TIME_COLUMN_WIDTH + visibleTrackNames.length * MIN_TRACK_WIDTH,
        [visibleTrackNames.length]
    );

    if (tracks.length === 0) {
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
            {/* Track Filter Control */}
            <div className="flex flex-col gap-3 pb-2 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${theme.textPrimary}`}>
                        Filter Tracks
                    </h4>
                    <div className="flex gap-2">
                        <button
                            onClick={selectAll}
                            className={`text-[11px] px-2 py-1 rounded-md hover:bg-white/5 transition-colors ${selectedTrackNames === null ? theme.textPrimary : theme.textMuted}`}
                        >
                            Select All
                        </button>
                        <button
                            onClick={clearAll}
                            className={`text-[11px] px-2 py-1 rounded-md hover:bg-white/5 transition-colors ${selectedTrackNames !== null && selectedTrackNames.size === 0 ? theme.textPrimary : theme.textMuted}`}
                        >
                            Deselect All
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 pr-2">
                    {(isExpanded ? allTrackNames : allTrackNames.slice(0, 12)).map(track => {
                        const accent = getTrackAccent(track);
                        const isSelected = selectedTrackNames === null || selectedTrackNames.has(track);

                        return (
                            <button
                                key={track}
                                onClick={() => toggleTrack(track)}
                                className={`
                                    inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all duration-200
                                    ${isSelected
                                        ? `${accent.bg} ${accent.border} ${accent.text} ring-1 ring-offset-0 ${accent.border}`
                                        : `bg-transparent border-white/10 ${theme.textMuted} hover:border-white/20`}
                                `}
                            >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                                {formatTrackName(track)}
                            </button>
                        );
                    })}

                    {allTrackNames.length > 12 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-white/10 hover:bg-white/5 transition-colors ${theme.textMuted}`}
                        >
                            {isExpanded ? (
                                <>
                                    Show Less <CaretUp size={12} />
                                </>
                            ) : (
                                <>
                                    Show {allTrackNames.length - 12} More <CaretDown size={12} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {visibleTrackNames.length === 0 ? (
                <div className="text-center py-20 border rounded-xl border-dashed border-white/10">
                    <p className={`text-sm ${theme.textMuted}`}>Select at least one track to view the schedule.</p>
                    <button
                        onClick={selectAll}
                        className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
                    >
                        Show All Tracks
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto -mx-6 px-6 track-view-scrollable">
                    <div className="space-y-4" style={{ minWidth: `${minGridWidth}px` }}>
                        {/* Track header row */}
                        <div
                            className="grid items-stretch gap-3"
                            style={{ gridTemplateColumns }}
                        >
                            <div style={{ width: TIME_COLUMN_WIDTH }} aria-hidden="true" />
                            {visibleTrackNames.map(track => {
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
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md border ${accent.border} ${accent.bg} ${accent.text}`}
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
                                        <div className="inline-flex items-center justify-center rounded-md bg-yellow-400/95 text-black text-[12px] font-semibold px-2 py-1 shadow-sm tracking-tight w-[60px]">
                                            {slot.label}
                                        </div>
                                    </div>

                                    {/* Track cells */}
                                    {visibleTrackNames.map(track => {
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
                                                            className={`rounded-xl border p-3 transition-all duration-200 shadow-sm ${theme.bgElevated} ${theme.borderLight} ${theme.hoverBorder} ${theme.hoverCard}`}
                                                        >
                                                            <div className="flex flex-col gap-2">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                                                                            {sessionType}
                                                                        </p>
                                                                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                            {timeDisplay}
                                                                        </span>
                                                                    </div>
                                                                    <h5 className={`text-[13px] font-semibold leading-snug ${theme.textPrimary} line-clamp-3`} title={item.title}>
                                                                        {item.title}
                                                                    </h5>
                                                                </div>

                                                                {item.description && (
                                                                    <p className={`text-[11px] leading-relaxed ${theme.textSecondary} line-clamp-2`}>
                                                                        {item.description}
                                                                    </p>
                                                                )}

                                                                <div className="pt-2 border-t border-white/10 dark:border-white/5 flex flex-wrap items-center gap-2 text-[10px]">
                                                                    {item.location && (
                                                                        <span className={`inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 ${theme.textMuted}`}>
                                                                            <MapPinIcon className="w-3 h-3" />
                                                                            <span className="truncate max-w-[80px]">{item.location}</span>
                                                                        </span>
                                                                    )}
                                                                    {(() => {
                                                                        const speakerCount = item.speakers?.length || (item.speaker ? 1 : 0);
                                                                        if (!speakerCount) return null;
                                                                        return (
                                                                            <span className={`inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 ${theme.textMuted}`}>
                                                                                <UsersIcon className="w-3 h-3" />
                                                                                {speakerCount}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    {item.dayNumber && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-medium text-gray-500">
                                                                            Day {item.dayNumber}
                                                                        </span>
                                                                    )}
                                                                </div>
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
            )}
        </div>
    );
};

export default TrackAgendaView;
