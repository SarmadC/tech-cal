'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

interface NetworkAttendingBadgeProps {
  eventId: string;
  telemetrySurface: string;
  count: number;
  sampleAvatars?: string[];
  className?: string;
  compact?: boolean;
}

export default function NetworkAttendingBadge({
  eventId,
  telemetrySurface,
  count,
  sampleAvatars = [],
  className,
  compact = false,
}: NetworkAttendingBadgeProps) {
  const trackedImpressionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (count <= 0) {
      return;
    }

    const impressionKey = `${telemetrySurface}:${eventId}`;
    if (trackedImpressionKeyRef.current === impressionKey) {
      return;
    }

    trackedImpressionKeyRef.current = impressionKey;
    void sendTelemetryEvent({
      eventType: 'network_badge_impression',
      context: {
        surface: telemetrySurface,
      },
      metadata: {
        eventId,
        networkAttendingCount: count,
      },
    });
  }, [count, eventId, telemetrySurface]);

  if (count <= 0) {
    return null;
  }

  const visibleAvatars = sampleAvatars.slice(0, compact ? 2 : 3);
  const label = compact
    ? `${count} in network`
    : `${count} ${count === 1 ? 'person' : 'people'} you follow attending`;

  return (
    <div
      className={cn(
        'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 transition-colors hover:bg-sky-500/15 dark:text-sky-300',
        className
      )}
      onClick={() => {
        void sendTelemetryEvent({
          eventType: 'network_badge_click',
          context: {
            surface: telemetrySurface,
          },
          metadata: {
            eventId,
            networkAttendingCount: count,
          },
        });
      }}
    >
      {visibleAvatars.length > 0 && (
        <span className="inline-flex -space-x-1">
          {visibleAvatars.map((avatarUrl, index) => (
            <span
              key={`${avatarUrl}-${index}`}
              className="relative h-3.5 w-3.5 overflow-hidden rounded-full border border-white/70 bg-white/30"
            >
              <Image
                src={avatarUrl}
                alt=""
                fill
                sizes="14px"
                className="object-cover"
              />
            </span>
          ))}
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}
