'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { X, Globe, UsersThree, CalendarBlank, MapPin, Trophy, Timer, ArrowSquareOut, ArrowSquareIn, Plus, Trash, CheckCircle } from '@phosphor-icons/react';
import {
    HackathonEvent,
    HackathonTeam,
    isHackathonRunning,
    isHackathonEnded
} from '@/types/hackathon';
import { MaterialIcon } from '@/components/ui/Icon';
import { TeamSearchFilter } from './TeamSearchFilter';
import { EnhancedTeamCard } from './EnhancedTeamCard';
import { formatDate, getDateRange } from '@/utils/hackathonUiUtils';
import { getUserCreatedTeam, canUserCreateTeam } from '@/utils/teamUtils';

interface HackathonDetailPanelProps {
    hackathon: HackathonEvent;
    onClose: () => void;
    userId: string;
    isRegistered: boolean;
    onJoinTeam: (hackathonId: string) => void;
    onJoinTeamById: (teamId: string) => Promise<void>;
    onCreateTeam: (hackathonId: string) => void;
    onDeleteTeam: (teamId: string, teamName: string) => Promise<void>;
    onLeaveTeam: (hackathonId: string) => Promise<void>;
    joiningTeamId?: string | null;
}

export function HackathonDetailPanel({
    hackathon,
    onClose,
    userId,
    isRegistered,
    onJoinTeam,
    onJoinTeamById,
    onCreateTeam,
    onDeleteTeam,
    onLeaveTeam,
    joiningTeamId = null
}: HackathonDetailPanelProps) {
    const [filteredTeams, setFilteredTeams] = useState<HackathonTeam[]>([]);

    const isRunning = isHackathonRunning(hackathon);
    const hasEnded = isHackathonEnded(hackathon);
    const hasTeam = !!hackathon.userParticipation?.team;

    // Get user's own team
    const userCreatedTeam = useMemo(() => getUserCreatedTeam(hackathon, userId), [hackathon, userId]);

    // Get available teams
    const availableTeams = useMemo(() =>
        (hackathon.teams || []).filter(team => team.createdBy !== userId),
        [hackathon.teams, userId]
    );

    const handleFilteredTeams = useCallback((teams: HackathonTeam[]) => {
        setFilteredTeams(teams);
    }, []);

    const primaryUrl = hackathon.registrationUrl || hackathon.websiteUrl || hackathon.sourceUrl || hackathon.platformUrl;
    const primaryUrlLabel = hackathon.registrationUrl ? 'Register Now' : (hackathon.websiteUrl || hackathon.sourceUrl) ? 'Visit Website' : 'View Details';

    return (
        <div className="h-full flex flex-col bg-[#0A0A0A] border-l border-white/10 shadow-2xl relative overflow-hidden">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                    {hackathon.organizerLogoUrl && (
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden p-2 relative">
                            <Image
                                src={hackathon.organizerLogoUrl}
                                alt={hackathon.organizerName || 'Organizer'}
                                fill
                                className="object-contain p-1"
                            />
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-white leading-tight">{hackathon.title}</h2>
                        <p className="text-sm text-white/40">{hackathon.organizerName}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Description */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest">About</h3>
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                        {hackathon.description}
                    </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            <CalendarBlank size={14} />
                            <span>Dates</span>
                        </div>
                        <p className="text-sm text-white/80">{getDateRange(hackathon)}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            <MapPin size={14} />
                            <span>Location</span>
                        </div>
                        <p className="text-sm text-white/80">
                            {hackathon.locationCity && hackathon.locationCountry
                                ? `${hackathon.locationCity}, ${hackathon.locationCountry}`
                                : hackathon.location || 'Remote'}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            <UsersThree size={14} />
                            <span>Team Size</span>
                        </div>
                        <p className="text-sm text-white/80">
                            {hackathon.minTeamSize}-{hackathon.maxTeamSize} members
                        </p>
                    </div>
                    {hackathon.submissionDeadline && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                                <Timer size={14} />
                                <span>Submission</span>
                            </div>
                            <p className="text-sm text-white/80">{formatDate(hackathon.submissionDeadline)}</p>
                        </div>
                    )}
                </div>

                {/* Awards & Tracks */}
                {hackathon.prizePool && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                            <Trophy size={14} />
                            <span>Awards & Tracks</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {hackathon.prizePool.split(/[,;\n]/).filter(p => p.trim()).map((prize, i) => (
                                <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/60 border border-white/10">
                                    {prize.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Teams Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest">Teams</h3>
                        {canUserCreateTeam(hackathon, userId).canCreate && !hasTeam && !hasEnded && (
                            <button
                                onClick={() => onCreateTeam(hackathon.id)}
                                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                <Plus size={14} />
                                Create Team
                            </button>
                        )}
                    </div>

                    {/* User's Team */}
                    {userCreatedTeam && (
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase tracking-wider">Your Team</span>
                                    <span className="text-sm font-bold text-white">{userCreatedTeam.name}</span>
                                </div>
                                {!hasEnded && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onLeaveTeam(hackathon.id)}
                                            className="p-1.5 text-white/30 hover:text-white transition-colors"
                                            title="Leave Team"
                                        >
                                            <ArrowSquareOut size={16} />
                                        </button>
                                        {userCreatedTeam.createdBy === userId && (
                                            <button
                                                onClick={() => onDeleteTeam(userCreatedTeam.id, userCreatedTeam.name)}
                                                className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                                                title="Delete Team"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {userCreatedTeam.description && (
                                <p className="text-xs text-white/50 leading-relaxed font-normal">{userCreatedTeam.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-white/30">
                                <span className="flex items-center gap-1"><UsersThree size={12} /> {userCreatedTeam.memberCount || 0}/{hackathon.maxTeamSize}</span>
                                {userCreatedTeam.lookingForMembers && (
                                    <span className="flex items-center gap-1 text-blue-400/70">
                                        <span className="w-1 h-1 rounded-full bg-blue-500" />
                                        Recruiting
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Team Search & List */}
                    {availableTeams.length > 0 && (
                        <div className="space-y-4">
                            <TeamSearchFilter
                                teams={availableTeams}
                                onFilteredTeams={handleFilteredTeams}
                                maxTeamSize={hackathon.maxTeamSize}
                            />
                            <div className="space-y-2">
                                {(filteredTeams.length > 0 ? filteredTeams : availableTeams).map(team => (
                                    <EnhancedTeamCard
                                        key={team.id}
                                        team={team}
                                        maxTeamSize={hackathon.maxTeamSize}
                                        onJoin={onJoinTeamById}
                                        isJoining={joiningTeamId === team.id}
                                        canJoin={!hasTeam && !hasEnded}
                                        userId={userId}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {availableTeams.length === 0 && !userCreatedTeam && (
                        <div className="py-8 text-center text-white/20 text-xs bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                            No teams available yet — be the first to create one!
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                        {!isRegistered && !hasEnded && (
                            <a
                                href={primaryUrl || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 px-6 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(37,99,235,0.2)] active:scale-[0.98]"
                            >
                                {primaryUrlLabel}
                                <ArrowSquareOut size={18} />
                            </a>
                        )}
                        {isRegistered && (
                            <div className="w-full py-3 px-6 text-sm font-bold text-blue-400 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2">
                                <CheckCircle size={18} weight="bold" />
                                Registered
                            </div>
                        )}
                        {hasEnded && (
                            <div className="w-full py-3 px-6 text-sm font-bold text-white/30 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center gap-2">
                                Event Ended
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
