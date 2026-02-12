'use client';

import React from 'react';
import { Event, CareerImpactScore } from '@/types';
import { X, Sparkle } from '@phosphor-icons/react';
import { buildRecommendationHighlights } from './recommendationReasoning';
import { DiscoveryRankingMode, DISCOVERY_RANKING_OPTIONS } from './discoveryRanking';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

interface RecommendationExplainDrawerProps {
    open: boolean;
    event: EventWithImpact | null;
    rankingMode: DiscoveryRankingMode;
    activeFilterCount: number;
    feedbackHint?: string | null;
    onClose: () => void;
}

const RecommendationExplainDrawer: React.FC<RecommendationExplainDrawerProps> = ({
    open,
    event,
    rankingMode,
    activeFilterCount,
    feedbackHint,
    onClose,
}) => {
    const highlights = React.useMemo(() => {
        return buildRecommendationHighlights({
            careerImpact: event?.careerImpact,
            event: {
                attendeeCount: event?.attendeeCount ?? null,
            },
            maxItems: 4,
        });
    }, [event]);

    const rankingLabel = React.useMemo(() => {
        return DISCOVERY_RANKING_OPTIONS.find((option) => option.id === rankingMode)?.label ?? 'Best match';
    }, [rankingMode]);

    if (!open || !event) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Recommendation details">
            <button
                type="button"
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close recommendation details"
            />

            <div className="relative w-full md:max-w-2xl md:mx-4 max-h-[85vh] overflow-y-auto rounded-t-2xl md:rounded-2xl border border-border/80 bg-background shadow-2xl">
                <div className="flex items-start justify-between gap-3 p-5 border-b border-border/60">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Recommendation details</p>
                        <h3 className="text-lg font-semibold text-foreground mt-1">{event.title}</h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/40"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    <section>
                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Sparkle size={14} weight="fill" className="text-blue-400" />
                            Why recommended
                        </h4>
                        {highlights.length > 0 ? (
                            <ul className="space-y-2">
                                {highlights.map((reason) => (
                                    <li key={reason} className="text-sm text-muted-foreground leading-relaxed">
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">This event is being shown based on your current discovery preferences.</p>
                        )}
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-foreground mb-2">What changed</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>Ranking mode is set to <span className="text-foreground">{rankingLabel}</span>.</li>
                            <li>{activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} narrowed this list.` : 'No active filters are limiting your recommendations.'}</li>
                            <li>{feedbackHint ?? 'Recent discovery interactions are shaping what appears first.'}</li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-foreground mb-2">How to improve</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>Use feedback actions to hide irrelevant themes and strengthen future ranking.</li>
                            <li>Adjust ranking mode and location filters when your immediate priorities change.</li>
                            <li>Shortlist and compare at least two events to sharpen your top picks.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default RecommendationExplainDrawer;
