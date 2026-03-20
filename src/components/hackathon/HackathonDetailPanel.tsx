'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { X, UsersThree, CalendarBlank, MapPin, Trophy, Timer, ArrowSquareOut, Plus, Trash, CheckCircle, CurrencyDollar, Package } from '@phosphor-icons/react';
import {
    HackathonEvent,
    HackathonTeam,
    isHackathonEnded
} from '@/types/hackathon';
import { TeamSearchFilter } from './TeamSearchFilter';
import { EnhancedTeamCard } from './EnhancedTeamCard';
import { formatDate, getDateRange, formatLocation } from '@/utils/hackathonUiUtils';
import { getUserCreatedTeam, canUserCreateTeam } from '@/utils/teamUtils';
import { getSafeImageSrc } from '@/utils/imageUrl';

interface HackathonDetailPanelProps {
    hackathon: HackathonEvent;
    onClose: () => void;
    userId: string;
    isRegistered: boolean;
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
    onJoinTeamById,
    onCreateTeam,
    onDeleteTeam,
    onLeaveTeam,
    joiningTeamId = null
}: HackathonDetailPanelProps) {
    const [filteredTeams, setFilteredTeams] = useState<HackathonTeam[]>([]);

    const hasEnded = isHackathonEnded(hackathon);
    const hasTeam = !!hackathon.userParticipation?.team;
    const organizerLogoSrc = useMemo(
        () => getSafeImageSrc(hackathon.organizerLogoUrl),
        [hackathon.organizerLogoUrl]
    );

    const headerImageSrc = useMemo(
        () => getSafeImageSrc(hackathon.headerImageUrl),
        [hackathon.headerImageUrl]
    );

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
        <div className="relative flex h-full flex-col overflow-hidden bg-[#0A0A0A] shadow-2xl sm:border-l sm:border-white/10">
            {/* Header Banner */}
            {headerImageSrc ? (
                <div className="relative w-full h-40 flex-shrink-0 sm:h-48">
                    <Image
                        src={headerImageSrc}
                        alt={hackathon.title}
                        fill
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/20 to-transparent" />

                    {/* Close Button Overlay (High Visibility) */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/60 transition-all z-20"
                    >
                        <X size={20} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4 border-b border-white/5 p-4 sm:p-6">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        {organizerLogoSrc && (
                            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
                                <Image
                                    src={organizerLogoSrc}
                                    alt={hackathon.organizerName || 'Organizer'}
                                    fill
                                    className="object-contain p-1"
                                />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold leading-tight text-white sm:text-xl">{hackathon.title}</h2>
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
            )}

            {/* Title Section when Banner exists */}
            {headerImageSrc && (
                <div className="relative z-10 -mt-10 flex flex-col gap-3 px-4 pb-2 sm:-mt-12 sm:flex-row sm:items-end sm:gap-4 sm:px-6">
                    {organizerLogoSrc && (
                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-xl sm:h-16 sm:w-16">
                            <Image
                                src={organizerLogoSrc}
                                alt={hackathon.organizerName || 'Organizer'}
                                fill
                                className="object-contain p-2"
                            />
                        </div>
                    )}
                    <div className="pb-1 sm:pb-2">
                        <h2 className="text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-2xl">{hackathon.title}</h2>
                        <p className="text-sm text-white/60 font-medium drop-shadow-md">{hackathon.organizerName}</p>
                    </div>
                </div>
            )}

            {/* Scrollable Content */}
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4 sm:space-y-8 sm:p-6">
                {/* Description */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-white/30 tracking-tight">About</h3>
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                        {hackathon.description}
                    </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 tracking-tight font-bold">
                            <CalendarBlank size={14} />
                            <span>Dates</span>
                        </div>
                        <p className="break-words text-sm text-white/80">{getDateRange(hackathon)}</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 tracking-tight font-bold">
                            <MapPin size={14} />
                            <span>Location</span>
                        </div>
                        <p className="break-words text-sm text-white/80">
                            {formatLocation(hackathon)}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 tracking-tight font-bold">
                            <UsersThree size={14} />
                            <span>Team Size</span>
                        </div>
                        <p className="text-sm text-white/80">
                            {hackathon.minTeamSize}-{hackathon.maxTeamSize} members
                        </p>
                    </div>
                    {hackathon.submissionDeadline && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] text-white/30 tracking-tight font-bold">
                                <Timer size={14} />
                                <span>Submission</span>
                            </div>
                            <p className="text-sm text-white/80">{formatDate(hackathon.submissionDeadline)}</p>
                        </div>
                    )}
                </div>

                {/* Awards & Tracks */}
                {(hackathon.prizes && hackathon.prizes.length > 0) ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 tracking-tight font-bold">
                            <Trophy size={14} />
                            <span>Awards & Tracks</span>
                        </div>
                        <div className="grid gap-3">
                            {hackathon.prizes.map((prize, i) => (
                                <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex gap-3 items-start group hover:bg-white/[0.05] transition-all">
                                    <div className="mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                                        {prize.type === 'cash' ? <CurrencyDollar size={16} weight="bold" /> :
                                            prize.type === 'item' ? <Package size={16} weight="bold" /> :
                                                <Trophy size={16} weight="bold" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-sm font-bold text-white truncate">{prize.title}</h4>
                                            {prize.value && (
                                                <span className="shrink-0 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                                    {prize.value}
                                                </span>
                                            )}
                                        </div>
                                        {prize.description && (
                                            <p className="mt-1 text-xs text-white/40 leading-relaxed font-normal">
                                                {prize.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : hackathon.prizePool && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 tracking-tight font-bold">
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-xs font-bold text-white/30 tracking-tight">Teams</h3>
                        {canUserCreateTeam(hackathon, userId).canCreate && !hasTeam && !hasEnded && (
                            <button
                                onClick={() => onCreateTeam(hackathon.id)}
                                className="inline-flex items-center gap-1 self-start text-[10px] font-bold tracking-tight text-blue-400 transition-colors hover:text-blue-300"
                            >
                                <Plus size={14} />
                                Create Team
                            </button>
                        )}
                    </div>

                    {/* User's Team */}
                    {userCreatedTeam && (
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 tracking-tight">Your Team</span>
                                    <span className="truncate text-sm font-bold text-white">{userCreatedTeam.name}</span>
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
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/30">
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
            <div className="border-t border-white/5 bg-white/[0.02] p-4 backdrop-blur-md sm:p-6">
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
