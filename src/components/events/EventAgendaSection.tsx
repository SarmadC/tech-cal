'use client';

import { FC, useState, useMemo } from 'react';
import { Event, AgendaItem } from '@/types';
import AdaptiveTimeline from '@/components/calendar/AdaptiveTimeline';
import TrackAgendaView, { groupAgendaByTrack } from '@/components/calendar/TrackAgendaView';

interface EventAgendaSectionProps {
    event: Event & { agenda: AgendaItem[] };
    timezone?: string | null;
    title?: string;
}

export const EventAgendaSection: FC<EventAgendaSectionProps> = ({ event, timezone, title }) => {
    const [agendaView, setAgendaView] = useState<'timeline' | 'tracks'>('timeline');

    // Group agenda by track to check if we have track data
    const trackGroups = useMemo(() => groupAgendaByTrack(event.agenda || []), [event.agenda]);
    const hasTrackAgenda = trackGroups.length > 0;

    // If no agenda data, don't render
    if (!event.agenda || event.agenda.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                {title && (
                    <h2 className="text-sm font-semibold text-foreground-secondary">
                        {title}
                    </h2>
                )}
                {/* View Toggle - Only show if tracks exist */}
                {hasTrackAgenda && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-background-secondary/50 backdrop-blur px-1 py-1">
                        <button
                            type="button"
                            onClick={() => setAgendaView('timeline')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                agendaView === 'timeline'
                                    ? 'bg-foreground-primary text-background-main shadow-sm ring-1 ring-foreground-primary/30'
                                    : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary/70'
                            }`}
                            aria-pressed={agendaView === 'timeline'}
                        >
                            Timeline
                        </button>
                        <button
                            type="button"
                            onClick={() => setAgendaView('tracks')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                agendaView === 'tracks'
                                    ? 'bg-foreground-primary text-background-main shadow-sm ring-1 ring-foreground-primary/30'
                                    : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-secondary/70'
                            }`}
                            aria-pressed={agendaView === 'tracks'}
                        >
                            Tracks
                        </button>
                    </div>
                )}
            </div>

            {/* Agenda View */}
            {agendaView === 'tracks' && hasTrackAgenda ? (
                <TrackAgendaView tracks={trackGroups} timezone={timezone} />
            ) : (
                <AdaptiveTimeline event={event} />
            )}
        </div>
    );
};

export default EventAgendaSection;
