'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcon } from '@/components/ui/Icon';
import { HackathonService } from '@/services/hackathonService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { useSnackbar } from '@/contexts/SnackbarContext';
import {
    HackathonEvent,
    HackathonTeam,
    isLongDurationHackathon,
    isHackathonRunning,
    isHackathonEnded,
    formatHackathonDuration
} from '@/types/hackathon';
import { AppProfile } from '@/types';
import { TeamSearchFilter } from '@/components/hackathon/TeamSearchFilter';
import { EnhancedTeamCard } from '@/components/hackathon/EnhancedTeamCard';
import { TeamSetupModal } from '@/components/hackathon/TeamSetupModal';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { createHackathonActions } from '@/utils/hackathonActions';
import { getUserCreatedTeam, canUserCreateTeam } from '@/utils/teamUtils';
import { formatDate, formatTime, getDateRange, calculateProgress, formatProgress, getRegistrationCountdown, formatLocation } from '@/utils/hackathonUiUtils';
import { HackathonDetailPanel } from '@/components/hackathon/HackathonDetailPanel';

interface HackathonClientViewProps {
    initialHackathons: HackathonEvent[];
    profile: AppProfile | null;
    userId: string;
}

interface HackathonCardProps {
    hackathon: HackathonEvent;
    userId: string;
    isRegistered: boolean;
    hasTeam: boolean;
    hasEnded: boolean;
    isRunning: boolean;
    onViewDetails: (hackathon: HackathonEvent) => void;
}

