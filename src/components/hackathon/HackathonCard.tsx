'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { MaterialIcon } from '@/components/ui/Icon';
import {
    HackathonEvent,
    formatHackathonDuration
} from '@/types/hackathon';
import {
    calculateProgress,
    formatProgress,
    getRegistrationCountdown,
    formatLocation
} from '@/utils/hackathonUiUtils';
import { getSafeImageSrc } from '@/utils/imageUrl';

interface HackathonCardProps {
    hackathon: HackathonEvent;
    isRegistered: boolean;
    hasEnded: boolean;
    isRunning: boolean;
    onViewDetails: (hackathon: HackathonEvent) => void;
    featured?: boolean;
}

/**
 * Generate a unique gradient based on the hackathon title
 */
const getBrandGradient = (title: string) => {
    const colors = [
        'from-blue-600 to-indigo-900',
        'from-purple-600 to-indigo-950',
        'from-emerald-600 to-teal-900',
        'from-rose-600 to-pink-900',
        'from-orange-600 to-red-900',
        'from-cyan-600 to-blue-900',
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export function HackathonCard({
    hackathon,
    isRegistered,
    hasEnded,
    isRunning,
    onViewDetails,
    featured = false,
}: HackathonCardProps) {
    const progress = useMemo(() => isRunning ? calculateProgress(hackathon) : 0, [isRunning, hackathon]);
    const registrationCountdown = useMemo(() => getRegistrationCountdown(hackathon.registrationDeadline), [hackathon.registrationDeadline]);
    const duration = useMemo(() => formatHackathonDuration(hackathon), [hackathon]);
    const headerImageSrc = useMemo(() => getSafeImageSrc(hackathon.headerImageUrl), [hackathon.headerImageUrl]);
    const gradient = useMemo(() => getBrandGradient(hackathon.title), [hackathon.title]);

    return (
        <div
            onClick={() => onViewDetails(hackathon)}
            className={`group relative flex min-w-0 flex-col h-full rounded-2xl bg-[#0A0A0A] border border-white/5 hover:border-blue-500/30 hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.25)] hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer ${featured ? '2xl:col-span-2 2xl:row-span-2' : ''}`}
        >
            {/* Visual Cover Section (Top 40%) */}
            <div className={`relative w-full overflow-hidden ${featured ? 'h-56 sm:h-64' : 'h-40'}`}>
                {/* Background Gradient / Image */}
                {headerImageSrc ? (
                    <Image
                        src={headerImageSrc}
                        alt={hackathon.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-110 ${gradient}`} />
                )}
                <div className="absolute inset-0 bg-black/20" />

                {/* Floating Status Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                    {isRegistered && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white backdrop-blur-md shadow-lg tracking-wide">
                            <MaterialIcon name="check-circle" size={12} className="mr-1.5" />
                            Registered
                        </span>
                    )}
                    {isRunning ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500 text-white backdrop-blur-md shadow-lg tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                            Live
                        </span>
                    ) : hasEnded && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/40 text-white/70 backdrop-blur-md border border-white/10 tracking-wide">
                            Ended
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col relative">
                {/* Content Section */}
                <div className="mb-4">
                    <h3 className={`font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight ${featured ? 'mb-3 text-xl sm:text-2xl' : 'mb-2 text-lg'}`}>
                        {hackathon.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded-md bg-white/[0.03] text-white/60 border border-white/10 text-[10px] font-medium">
                            <MaterialIcon name="time" size={12} className="mr-1 opacity-60" />
                            {duration}
                        </span>
                        <span className="inline-flex max-w-full items-center min-w-0 px-2 py-0.5 rounded-md bg-white/[0.03] text-white/60 border border-white/10 text-[10px] font-medium sm:max-w-[70%]">
                            <MaterialIcon name="location" size={12} className="mr-1 shrink-0 opacity-60" />
                            <span className="truncate">{formatLocation(hackathon)}</span>
                        </span>
                        <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded-md bg-white/[0.03] text-blue-400/80 border border-blue-500/10 text-[10px] font-medium">
                            <MaterialIcon name={hackathon.isVirtual ? "wifi" : "person"} size={12} className="mr-1 opacity-60" />
                            {hackathon.isVirtual ? 'Virtual' : 'In-Person'}
                        </span>
                    </div>
                </div>

                <p className={`text-white/50 leading-relaxed mb-6 line-clamp-3 ${featured ? 'text-sm' : 'text-xs'}`}>
                    {hackathon.description}
                </p>

                {/* Footer Visual Cue & Indicators */}
                <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                    <div className="min-w-0 flex-1">
                        {registrationCountdown && !isRegistered && !hasEnded && (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${registrationCountdown.urgency === 'high'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : registrationCountdown.urgency === 'medium'
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    : 'bg-white/5 text-white/40 border-white/5'
                                }`}>
                                <MaterialIcon name="hourglass_empty" size={12} />
                                <span>{registrationCountdown.text}</span>
                            </div>
                        )}

                        {isRunning && progress > 0 && (
                            <div className="space-y-1.5 max-w-[140px]">
                                <div className="flex items-center justify-between text-[10px] font-bold tracking-tight">
                                    <span className="text-white/30">Live Progress</span>
                                    <span className="text-orange-400 font-mono italic">{formatProgress(hackathon)}</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden shrink-0 text-blue-400/80 transition-all duration-300 md:block opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                        <MaterialIcon name="arrow-forward" size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
}
