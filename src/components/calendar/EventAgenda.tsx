'use client';

import { FC, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ClockIcon, UserIcon, ArrowSquareOutIcon, CalendarIcon, UsersIcon, CheckCircleIcon, QuestionIcon, CertificateIcon, CoffeeIcon, MusicNotesIcon, BuildingsIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import EventProgress from './EventProgress';

interface EventAgendaProps {
    event: Event;
}

// Helper to get agenda data from event
const getEventAgenda = (event: Event): AgendaItem[] => {
    // Use the event's agenda if available
    if (event.agenda && event.agenda.length > 0) {
        return event.agenda;
    }
    
    // Fallback: return empty array if no agenda data
    return [];
};

const EventAgenda: FC<EventAgendaProps> = ({ event }) => {
    // Use the event's agenda data
    const agenda = getEventAgenda(event);

    // Local UI state for expanding parallel clusters
    const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
    const [openDays, setOpenDays] = useState<Set<number>>(() => new Set());
    const [timelineOrientation, setTimelineOrientation] = useState<'vertical' | 'horizontal'>('vertical');
    const [nowMinutes, setNowMinutes] = useState<number>(() => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    });
    const clusterRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    useEffect(() => {
        const id = setInterval(() => {
            const d = new Date();
            setNowMinutes(d.getHours() * 60 + d.getMinutes());
        }, 60000);
        return () => clearInterval(id);
    }, []);
    const toggleCluster = useCallback((key: string) => {
        setExpandedClusters(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);
    const toggleDay = useCallback((day: number) => {
        setOpenDays(prev => {
            const next = new Set(prev);
            if (next.has(day)) next.delete(day); else next.add(day);
            return next;
        });
    }, []);
    
    const formatTime = (timeString: string) => {
        // Handle time-only strings (e.g., "06:00:00") and full datetime strings
        if (timeString.includes('T') || timeString.includes(' ')) {
            // Full datetime string
            return new Date(timeString).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
            // Time-only string (e.g., "06:00:00")
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    };

    // ----- Agenda grouping and lane/cluster logic -----
    const toMinutes = (timeString: string): number => {
        if (!timeString) return 0;
        if (timeString.includes('T') || timeString.includes(' ')) {
            const d = new Date(timeString);
            return d.getHours() * 60 + d.getMinutes();
        }
        const [h, m] = timeString.split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    };

    const isAllDayLike = useCallback((item: AgendaItem): boolean => {
        const duration = item.durationMinutes ?? Math.max(0, toMinutes(item.endTime) - toMinutes(item.startTime));
        const longWindow = duration >= 360; // 6+ hours
        const typeBand = ['registration', 'support', 'exhibition'].includes(item.type);
        const fullSpan = item.startTime.startsWith('07:') && item.endTime.startsWith('23:');
        return longWindow || typeBand || fullSpan;
    }, []);

    type DayKey = number;
    type TrackKey = string;

    type Cluster = {
        key: string;
        startMin: number;
        endMin: number;
        items: AgendaItem[];
    };

    const groupedByDayAndTrack = useMemo(() => {
        const byDay = new Map<DayKey, {
            allDay: AgendaItem[];
            tracks: Map<TrackKey, Cluster[]>;
            minMinute: number;
            maxMinute: number;
        }>();

        const items = [...agenda];
        for (const item of items) {
            const day = item.dayNumber ?? 1;
            const track = (item.track || 'general').toLowerCase();
            const startMin = toMinutes(item.startTime);
            const endMin = toMinutes(item.endTime);

            if (!byDay.has(day)) {
                byDay.set(day, { allDay: [], tracks: new Map(), minMinute: Number.POSITIVE_INFINITY, maxMinute: 0 });
            }
            const dayEntry = byDay.get(day)!;

            // Update visible minute bounds
            dayEntry.minMinute = Math.min(dayEntry.minMinute, startMin);
            dayEntry.maxMinute = Math.max(dayEntry.maxMinute, endMin);

            if (isAllDayLike(item)) {
                dayEntry.allDay.push(item);
                continue;
            }

            if (!dayEntry.tracks.has(track)) dayEntry.tracks.set(track, []);
            const clusters = dayEntry.tracks.get(track)!;

            // Greedy overlap clustering within track
            const overlaps = (a: Cluster, bStart: number, bEnd: number) => (bStart < a.endMin && a.startMin < bEnd);
            const iStart = startMin;
            const iEnd = endMin;
            let placed = false;
            for (const cluster of clusters) {
                if (overlaps(cluster, iStart, iEnd)) {
                    cluster.items.push(item);
                    cluster.startMin = Math.min(cluster.startMin, iStart);
                    cluster.endMin = Math.max(cluster.endMin, iEnd);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                clusters.push({ key: `${day}-${track}-${clusters.length}`, startMin: iStart, endMin: iEnd, items: [item] });
            }
        }

        // Sort clusters and items for stable rendering
        for (const [, dayEntry] of byDay) {
            for (const [, clusters] of dayEntry.tracks) {
                clusters.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
                clusters.forEach(c => c.items.sort((a, b) => (toMinutes(a.startTime) - toMinutes(b.startTime)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
            }
        }

        return byDay;
    }, [agenda, isAllDayLike]);

    const uniqueTracksForDay = (dayData: { tracks: Map<TrackKey, Cluster[]> }): string[] => {
        return Array.from(dayData.tracks.keys());
    };

    const formatHourLabels = (minMinute: number, maxMinute: number): string[] => {
        const startHour = Math.max(0, Math.floor(minMinute / 60));
        const endHour = Math.min(23, Math.ceil(maxMinute / 60));
        const labels: string[] = [];
        for (let h = startHour; h <= endHour; h++) {
            const date = new Date();
            date.setHours(h, 0, 0, 0);
            labels.push(date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
        }
        return labels;
    };

    const renderLocationChips = (location?: string) => {
        if (!location) return null;
        const parts = location.split(',').map(s => s.trim()).filter(Boolean);
        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {parts.map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[11px] bg-gray-700/50 text-gray-300 rounded-md">{p}</span>
                ))}
            </div>
        );
    };
    
    const getTypeColor = (type: AgendaItem['type']) => {
        // Monochrome badges with subtle variations only by intensity
        switch (type) {
            case 'keynote':
            case 'session':
            case 'workshop':
            case 'panel':
            case 'networking':
            case 'break':
            case 'registration':
            case 'certification':
            case 'support':
            case 'exhibition':
            case 'meal':
            case 'entertainment':
                return 'bg-zinc-800/50 text-zinc-300 border-zinc-700/60';
            default:
                return 'bg-zinc-800/50 text-zinc-300 border-zinc-700/60';
        }
    };
    
    const getTypeIcon = (type: AgendaItem['type']) => {
        switch (type) {
            case 'keynote':
                return <CalendarIcon className="w-4 h-4" />;
            case 'session':
                return <UsersIcon className="w-4 h-4" />;
            case 'workshop':
                return <UserIcon className="w-4 h-4" />;
            case 'panel':
                return <UsersIcon className="w-4 h-4" />;
            case 'networking':
                return <UsersIcon className="w-4 h-4" />;
            case 'break':
                return <ClockIcon className="w-4 h-4" />;
            case 'registration':
                return <CheckCircleIcon className="w-4 h-4" />;
            case 'certification':
                return <CertificateIcon className="w-4 h-4" />;
            case 'support':
                return <QuestionIcon className="w-4 h-4" />;
            case 'exhibition':
                return <BuildingsIcon className="w-4 h-4" />;
            case 'meal':
                return <CoffeeIcon className="w-4 h-4" />;
            case 'entertainment':
                return <MusicNotesIcon className="w-4 h-4" />;
            default:
                return <ClockIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="event-agenda space-y-6">
            <div className="event-agenda-header flex items-center justify-between mb-6">
                <h3 className="event-agenda-title flex items-center text-lg font-semibold text-white">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Event Agenda
                </h3>
                {event.agendaUrl && (
                    <a
                        href={event.agendaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-agenda-external-link flex items-center text-sm text-foreground-secondary hover:text-foreground-primary transition-colors"
                    >
                        <ArrowSquareOutIcon className="w-4 h-4 mr-1" />
                        View Full Agenda
                    </a>
                )}
            </div>

            {/* Event Progress */}
            <EventProgress event={event} agenda={agenda} />
            
            {/* Show agenda lanes by day and track, with all-day band */}
            {agenda.length > 0 ? (
                <div className="space-y-8">
                    {Array.from(groupedByDayAndTrack.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([day, dayData]) => {
                            const trackKeys = uniqueTracksForDay(dayData);
                            const hourLabels = formatHourLabels(dayData.minMinute, dayData.maxMinute);
                            // Build clusters (shared for both orientations)
                            type DayCluster = { key: string; startMin: number; endMin: number; items: AgendaItem[] };
                            const itemsFlat: AgendaItem[] = [];
                            for (const [, trClusters] of dayData.tracks) {
                                for (const c of trClusters) for (const it of c.items) itemsFlat.push(it);
                            }
                            const seenIds = new Set<string>();
                            const ordered = itemsFlat.filter(it => (seenIds.has(it.id) ? false : (seenIds.add(it.id), true)))
                                .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                            const dayClusters: DayCluster[] = [];
                            for (const it of ordered) {
                                const s = toMinutes(it.startTime);
                                const e = toMinutes(it.endTime);
                                const last = dayClusters[dayClusters.length - 1];
                                if (!last || !(s < last.endMin && last.startMin < e)) {
                                    dayClusters.push({ key: `${day}-cluster-${dayClusters.length}`, startMin: s, endMin: e, items: [it] });
                                } else {
                                    last.items.push(it);
                                    last.startMin = Math.min(last.startMin, s);
                                    last.endMin = Math.max(last.endMin, e);
                                }
                            }

                            const jumpToNext = () => {
                                const target = dayClusters.find(c => c.endMin >= nowMinutes);
                                if (!target) return;
                                const el = clusterRefs.current.get(target.key);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                                setExpandedClusters(prev => new Set(prev).add(target.key));
                            };

                            return (
                                <div key={day} className="border border-gray-800 rounded-lg overflow-hidden">
                                    {/* Accordion header */}
                                    <button
                                        onClick={() => toggleDay(day)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/60 hover:bg-gray-900/80"
                                        aria-expanded={openDays.has(day)}
                                        aria-controls={`day-panel-${day}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon className="w-5 h-5 text-gray-300" />
                                            <span className="text-white font-semibold">Day {day}</span>
                                            <span className="text-xs text-gray-400">{trackKeys.length} tracks</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="hidden sm:flex items-center text-[11px] text-gray-400 gap-1">
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    className={`px-2 py-1 rounded cursor-pointer ${timelineOrientation === 'vertical' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50'}`}
                                                    onClick={(e) => { e.stopPropagation(); setTimelineOrientation('vertical'); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setTimelineOrientation('vertical'); } }}
                                                >Vertical</span>
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    className={`px-2 py-1 rounded cursor-pointer ${timelineOrientation === 'horizontal' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50'}`}
                                                    onClick={(e) => { e.stopPropagation(); setTimelineOrientation('horizontal'); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setTimelineOrientation('horizontal'); } }}
                                                >Horizontal</span>
                                            </div>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); jumpToNext(); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); jumpToNext(); } }}
                                                className="hidden sm:inline px-2 py-1 text-[11px] rounded cursor-pointer hover:bg-gray-800/50 text-gray-300"
                                            >Jump to next</span>
                                            <span className="text-sm text-gray-300">{openDays.has(day) ? 'Hide' : 'Show'}</span>
                                        </div>
                                    </button>

                                    {/* Accordion panel */}
                                    {openDays.has(day) && (
                                        <div id={`day-panel-${day}`} className="p-4 space-y-4">
                                            {/* All-day band */}
                                            {dayData.allDay.length > 0 && (
                                                <div className="bg-gray-800/40 border border-gray-700/60 rounded-md p-3">
                                                    <div className="text-xs text-gray-400 mb-2">All-day and ongoing</div>
                                                    <div className="flex gap-2 overflow-x-auto">
                                                        {dayData.allDay.map((item) => (
                                                            <div key={item.id} className="min-w-[220px] bg-gray-800/60 border border-gray-700/60 rounded-md p-3">
                                                                <div className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                                                                    <span className={`px-2 py-0.5 rounded-full border ${getTypeColor(item.type)}`}>{getTypeIcon(item.type)}<span className="ml-1 capitalize">{item.type}</span></span>
                                                                    <span className="text-gray-400">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                                                                </div>
                                                                <div className="text-sm text-white font-medium truncate">{item.title}</div>
                                                                {renderLocationChips(item.location)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Branching timeline (diverts on overlaps) */}
                                            {timelineOrientation === 'vertical' ? (
                                            <div className="flex gap-3">
                                                {/* Time rail */}
                                                <div className="flex flex-col items-end pr-2 text-[11px] text-gray-400 select-none">
                                                    {hourLabels.map((h, i) => (
                                                        <div key={i} className="h-10 flex items-start">{h}</div>
                                                    ))}
                            </div>
                                                {/* Clusters stacked vertically; parallel sessions side-by-side */}
                                                <div className="flex-1">
                                                    {(() => {
                                                        const clusters = dayClusters;
                                                        if (clusters.length === 0) return null;

                                                        // Compute rail start and pixel mapping so cards align to time
                                                        const railStartHour = Math.max(0, Math.floor(dayData.minMinute / 60));
                                                        const pxPerMinute = 40 / 60; // 40px per hour rows

                                                        return (
                                                            <div className="relative" style={{ height: `${hourLabels.length * 40}px` }}>
                                                                {/* Central day rail */
                                                                }
                                                                <div className="absolute top-0 bottom-0 w-px bg-gray-700/80" style={{ left: '1.5rem' }} />
                                                                {/* Now marker */}
                                                                {nowMinutes >= dayData.minMinute && nowMinutes <= dayData.maxMinute && (
                                                                    <div className="absolute left-0 right-0 h-px bg-red-500/70" style={{ top: `${(nowMinutes - railStartHour * 60) * pxPerMinute}px` }} />
                                                                )}

                                                                {/* Vertical connectors between cluster dots */}
                                                                {clusters.map((cl, idx) => {
                                                                    if (idx === clusters.length - 1) return null;
                                                                    const currTop = Math.max(0, (cl.startMin - railStartHour * 60) * pxPerMinute) + 4;
                                                                    const nextTop = Math.max(0, (clusters[idx + 1].startMin - railStartHour * 60) * pxPerMinute) + 4;
                                                                    const height = Math.max(0, nextTop - currTop);
                                                                    return (
                                                                        <div key={`${cl.key}-connector`} className="absolute w-px bg-gray-700/80" style={{ left: '1.5rem', top: `${currTop}px`, height: `${height}px` }} />
                                                                    );
                                                                })}

                                                                {clusters.map((cl) => {
                                                                    const expanded = expandedClusters.has(cl.key);
                                                                    const visible = expanded ? cl.items : cl.items.slice(0, Math.min(3, cl.items.length));
                                                                    const remaining = cl.items.length - visible.length;
                                                                    const timeLabel = `${formatTime(`${String(Math.floor(cl.startMin / 60)).padStart(2, '0')}:${String(cl.startMin % 60).padStart(2, '0')}`)} - ${formatTime(`${String(Math.floor(cl.endMin / 60)).padStart(2, '0')}:${String(cl.endMin % 60).padStart(2, '0')}`)}`;
                                                                    const cols = Math.min(Math.max(visible.length, 1), 3);
                                                                    const topPx = Math.max(0, (cl.startMin - railStartHour * 60) * pxPerMinute);

                                                                    // Choose main branch item (first by time), others branch to the right
                                                                    const [mainItem, ...otherItems] = visible;

                                                                    return (
                                                                        <div key={cl.key} ref={(el) => { if (el) clusterRefs.current.set(cl.key, el); }} className="absolute right-0" style={{ top: `${topPx}px`, left: '0' }}>
                                                                            {/* Dot on the rail */}
                                                                            <div className="absolute w-2 h-2 rounded-full bg-gray-300 border border-gray-500" style={{ left: 'calc(1.5rem - 4px)', top: '6px' }} />

                                                                            {/* Main branch and optional parallel branches */}
                                                                            <div className="pl-12 pr-2">
                                                                                {/* Horizontal connector from rail to main card */}
                                                                                <div className="absolute h-px bg-gray-600" style={{ left: '1.5rem', right: 'auto', width: '1.5rem', top: '16px' }} />

                                                                                <div className="flex gap-2 items-stretch">
                                                                                    {/* Main card */}
                                                                                    {mainItem && (
                                                                                        <div className="bg-gray-800/40 border border-gray-700/60 rounded-md p-2 min-w-[220px] transition-all duration-300 ease-out">
                                                                                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                                                                    <span>{timeLabel}</span>
                                                                                                </div>
                                                                                                {cl.items.length > 1 && (
                                                                                                    <button className="text-foreground-secondary hover:text-white" onClick={() => toggleCluster(cl.key)}>
                                                                                                        {expanded ? 'Collapse' : remaining > 0 ? `+${remaining} more` : `${cl.items.length} parallel`}
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                                                                                <span>{formatTime(mainItem.startTime)} - {formatTime(mainItem.endTime)}</span>
                                                                                                <span className={`px-2 py-0.5 rounded-full border ${getTypeColor(mainItem.type)}`}>{getTypeIcon(mainItem.type)}<span className="ml-1 capitalize">{mainItem.type}</span></span>
                                                                                            </div>
                                                                                            <div className="text-sm text-white font-medium">{mainItem.title}</div>
                                                                                            {mainItem.description && (
                                                                                                <div className="text-xs text-gray-300 mt-0.5 line-clamp-2">{mainItem.description}</div>
                                                                                            )}
                                                                                            {renderLocationChips(mainItem.location)}
                                                                                            {mainItem.speaker && (
                                                                                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                                                                    <UserIcon className="w-3.5 h-3.5" />
                                                                                                    <span>{mainItem.speaker.name}</span>
                                                                                                    {mainItem.speaker.title && <><span>•</span><span>{mainItem.speaker.title}</span></>}
                                                                                                </div>
                                        )}
                                    </div>
                                )}
                                
                                                                                    {/* Branched parallel cards */}
                                                                                    {otherItems.length > 0 && (
                                                                                        <div className="flex-1">
                                                                                            {/* small tee connector from main to branches */}
                                                                                            <div className="relative">
                                                                                                <div className="absolute left-[-12px] top-1/2 h-px w-3 bg-gray-600" />
                                                                                            </div>
                                                                                            <div className="grid gap-2 transition-all duration-300 ease-out" style={{ gridTemplateColumns: `repeat(${Math.min(otherItems.length, cols - 1 + (mainItem ? 0 : 1)) || otherItems.length}, minmax(0, 1fr))` }}>
                                                                                                {otherItems.map((item) => (
                                                                                                    <div key={item.id} className="bg-gray-800/40 border border-gray-700/60 rounded-md p-2 min-w-[200px] transition-all duration-300 ease-out">
                                                                                                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                                                                                            <span>{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                                                                                                            <span className={`px-2 py-0.5 rounded-full border ${getTypeColor(item.type)}`}>{getTypeIcon(item.type)}<span className="ml-1 capitalize">{item.type}</span></span>
                                    </div>
                                                                                                        <div className="text-sm text-white font-medium">{item.title}</div>
                                                                                                        {item.description && (
                                                                                                            <div className="text-xs text-gray-300 mt-0.5 line-clamp-2">{item.description}</div>
                                                                                                        )}
                                                                                                        {renderLocationChips(item.location)}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            ) : (
                                            <div className="space-y-2">
                                                {(() => {
                                                    const dayItems: AgendaItem[] = [];
                                                    for (const [, clusters] of dayData.tracks) {
                                                        for (const c of clusters) {
                                                            for (const it of c.items) dayItems.push(it);
                                                        }
                                                    }
                                                    const seen = new Set<string>();
                                                    const unique = dayItems.filter(it => (seen.has(it.id) ? false : (seen.add(it.id), true)));
                                                    unique.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

                                                    type DayCluster = { key: string; startMin: number; endMin: number; items: AgendaItem[] };
                                                    const clusters: DayCluster[] = [];
                                                    for (const it of unique) {
                                                        const s = toMinutes(it.startTime);
                                                        const e = toMinutes(it.endTime);
                                                        const last = clusters[clusters.length - 1];
                                                        if (!last || !(s < last.endMin && last.startMin < e)) {
                                                            clusters.push({ key: `${day}-h-${clusters.length}`, startMin: s, endMin: e, items: [it] });
                                                        } else {
                                                            last.items.push(it);
                                                            last.startMin = Math.min(last.startMin, s);
                                                            last.endMin = Math.max(last.endMin, e);
                                                        }
                                                    }

                                                    if (clusters.length === 0) return null;

                                                    const startMin = dayData.minMinute;
                                                    const endMin = dayData.maxMinute;
                                                    const span = Math.max(60, endMin - startMin);
                                                    const pxPerMinute = 2.5;
                                                    const widthPx = span * pxPerMinute + 120;
                                                    const railY = 140;

                                                    return (
                                                        <div className="relative overflow-x-auto" style={{ height: '280px' }}>
                                                            <div className="relative" style={{ width: `${widthPx}px`, height: '100%' }}>
                                                                <div className="absolute left-0 right-0 h-px bg-gray-700/80" style={{ top: `${railY}px` }} />
                                                                {clusters.map((cl) => {
                                                                    const x = (cl.startMin - startMin) * pxPerMinute;
                                                                    const expanded = expandedClusters.has(cl.key);
                                                                    const items = expanded ? cl.items : cl.items.slice(0, Math.min(3, cl.items.length));
                                                                    const remaining = cl.items.length - items.length;
                                                                    const timeLabel = `${formatTime(`${String(Math.floor(cl.startMin / 60)).padStart(2, '0')}:${String(cl.startMin % 60).padStart(2, '0')}`)} - ${formatTime(`${String(Math.floor(cl.endMin / 60)).padStart(2, '0')}:${String(cl.endMin % 60).padStart(2, '0')}`)}`;
                                                                    const [mainItem, ...branches] = items;
                                                                    return (
                                                                        <div key={cl.key} className="absolute" style={{ left: `${x}px`, top: 0 }}>
                                                                            <div className="absolute w-2 h-2 rounded-full bg-gray-300 border border-gray-500" style={{ top: `${railY - 4}px`, left: '-1px' }} />
                                                                            {mainItem && (
                                                                                <div className="absolute" style={{ top: `${railY - 110}px`, left: '12px' }}>
                                                                                    <div className="h-px bg-gray-600 absolute left-[-12px] right-auto w-3 top-3" />
                                                                                    <div className="bg-gray-800/40 border border-gray-700/60 rounded-md p-2 min-w-[220px]">
                                                                                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <ClockIcon className="w-3.5 h-3.5" />
                                                                                                <span>{timeLabel}</span>
                                                                                            </div>
                                                                                            {cl.items.length > 1 && (
                                                                                                <button className="text-foreground-secondary hover:text-white" onClick={() => toggleCluster(cl.key)}>
                                                                                                    {expanded ? 'Collapse' : remaining > 0 ? `+${remaining} more` : `${cl.items.length} parallel`}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                                                                            <span>{formatTime(mainItem.startTime)} - {formatTime(mainItem.endTime)}</span>
                                                                                            <span className={`px-2 py-0.5 rounded-full border ${getTypeColor(mainItem.type)}`}>{getTypeIcon(mainItem.type)}<span className="ml-1 capitalize">{mainItem.type}</span></span>
                                                                                        </div>
                                                                                        <div className="text-sm text-white font-medium">{mainItem.title}</div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {branches.length > 0 && (
                                                                                <div className="absolute" style={{ top: `${railY + 12}px`, left: '12px' }}>
                                                                                    <div className="h-px bg-gray-600 absolute left-[-12px] right-auto w-3 top-3" />
                                                                                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(branches.length, 3)}, minmax(220px, 1fr))` }}>
                                                                                        {branches.map((item) => (
                                                                                            <div key={item.id} className="bg-gray-800/40 border border-gray-700/60 rounded-md p-2 min-w-[220px]">
                                                                                                <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                                                                                    <span>{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                                                                                                    <span className={`px-2 py-0.5 rounded-full border ${getTypeColor(item.type)}`}>{getTypeIcon(item.type)}<span className="ml-1 capitalize">{item.type}</span></span>
                                                                                                </div>
                                                                                                <div className="text-sm text-white font-medium">{item.title}</div>
                    </div>
                ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            ) : (
                <div className="event-agenda-empty text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">
                        No agenda details available for this event.
                    </p>
                    {event.agendaUrl && (
                        <a
                            href={event.agendaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center mt-2 text-foreground-secondary hover:text-foreground-primary transition-colors text-sm"
                        >
                            <ArrowSquareOutIcon className="w-4 h-4 mr-1" />
                            Check event website for agenda
                        </a>
                    )}
                </div>
            )}
            
            {event.speakerLineup && event.speakerLineup.length > 0 && (
                <div className="event-agenda-speakers mt-6 pt-6 border-t border-gray-700">
                    <h4 className="event-agenda-speakers-title text-md font-semibold text-white mb-4">Featured Speakers</h4>
                    <div className="event-agenda-speakers-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {event.speakerLineup.slice(0, 3).map((speaker) => (
                            <div key={speaker.id} className="event-agenda-speaker-card flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                                {speaker.photoUrl && (
                                    <Image
                                        src={speaker.photoUrl}
                                        alt={speaker.name}
                                        width={40}
                                        height={40}
                                        className="event-agenda-speaker-photo w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    />
                                )}
                                <div className="event-agenda-speaker-info flex-1 min-w-0">
                                    <h5 className="event-agenda-speaker-name text-white font-medium">{speaker.name}</h5>
                                    {speaker.title && (
                                        <p className="event-agenda-speaker-title text-sm text-gray-400">{speaker.title}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventAgenda;
