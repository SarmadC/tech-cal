import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CircleDiscussionUpcomingEvent } from '@/types/circleDiscussions';
import { formatDate } from '@/utils/dateUtils';

interface CircleUpcomingEventsListProps {
  events: CircleDiscussionUpcomingEvent[];
  emptyClassName?: string;
}

function getFallbackLabel(event: CircleDiscussionUpcomingEvent): string {
  return event.organizerName || event.title || 'Event';
}

function getFallbackInitials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function CircleUpcomingEventsList({
  events,
  emptyClassName = 'text-sm text-zinc-500 dark:text-zinc-400',
}: CircleUpcomingEventsListProps) {
  if (events.length === 0) {
    return <p className={emptyClassName}>No upcoming events.</p>;
  }

  return (
    <div className="flex flex-col">
      {events.map((event, index) => {
        const startTime = event.startTime ? new Date(event.startTime) : null;
        const fallbackLabel = getFallbackLabel(event);

        return (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className={`group flex items-center gap-3 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
              index !== 0 ? 'border-t border-zinc-100 dark:border-zinc-800/60' : ''
            }`}
          >
            <Avatar className="h-10 w-10 rounded-xl border border-zinc-200/80 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/75">
              {event.organizerLogoUrl ? (
                <AvatarImage
                  src={event.organizerLogoUrl}
                  alt={`${fallbackLabel} logo`}
                  className="object-contain p-1.5"
                />
              ) : null}
              <AvatarFallback className="rounded-xl bg-zinc-100 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-300">
                {getFallbackInitials(fallbackLabel)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-zinc-900 transition-colors group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-400">
                {event.title}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                {startTime ? <span>{formatDate(startTime)}</span> : null}
                {event.organizerName ? (
                  <>
                    <span>·</span>
                    <span className="truncate">{event.organizerName}</span>
                  </>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
