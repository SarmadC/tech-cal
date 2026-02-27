'use client';

import React from 'react';
import { Sparkle } from '@phosphor-icons/react';
import type { HackathonEvent, HackathonRecommendation } from '@/types/hackathon';
import { HackathonCard } from './HackathonCard';
import { isHackathonRunning, isHackathonEnded } from '@/types/hackathon';

interface RecommendedHackathonsProps {
    recommendations: HackathonRecommendation[];
    onViewDetails: (hackathon: HackathonEvent) => void;
}

export function RecommendedHackathons({ recommendations, onViewDetails }: RecommendedHackathonsProps) {
    if (recommendations.length === 0) return null;

    // We'll show up to 5 recommendations in the bento grid
    const displayRecs = recommendations.slice(0, 5);

    return (
        <div className="mb-12">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Recommended for You</h2>
                </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr">
                {displayRecs.map((rec, index) => {
                    const h = rec.hackathon;
                    const isRegistered = !!h.userParticipation;
                    const isRunning = isHackathonRunning(h);
                    const hasEnded = isHackathonEnded(h);

                    return (
                        <HackathonCard
                            key={h.id}
                            hackathon={h}
                            isRegistered={isRegistered}
                            hasEnded={hasEnded}
                            isRunning={isRunning}
                            onViewDetails={onViewDetails}
                            featured={index === 0}
                        />
                    );
                })}
            </div>
        </div>
    );
}
