'use client';

import React from 'react';
import { CareerImpactScore, Event } from '@/types';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import { Sparkle } from '@phosphor-icons/react';
import { buildRecommendationHighlights } from './recommendationReasoning';

type Variant = 'compact' | 'expanded';

interface RecommendationContextProps {
    careerImpact: CareerImpactScore;
    variant?: Variant;
    event?: Pick<Event, 'attendeeCount'> | null;
}

const RecommendationContext: React.FC<RecommendationContextProps> = ({ careerImpact, variant = 'compact', event }) => {
    const { label, color, bgColor, borderColor } = getImpactBucketLabel(careerImpact.overall);
    const matchedSkills = careerImpact.explanation?.matchedSkills ?? [];
    const highlights = React.useMemo(
        () => buildRecommendationHighlights({ careerImpact, event, maxItems: 3 }),
        [careerImpact, event]
    );

    if (variant === 'compact') {
        const compactHighlights = highlights.slice(0, 3);
        const skillsToShow = matchedSkills.slice(0, 3);
        const hasSkillReason = compactHighlights.some((line) => line.toLowerCase().startsWith('skill match:'));

        // Color logic based on score
        let badgeStyle = 'text-blue-400';
        let barColor = 'bg-blue-400';
        let barBg = 'bg-blue-900/40';

        if (careerImpact.overall >= 80) {
            badgeStyle = 'text-emerald-400';
            barColor = 'bg-emerald-400';
            barBg = 'bg-emerald-900/40';
        } else if (careerImpact.overall >= 50) {
            badgeStyle = 'text-blue-400';
            barColor = 'bg-blue-400';
            barBg = 'bg-blue-900/40';
        } else if (careerImpact.overall >= 25) {
            badgeStyle = 'text-amber-400';
            barColor = 'bg-amber-400';
            barBg = 'bg-amber-900/40';
        } else {
            badgeStyle = 'text-rose-400';
            barColor = 'bg-rose-400';
            barBg = 'bg-rose-900/40';
        }

        return (
            <div className="relative group/recommendation mb-3 inline-block">
                {/* Simplified Percentage Badge with Progress Bar - Minimal (No Background) */}
                <div className={`inline-flex items-center gap-2 py-0.5 rounded-md ${badgeStyle} text-[11px] font-medium font-mono cursor-help transition-opacity hover:opacity-80`}>
                    <div className={`w-12 h-1.5 rounded-sm ${barBg} overflow-hidden`}>
                        <div
                            className={`h-full ${barColor} rounded-sm`}
                            style={{ width: `${careerImpact.overall}%` }}
                        />
                    </div>
                    <span>{careerImpact.overall}% Match</span>
                </div>

                {/* Hover Details Popover */}
                <div className="absolute left-0 top-full mt-2 w-max max-w-[280px] p-3 rounded-lg bg-[#1A1A1A] border border-white/10 shadow-xl opacity-0 invisible group-hover/recommendation:opacity-100 group-hover/recommendation:visible transition-all duration-200 z-20 pointer-events-none translate-y-1 group-hover/recommendation:translate-y-0">
                    {/* Arrow */}
                    <div className="absolute -top-1 left-6 w-2 h-2 bg-[#1A1A1A] border-l border-t border-white/10 rotate-45" />

                    <div className="relative z-10 flex flex-col gap-2.5">
                        {compactHighlights.length > 0 ? (
                            <ul className="space-y-2">
                                {compactHighlights.map((reason) => (
                                    <li key={reason} className="flex items-start gap-2">
                                        <Sparkle size={12} weight="fill" className="text-amber-400 mt-0.5 shrink-0" />
                                        <span className="text-[12px] text-gray-300 leading-snug">{reason}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex items-start gap-2">
                                <Sparkle size={13} weight="fill" className="text-amber-400 mt-0.5 shrink-0" />
                                <span className="text-[12px] text-gray-300 leading-snug">Shown because it aligns with your profile and active preferences.</span>
                            </div>
                        )}

                        {/* Skills */}
                        {skillsToShow.length > 0 && !hasSkillReason && (
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
                                {skillsToShow.map((skill) => (
                                    <span
                                        key={skill}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono text-blue-300 bg-blue-500/10 border border-blue-500/20"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );

    }

    // Expanded variant
    return (
        <div className="flex flex-col gap-2.5">
            {/* Impact pill */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${color} ${bgColor} ${borderColor}`}>
                    <Sparkle size={12} weight="fill" />
                    {label}
                </span>
                <span className="text-[11px] text-muted-foreground/50 font-mono">
                    Score: {careerImpact.overall}
                </span>
            </div>

            {/* Highlight reasons */}
            {highlights.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {highlights.map((reason, i) => (
                        <p key={i} className="text-[12px] text-muted-foreground/80 leading-tight flex items-center gap-1.5">
                            <Sparkle size={12} weight="fill" className="text-amber-400/70 flex-shrink-0" />
                            <span>{reason}</span>
                        </p>
                    ))}
                </div>
            ) : null}

            {/* All matched skills */}
            {matchedSkills.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {matchedSkills.map((skill) => (
                        <span
                            key={skill}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-400/20"
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecommendationContext;
