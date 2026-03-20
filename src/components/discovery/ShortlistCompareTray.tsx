'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { format } from 'date-fns';
import { ArrowsOutCardinal, X } from '@phosphor-icons/react';
import { getEventFormat, isEventFree } from '@/utils/filterCountUtils';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

interface ShortlistCompareTrayProps {
    events: EventWithImpact[];
    onRemove: (eventId: string) => void;
    onClear: () => void;
    onSelectEvent?: (event: EventWithImpact) => void;
}

const ShortlistCompareTray: React.FC<ShortlistCompareTrayProps> = ({
    events,
    onRemove,
    onClear,
    onSelectEvent,
}) => {
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        if (events.length < 2) {
            setExpanded(false);
        }
    }, [events.length]);

    if (events.length === 0) {
        return null;
    }

    return (
        <div className="mobile-fixed-panel fixed bottom-[calc(var(--mobile-app-tabbar-offset)-0.25rem)] left-4 right-4 z-[115] rounded-xl border border-border/80 bg-background/95 shadow-xl backdrop-blur-md md:bottom-6 md:left-auto md:right-4 md:w-[420px]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60">
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Shortlist</p>
                    <p className="text-sm font-medium text-foreground">{events.length} event{events.length === 1 ? '' : 's'} saved for compare</p>
                </div>

                <div className="flex items-center gap-2">
                    {events.length >= 2 && (
                        <button
                            type="button"
                            onClick={() => setExpanded((prev) => !prev)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent/40"
                        >
                            <ArrowsOutCardinal size={12} />
                            {expanded ? 'Collapse' : 'Compare'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:thin]">
                {events.map((event) => (
                    <div key={event.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 pl-3 pr-2 py-1 whitespace-nowrap">
                        <button
                            type="button"
                            onClick={() => onSelectEvent?.(event)}
                            className="text-xs text-foreground hover:underline"
                        >
                            {event.title}
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(event.id)}
                            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${event.title} from shortlist`}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {expanded && events.length >= 2 && (
                <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {events.slice(0, 4).map((event) => {
                            const startDate = new Date(event.startTime);
                            const score = Math.round(Math.max(0, Math.min(100, event.careerImpact?.overall ?? 0)));

                            return (
                                <button
                                    key={`compare-${event.id}`}
                                    type="button"
                                    onClick={() => onSelectEvent?.(event)}
                                    className="text-left rounded-lg border border-border bg-card/70 px-3 py-2 hover:bg-card transition-colors"
                                >
                                    <p className="text-sm font-medium text-foreground line-clamp-2">{event.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{format(startDate, 'MMM d, h:mm a')}</p>
                                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span>{getEventFormat(event) === 'virtual' ? 'Remote' : getEventFormat(event) === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
                                        <span>•</span>
                                        <span>{isEventFree(event) ? 'Free' : 'Paid'}</span>
                                        <span>•</span>
                                        <span>{score}% fit</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShortlistCompareTray;
