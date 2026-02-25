'use client';

import React, { useState, useMemo } from 'react';
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
    isHackathonEnded
} from '@/types/hackathon';
import { AppProfile } from '@/types';
import { TeamSetupModal } from '@/components/hackathon/TeamSetupModal';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { createHackathonActions } from '@/utils/hackathonActions';
import { HackathonDetailPanel } from '@/components/hackathon/HackathonDetailPanel';
import { HackathonCard } from '@/components/hackathon/HackathonCard';
import { RecommendedHackathons } from '@/components/hackathon/RecommendedHackathons';
import { getRecommendedHackathons } from '@/services/hackathonRecommendationService';
import { CareerProfileService } from '@/services/careerProfileService';

interface HackathonClientViewProps {
    initialHackathons: HackathonEvent[];
    profile: AppProfile | null;
    userId: string;
}

// HackathonCard removed and moved to its own file

export default function HackathonClientView({
    initialHackathons,
    userId,
    profile
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

    const recommendations = useMemo(() => {
        const careerProfile = CareerProfileService.getCareerProfileFromPreferences(profile);
        if (!careerProfile) return [];
        return getRecommendedHackathons(hackathons, careerProfile);
    }, [hackathons, profile]);
    const showRecommendations = filter === 'all' && recommendations.length > 0;
    const visibleHackathons = useMemo(() => {
        if (!showRecommendations) return filteredHackathons;
        const recommendedIds = new Set(recommendations.map((item) => item.hackathonId));
        return filteredHackathons.filter((hackathon) => !recommendedIds.has(hackathon.id));
    }, [filteredHackathons, recommendations, showRecommendations]);

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

    const _handleJoinTeam = async (hackathonId: string) => {
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

                                {showRecommendations && (
                                    <RecommendedHackathons
                                        recommendations={recommendations}
                                        onViewDetails={setSelectedHackathon}
                                    />
                                )}

                                {/* Filters */}
                                <div className="flex flex-wrap items-center justify-between gap-6 mb-10 border-b border-white/5">
                                    <div className="flex items-center gap-8">
                                        {(['all', 'upcoming', 'running', 'past'] as const).map(filterOption => (
                                            <button
                                                key={filterOption}
                                                onClick={() => setFilter(filterOption)}
                                                className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${filter === filterOption
                                                    ? 'text-blue-400'
                                                    : 'text-white/30 hover:text-white/60'
                                                    }`}
                                            >
                                                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                                                {filter === filterOption && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                )}
                                                <span className={`ml-2 text-[10px] font-bold ${filter === filterOption ? 'text-blue-400/60' : 'text-white/20'}`}>
                                                    {getFilterCount(filterOption)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setShowShort(!showShort)}
                                        className={`pb-4 flex items-center gap-2 text-[11px] font-bold tracking-tight transition-colors ${showShort
                                            ? 'text-white/60'
                                            : 'text-white/20'
                                            }`}
                                    >
                                        <MaterialIcon name="filter" size={14} />
                                        <span>Short events: {showShort ? 'Shown' : 'Hidden'}</span>
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
                                ) : visibleHackathons.length === 0 ? (
                                    <div className="text-center py-12">
                                        <MaterialIcon name="check-circle" size={48} className="text-glass-tertiary mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-glass-primary mb-2">
                                            No additional hackathons
                                        </h3>
                                        <p className="text-glass-secondary">
                                            Your best matches are shown in recommendations above.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                        {visibleHackathons.map(hackathon => {
                                            const isRegistered = !!hackathon.userParticipation;
                                            const isRunning = isHackathonRunning(hackathon);
                                            const hasEnded = isHackathonEnded(hackathon);

                                            return (
                                                <HackathonCard
                                                    key={hackathon.id}
                                                    hackathon={hackathon}
                                                    isRegistered={isRegistered}
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
