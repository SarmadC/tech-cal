'use client';

import React from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import type { HackathonTeam } from '@/types/hackathon';
import { getTeamStatus } from '@/utils/teamUtils';

interface EnhancedTeamCardProps {
    team: HackathonTeam;
    maxTeamSize: number;
    onJoin: (teamId: string) => void;
    isJoining?: boolean;
    canJoin?: boolean;
    userId: string;
    // Optional matching data
    compatibilityScore?: number;
    suggestedRole?: string;
    missingSkills?: string[];
}

export function EnhancedTeamCard({
    team,
    maxTeamSize,
    onJoin,
    isJoining = false,
    canJoin = true,
    userId,
    compatibilityScore,
    suggestedRole,
    missingSkills = []
}: EnhancedTeamCardProps) {
    const status = getTeamStatus(team, maxTeamSize, userId);
    const { isFull, availableSpots } = status;
    const isCreator = team.createdBy === userId;

    const getCompatibilityColor = (score: number) => {
        if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (score >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    };

    const formatRole = (role: string) => {
        return role.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    return (
        <div className="flex flex-col h-full rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 overflow-hidden">
            {/* Team Header */}
            <div className="p-4 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white mb-1 truncate group-hover/team:text-blue-400 transition-colors">
                            {team.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${isFull ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                                }`}>
                                {isFull ? 'Full' : `${availableSpots} Open`}
                            </span>
                        </div>
                    </div>
                </div>

                {team.description && (
                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2 mb-4">
                        {team.description}
                    </p>
                )}

                {/* Compatibility Score */}
                {compatibilityScore && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Compatibility</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getCompatibilityColor(compatibilityScore)}`}>
                                {compatibilityScore}% Match
                            </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1">
                            <div
                                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${compatibilityScore}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Suggested Role & Skills */}
                <div className="space-y-3">
                    {suggestedRole && (
                        <div className="flex items-center gap-2">
                            <MaterialIcon name="person" className="text-blue-400/60" size={14} />
                            <span className="text-[11px] text-white/60">
                                Suggested: <span className="text-white font-medium">{formatRole(suggestedRole)}</span>
                            </span>
                        </div>
                    )}

                    {missingSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {missingSkills.slice(0, 2).map((skill, index) => (
                                <span key={index} className="px-1.5 py-0.5 bg-white/5 text-white/40 text-[9px] font-bold rounded uppercase border border-white/5">
                                    {skill}
                                </span>
                            ))}
                            {missingSkills.length > 2 && (
                                <span className="text-[9px] text-white/20 font-bold self-center">
                                    +{missingSkills.length - 2}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Team Stats & Action Footer */}
            <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                    <MaterialIcon name="people" size={14} className="text-white/20" />
                    <span>{team.memberCount || 0}/{maxTeamSize}</span>
                </div>

                <div className="flex items-center">
                    {isCreator ? (
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                            Manager
                        </span>
                    ) : (
                        <button
                            onClick={() => onJoin(team.id)}
                            disabled={!canJoin || isFull || isJoining}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${!canJoin || isFull
                                    ? 'text-white/20 cursor-not-allowed'
                                    : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                                }`}
                        >
                            {isJoining ? '...' : isFull ? 'Full' : 'Join'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}