// Individual modern hackathon card component
function HackathonCard({
    hackathon,
    userId,
    isRegistered,
    hasTeam,
    hasEnded,
    isRunning,
    onViewDetails,
}: HackathonCardProps) {
    const progress = useMemo(() => isRunning ? calculateProgress(hackathon) : 0, [isRunning, hackathon]);
    const registrationCountdown = useMemo(() => getRegistrationCountdown(hackathon.registrationDeadline), [hackathon.registrationDeadline]);
    const duration = useMemo(() => formatHackathonDuration(hackathon), [hackathon]);

    // Primary CTA URL — fallback chain: registration → website → platform
    const primaryUrl = hackathon.registrationUrl || hackathon.websiteUrl || hackathon.sourceUrl || hackathon.platformUrl;
    const primaryUrlLabel = hackathon.registrationUrl ? 'Register Now' : (hackathon.websiteUrl || hackathon.sourceUrl) ? 'Visit Website' : 'View Details';

    return (
        <div
            onClick={() => onViewDetails(hackathon)}
            className="group relative flex flex-col h-full rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden backdrop-blur-sm cursor-pointer"
        >
            {/* Status & Badge Overlay */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                {hackathon.isVirtual ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/50 border border-white/10 uppercase tracking-wider">
                        <MaterialIcon name="wifi" size={10} className="mr-1 opacity-60" />
                        Virtual
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/50 border border-white/10 uppercase tracking-wider">
                        <MaterialIcon name="location" size={10} className="mr-1 opacity-60" />
                        In-Person
                    </span>
                )}
                {isRunning ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1 animate-pulse" />
                        Live
                    </span>
                ) : hasEnded && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/30 border border-white/10 uppercase tracking-wider">
                        Ended
                    </span>
                )}
            </div>

            <div className="p-6 flex-1 flex flex-col">
                {/* Header Section */}
                <div className="flex items-start gap-4 mb-4">
                    {hackathon.organizerLogoUrl ? (
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 p-2 relative">
                            <Image
                                src={hackathon.organizerLogoUrl}
                                alt={hackathon.organizerName || 'Organizer'}
                                fill
                                className="object-contain p-1"
                            />
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <MaterialIcon name="trophy" size={24} className="text-white/20" />
                        </div>
                    )}

                    <div className="min-w-0 pr-16">
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mb-0.5">
                            {hackathon.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
                            <span className="font-medium text-white/60">{hackathon.organizerName}</span>
                            <span>•</span>
                            <span>{duration}</span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/50 leading-relaxed mb-6 line-clamp-2">
                    {hackathon.description}
                </p>

                {/* Simplified Info Pills */}
                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/5 text-white/50 border border-white/10 flex items-center gap-1">
                        <MaterialIcon name="calendar" size={10} />
                        {getDateRange(hackathon, false, false)}
                    </span>
                    <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/5 text-white/50 border border-white/10 flex items-center gap-1">
                        <MaterialIcon name="location" size={10} />
                        {formatLocation(hackathon)}
                    </span>
                </div>

                {/* Registration Deadline Countdown (Visual only on card) */}
                {registrationCountdown && !isRegistered && !hasEnded && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-semibold border ${registrationCountdown.urgency === 'high'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : registrationCountdown.urgency === 'medium'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-white/5 text-white/50 border-white/5'
                        }`}>
                        <MaterialIcon name="hourglass_empty" size={12} />
                        <span>{registrationCountdown.text}</span>
                    </div>
                )}

                {/* Progress View (if Live) */}
                {isRunning && progress > 0 && (
                    <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-white/40">Progress</span>
                            <span className="text-orange-400 font-mono tracking-tighter">{formatProgress(hackathon)}</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white/[0.02] flex items-center justify-between border-t border-white/5">
                <div className="flex gap-2">
                    {isRegistered ? (
                        <div className="px-3 py-1.5 text-[10px] font-bold text-white/70 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                            <MaterialIcon name="check-circle" size={14} className="text-blue-400" />
                            Registered
                        </div>
                    ) : (
                        <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 flex items-center gap-2">
                            {primaryUrlLabel}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(hackathon);
                        }}
                        className="px-4 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function HackathonClientView({
    initialHackathons,
    userId
}: HackathonClientViewProps) {
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'past'>('all');
    const [showShort, setShowShort] = useState(true);
    const [selectedHackathon, setSelectedHackathon] = useState<HackathonEvent | null>(null);
    const [teamSetup, setTeamSetup] = useState<{
        open: boolean;
        hackathon: HackathonEvent | null;
        view: 'create' | 'join';
        teams: HackathonTeam[];
    }>({ open: false, hackathon: null, view: 'create', teams: [] });
    const { supabase } = useSupabaseSafe();
    const queryClient = useQueryClient();
    const { showSuccess, showError, showWarning, showInfo, showConfirmation } = useSnackbar();

    // Create hackathon actions handler
    const actions = supabase ? createHackathonActions({
        supabase,
        userId,
        queryClient,
        snackbar: { showSuccess, showError, showWarning, showInfo, showConfirmation }
    }) : null;

    // Query for fresh hackathon data
    const { data: hackathons = initialHackathons, isLoading, error } = useQuery({
        queryKey: ['hackathonEvents', userId],
        queryFn: () => supabase ? HackathonService.getHackathonEvents(supabase, userId) : [],
        initialData: initialHackathons,
        enabled: !!supabase,
        // Disable polling in development to reduce memory usage
        refetchInterval: process.env.NODE_ENV === 'development' ? false : 5 * 60 * 1000,
    });

    // Filter hackathons by status and duration
    const filteredHackathons = useMemo(() => {
        let filtered = hackathons.filter(hackathon => {
            switch (filter) {
                case 'upcoming':
                    return !isHackathonRunning(hackathon) && !isHackathonEnded(hackathon);
                case 'running':
                    return isHackathonRunning(hackathon);
                case 'past':
                    return isHackathonEnded(hackathon);
                default:
                    return true;
            }
        });

        // Apply duration filter
        if (!showShort) {
            filtered = filtered.filter(h => isLongDurationHackathon(h));
        }

        return filtered;
    }, [hackathons, filter, showShort]);

    const _handleRegister = async (hackathonId: string) => {
        if (!actions) {
            showWarning('Please sign in to register for hackathons.');
            return;
        }
        const hackathon = hackathons.find(h => h.id === hackathonId);
        await actions.registerForHackathon(hackathonId, hackathon);
    };

    const handleCreateTeam = async (hackathonId: string) => {
        if (!actions) {
            showWarning('Please sign in to create teams.');
            return;
        }
        const hackathon = hackathons.find(h => h.id === hackathonId);
        if (!hackathon) {
            showError('Hackathon not found');
            return;
        }
        setTeamSetup({
            open: true,
            hackathon,
            view: 'create',
            teams: []
        });
    };

    const handleCreateTeamSubmit = async (teamData: { name: string; description: string; lookingForMembers: boolean; roles: string[]; icon?: string }) => {
        if (!actions || !teamSetup.hackathon) return;

        try {
            await actions.createTeam(teamSetup.hackathon.id, teamData.name, teamData.description, teamData.lookingForMembers);
            setTeamSetup(prev => ({ ...prev, open: false }));
        } catch (_error) {
            // Error is already handled by the action
        }
    };

    const handleJoinTeam = async (hackathonId: string) => {
        if (!supabase) {
            showWarning('Please sign in to join teams.');
            return;
        }

        const hackathon = hackathons.find(h => h.id === hackathonId);
        if (!hackathon) return;

        try {
            // Get available teams for this hackathon
            const teams = await HackathonService.getHackathonTeams(supabase, hackathonId);
            const availableTeams = teams.filter(team => team.lookingForMembers);

            setTeamSetup({
                open: true,
                hackathon,
                view: 'join',
                teams: availableTeams
            });
        } catch (_error) {
            console.error('Error loading teams:', _error);
            showError('Failed to load available teams');
        }
    };

    const handleSelectTeam = async (teamId: string) => {
        if (!supabase || !teamSetup.hackathon) return;

        const team = teamSetup.teams.find(t => t.id === teamId);
        if (!team) return;

        showConfirmation(
            'Join Team',
            `Join "${team.name}"?\n\n${team.description || 'No description available'}`,
            async () => {
                try {
                    await HackathonService.joinTeam(supabase, teamSetup.hackathon!.id, team.id, userId);
                    queryClient.invalidateQueries({ queryKey: ['hackathonEvents', userId] });
                    showSuccess(`Successfully joined "${team.name}"!`);
                    setTeamSetup(prev => ({ ...prev, open: false }));
                } catch (_error) {
                    console.error('Error joining team:', _error);
                    const errorMessage = _error instanceof Error ? _error.message : 'Failed to join team. Please try again.';
                    showError(errorMessage);
                }
            },
            { confirmText: 'Join Team', cancelText: 'Cancel' }
        );
    };

    const handleLeaveTeam = async (hackathonId: string) => {
        if (!actions) {
            showWarning('Please sign in to leave teams.');
            return;
        }
        const hackathon = hackathons.find(h => h.id === hackathonId);
        const teamName = hackathon?.userParticipation?.team?.name || 'team';
        await actions.leaveTeam(hackathonId, teamName);
    };

    const handleJoinTeamById = async (teamId: string) => {
        if (!actions) {
            showWarning('Please sign in to join teams.');
            return;
        }
        try {
            await actions.joinTeamById(teamId);
            setTeamSetup(prev => ({ ...prev, open: false }));
        } finally {
            // Done
        }
    };

    const handleDeleteTeam = async (teamId: string, teamName: string) => {
        if (!actions) {
            showWarning('Please sign in to delete teams.');
            return;
        }
        await actions.deleteTeam(teamId, teamName);
    };

    const getFilterCount = (filterType: typeof filter) => {
        return hackathons.filter(hackathon => {
            switch (filterType) {
                case 'upcoming':
                    return !isHackathonRunning(hackathon) && !isHackathonEnded(hackathon);
                case 'running':
                    return isHackathonRunning(hackathon);
                case 'past':
                    return isHackathonEnded(hackathon);
                default:
                    return true;
            }
        }).length;
    };

    if (isLoading && !initialHackathons.length) {
        return (
            <SidebarProvider>
                <UnifiedMobileNavbar
                    navItems={APP_MOBILE_NAV_ITEMS}
                    fixed={true}
                />
                <div className="flex h-screen bg-background">
                    <AppSidebar />
                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        <div className="flex-1 overflow-auto">
                            <div className="min-h-screen glass-bg-gradient relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/10 dark:from-black/0 dark:via-white/5 dark:to-white/10 pointer-events-none" />
                                <div className="relative max-w-[1600px] mx-auto px-6 py-8">
                                    <div className="animate-pulse space-y-6">
                                        <div className="h-8 bg-white/10 rounded w-64"></div>
                                        <div className="grid gap-6">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-64 glass-card"></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <UnifiedMobileNavbar
                navItems={APP_MOBILE_NAV_ITEMS}
                fixed={true}
            />
            <div className="flex h-screen bg-background">
                <AppSidebar />
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 overflow-auto">
                        <div className="min-h-screen glass-bg-gradient relative">
                            {/* Subtle atmospheric overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/10 dark:from-black/0 dark:via-white/5 dark:to-white/10 pointer-events-none" />

                            <div className="relative max-w-[1600px] mx-auto px-6 py-8 space-y-6">
                                {/* Header */}
                                <div className="mb-8">
                                    <h1 className="text-3xl font-bold text-glass-primary mb-2">
                                        Hackathons
                                    </h1>
                                    <p className="text-glass-secondary">
                                        Discover and participate in exciting coding competitions and events
                                    </p>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-wrap items-center gap-4 mb-6">
                                    <div className="flex items-center glass-card p-1">
                                        {(['all', 'upcoming', 'running', 'past'] as const).map(filterOption => (
                                            <button
                                                key={filterOption}
                                                onClick={() => setFilter(filterOption)}
                                                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${filter === filterOption
                                                    ? 'bg-white/10 text-glass-primary shadow-sm'
                                                    : 'text-glass-tertiary hover:text-glass-secondary'
                                                    }`}
                                            >
                                                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                                                <span className="ml-1 text-xs">({getFilterCount(filterOption)})</span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setShowShort(!showShort)}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors glass-card ${showShort
                                            ? 'text-glass-primary'
                                            : 'text-glass-tertiary'
                                            }`}
                                    >
                                        <MaterialIcon name="filter" size={16} />
                                        Short Hackathons
                                    </button>
                                </div>

                                {/* Hackathons Grid */}
                                {error ? (
                                    <div className="text-center py-12">
                                        <MaterialIcon name="error" size={48} className="text-red-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-glass-primary mb-2">
                                            Error Loading Hackathons
                                        </h3>
                                        <p className="text-glass-secondary mb-4">
                                            {error instanceof Error ? error.message : 'Something went wrong'}
                                        </p>
                                        <button
                                            onClick={() => queryClient.invalidateQueries({ queryKey: ['hackathonEvents', userId] })}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : filteredHackathons.length === 0 ? (
                                    <div className="text-center py-12">
                                        <MaterialIcon name="event" size={48} className="text-glass-tertiary mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-glass-primary mb-2">
                                            No {filter !== 'all' ? filter : ''} hackathons found
                                        </h3>
                                        <p className="text-glass-secondary">
                                            {filter === 'upcoming' && 'Check back later for new hackathons to register for.'}
                                            {filter === 'running' && 'No hackathons are currently in progress.'}
                                            {filter === 'past' && 'No completed hackathons to show yet.'}
                                            {filter === 'all' && 'No hackathons available at the moment.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredHackathons.map(hackathon => {
                                            const isRegistered = !!hackathon.userParticipation;
                                            const hasTeam = !!hackathon.userParticipation?.teamId;
                                            const isRunning = isHackathonRunning(hackathon);
                                            const hasEnded = isHackathonEnded(hackathon);

                                            return (
                                                <HackathonCard
                                                    key={hackathon.id}
                                                    hackathon={hackathon}
                                                    userId={userId}
                                                    isRegistered={isRegistered}
                                                    hasTeam={hasTeam}
                                                    hasEnded={hasEnded}
                                                    isRunning={isRunning}
                                                    onViewDetails={setSelectedHackathon}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                                {teamSetup.hackathon && (
                                    <TeamSetupModal
                                        open={teamSetup.open}
                                        hackathon={teamSetup.hackathon}
                                        userId={userId}
                                        onClose={() => setTeamSetup(prev => ({ ...prev, open: false }))}
                                        onCreateTeam={handleCreateTeamSubmit}
                                        onJoinTeam={handleSelectTeam}
                                        initialView={teamSetup.view}
                                        availableTeams={teamSetup.teams}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Details Panel Overlay */}
                {selectedHackathon && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setSelectedHackathon(null)}
                        />
                        <div className="w-full max-w-2xl h-full animate-in slide-in-from-right duration-300 relative z-10">
                            <HackathonDetailPanel
                                hackathon={selectedHackathon}
                                onClose={() => setSelectedHackathon(null)}
                                userId={userId}
                                isRegistered={!!selectedHackathon.userParticipation}
                                onJoinTeam={handleJoinTeam}
                                onJoinTeamById={handleJoinTeamById}
                                onCreateTeam={handleCreateTeam}
                                onDeleteTeam={handleDeleteTeam}
                                onLeaveTeam={handleLeaveTeam}
                                joiningTeamId={null}
                            />
                        </div>
                    </div>
                )}
            </div>
        </SidebarProvider>
    );
}