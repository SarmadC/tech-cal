'use client';

import React from 'react';
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
        <div className="mb-10 sm:mb-12">
            {/* Section header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white tracking-tight sm:text-2xl">Recommended for You</h2>
                </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 gap-6 auto-rows-fr md:grid-cols-2 2xl:grid-cols-4">
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
