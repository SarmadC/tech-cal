'use client';

import Link from 'next/link';
import type { AgendaItem } from '@/types/events';

interface EventAgendaTimelineProps {
    agenda: AgendaItem[];
    eventSlug: string;
    maxItems?: number;
}

function formatTime(isoString: string): string {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '';
    }
}

function getSpeakerDisplay(item: AgendaItem): string | null {
    const speakers = item.speakers || (item.speaker ? [item.speaker] : []);
    if (speakers.length === 0) return null;

    const first = speakers[0];
    const name = first.name;
    const company = first.company ? `, ${first.company}` : '';

    if (speakers.length === 1) {
        return `${name}${company}`;
    }

    return `${name} +${speakers.length - 1} more`;
}

export function EventAgendaTimeline({
    agenda,
    eventSlug,
    maxItems = 5,
}: EventAgendaTimelineProps) {
    if (!agenda || agenda.length === 0) return null;

    // Sort by startTime or sortOrder, then limit
    const sortedAgenda = [...agenda]
        .sort((a, b) => {
            if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
                return a.sortOrder - b.sortOrder;
            }
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        })
        .slice(0, maxItems);

    const remainingCount = agenda.length - maxItems;

    return (
        <div className="pb-6 border-b border-white/[0.08]">
            <p className="text-[13px] text-[#8A8F98] font-medium mb-2">
                Schedule preview
            </p>

            <div className="relative mb-4">
                {/* Timeline line */}
                <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[#2C2D33]" />

                {/* Timeline items */}
                <div className="space-y-4">
                    {sortedAgenda.map((item, index) => {
                        const isActive = index === 0;
                        return (
                            <div key={item.id} className="relative pl-6">
                                {/* Timeline dot */}
                                <div
                                    className={`absolute left-[1px] top-1.5 w-[9px] h-[9px] rounded-full border-[1.5px] z-10 box-content ${isActive
                                        ? 'bg-[#5E6AD2] border-[#1C1D21]' // Removed shadow
                                        : 'bg-[#2C2D33] border-[#1C1D21]'
                                        }`}
                                />

                                <div className={`${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                    {/* Time */}
                                    <p className="text-[11px] font-mono text-[#8A8F98] leading-none mb-1">
                                        {formatTime(item.startTime)}
                                    </p>

                                    {/* Title */}
                                    <p className="text-[13px] text-[#EDEDEF] leading-snug mb-0.5 line-clamp-2 font-medium">
                                        {item.title}
                                    </p>

                                    {/* Speaker */}
                                    {getSpeakerDisplay(item) && (
                                        <p className="text-[12px] text-zinc-500 truncate">
                                            {getSpeakerDisplay(item)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* More sessions indicator */}
            {remainingCount > 0 && (
                <p className="pl-6 text-xs text-zinc-600 mb-4">
                    +{remainingCount} more session{remainingCount > 1 ? 's' : ''}
                </p>
            )}

            {/* View Full Schedule link */}
            <div>
                <Link
                    href={`/events/${eventSlug}`}
                    className="flex items-center gap-2 text-sm text-[#8A8F98] hover:text-[#EDEDEF] transition-colors"
                >
                    View full schedule
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
