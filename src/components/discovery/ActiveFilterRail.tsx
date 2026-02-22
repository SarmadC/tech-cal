'use client';

import React from 'react';

export interface ActiveFilterRailChip {
    key: string;
    label: string;
    onRemove: () => void;
}

interface ActiveFilterRailProps {
    chips: ActiveFilterRailChip[];
    onClearAll?: () => void;
    className?: string;
}

const ActiveFilterRail: React.FC<ActiveFilterRailProps> = ({ chips, onClearAll, className = '' }) => {
    if (chips.length === 0) {
        return null;
    }

    return (
        <div className={`sticky top-[72px] z-20 rounded-xl border border-border/60 bg-background/80 backdrop-blur-md px-3 py-2 ${className}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Active filters</p>
                {onClearAll && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {chips.map((chip) => (
                    <button
                        key={chip.key}
                        type="button"
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground whitespace-nowrap hover:bg-muted/70 transition-colors"
                        aria-label={`Remove ${chip.label} filter`}
                    >
                        <span>{chip.label}</span>
                        <span aria-hidden className="text-muted-foreground">x</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ActiveFilterRail;
