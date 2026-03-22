'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UpdateQueueSignals } from '@/lib/admin/updateQueueTriage';

const SIGNAL_CONFIG = [
    {
        key: 'needsReview',
        label: 'Needs review',
        className: 'border border-amber-500/30 bg-amber-500/15 text-amber-200',
    },
    {
        key: 'hasScheduleChange',
        label: 'Schedule change',
        className: 'border border-sky-500/30 bg-sky-500/15 text-sky-200',
    },
    {
        key: 'startsSoon',
        label: 'Starts soon',
        className: 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
    },
    {
        key: 'isPastEvent',
        label: 'Past event',
        className: 'border border-rose-500/30 bg-rose-500/15 text-rose-200',
    },
] as const satisfies Array<{
    key: keyof UpdateQueueSignals;
    label: string;
    className: string;
}>;

export default function UpdateQueueSignalBadges({
    signals,
    className,
    compact = false,
}: {
    signals: UpdateQueueSignals;
    className?: string;
    compact?: boolean;
}) {
    const activeSignals = SIGNAL_CONFIG.filter((config) => signals[config.key]);

    if (activeSignals.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            {activeSignals.map((signal) => (
                <Badge
                    key={signal.key}
                    className={cn(
                        'px-2 py-0.5 font-medium tracking-wide',
                        compact ? 'text-[10px] uppercase' : 'text-[11px]',
                        signal.className
                    )}
                >
                    {signal.label}
                </Badge>
            ))}
        </div>
    );
}
