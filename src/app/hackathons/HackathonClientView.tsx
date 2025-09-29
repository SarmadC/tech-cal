'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { TeamSelectionDialog } from '@/components/hackathon/TeamSelectionDialog';
import { TeamCreationDialog } from '@/components/hackathon/TeamCreationDialog';
import { TeamSearchFilter } from '@/components/hackathon/TeamSearchFilter';
import { EnhancedTeamCard } from '@/components/hackathon/EnhancedTeamCard';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { createHackathonActions } from '@/utils/hackathonActions';
import { getUserCreatedTeam, canUserCreateTeam } from '@/utils/teamUtils';
import { formatDate, formatTime, getDateRange, calculateProgress, formatProgress } from '@/utils/hackathonUiUtils';

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
  onJoinTeam: (hackathonId: string) => void;
  onJoinTeamById: (teamId: string) => Promise<void>;
  onCreateTeam: (hackathonId: string) => void;
  onDeleteTeam: (teamId: string, teamName: string) => Promise<void>;
  onLeaveTeam: (hackathonId: string) => Promise<void>;
  joiningTeamId: string | null;
}

// Individual collapsible hackathon card component
function HackathonCard({
  hackathon,
  userId,
  isRegistered,
  hasTeam,
  hasEnded,
  isRunning,
  onJoinTeam,
  onJoinTeamById,
  onCreateTeam,
  onDeleteTeam,
  onLeaveTeam,
  joiningTeamId
}: HackathonCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [filteredTeams, setFilteredTeams] = useState<HackathonTeam[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const isLongDuration = isLongDurationHackathon(hackathon);

  // Get available teams (excluding user's own team)
  const availableTeams = useMemo(() => 
    (hackathon.teams || []).filter(team => team.createdBy !== userId),
    [hackathon.teams, userId]
  );

  // Initialize filtered teams when available teams change
  useEffect(() => {
    setFilteredTeams(availableTeams);
  }, [availableTeams]);

  // Measure content height when expanded
  useEffect(() => {
    if (contentRef.current && !isCollapsed) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isCollapsed, hackathon.teams, hackathon.userParticipation]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border transition-all hover:shadow-lg ${
      isLongDuration
        ? 'border-orange-200 dark:border-orange-700'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {hackathon.title}
            </h3>
            {isRunning && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            )}
            {hasEnded && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400">
                Ended
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
            {hackathon.description}
          </p>
        </div>
        
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={isCollapsed ? 'Expand hackathon details' : 'Collapse hackathon details'}
        >
          <MaterialIcon
            name="expand-more" 
            size={24}
            className={`transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
          />
        </button>
      </div>

      {/* Collapsible Content */}
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: isCollapsed ? '0px' : `${contentHeight}px`,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
      {/* Event Details */}
      <div className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 transition-all duration-300 ${
        isCollapsed ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Event Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MaterialIcon name="calendar" size={16} />
            <span>{getDateRange(hackathon)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MaterialIcon name="time" size={16} />
            <span>
              {formatTime(hackathon.startDate)}
              {hackathon.endDate && ` - ${formatTime(hackathon.endDate)}`}
            </span>
          </div>
          {hackathon.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MaterialIcon name="location" size={16} />
              <span className="truncate">{hackathon.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MaterialIcon name="people" size={16} />
            <span>{hackathon.totalParticipants} participants</span>
          </div>
        </div>
          <div className="space-y-2">
            {hackathon.organizerName && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MaterialIcon name="building" size={16} className="text-gray-500 dark:text-gray-400" />
                <span>{hackathon.organizerName}</span>
              </div>
            )}
            {/* Debug: Show organizer info even if name is empty */}
            {hackathon.organizerId && !hackathon.organizerName && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Organizer ID: {hackathon.organizerId}</span>
      </div>
            )}
            {hackathon.registrationDeadline && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Registration Deadline:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {formatDate(hackathon.registrationDeadline)}
                </span>
              </div>
            )}
            {hackathon.submissionDeadline && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Submission Deadline:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {formatDate(hackathon.submissionDeadline)}
                </span>
              </div>
            )}
              <div>
                <span className="text-gray-600 dark:text-gray-400">Max Team Size:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                {hackathon.maxTeamSize} {hackathon.maxTeamSize === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Section - Only show if hackathon allows teams */}
      {hackathon.maxTeamSize > 1 && (
        <div className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 transition-all duration-300 delay-100 ${
          isCollapsed ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Teams ({hackathon.teams?.length || 0})
            </h4>
            {(() => {
              const canCreate = canUserCreateTeam(hackathon, userId);
              const userCreatedTeam = getUserCreatedTeam(hackathon, userId);
              
              if (userCreatedTeam) {
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Your team: {userCreatedTeam.name}
                    </span>
                    <button
                      onClick={() => onDeleteTeam(userCreatedTeam.id, userCreatedTeam.name)}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      Delete Team
                    </button>
                  </div>
                );
              } else if (!hasTeam && !hasEnded && canCreate.canCreate) {
                return (
                  <button
                    onClick={() => onCreateTeam(hackathon.id)}
                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                  >
                    Create Team
                  </button>
                );
              } else if (!canCreate.canCreate) {
                return (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {canCreate.reason}
                  </span>
                );
              }
              return null;
            })()}
          </div>
          
          {hackathon.teams && hackathon.teams.length > 0 ? (
            <div className="space-y-4">
              {/* Search and Filter */}
              <TeamSearchFilter
                teams={availableTeams}
                onFilteredTeams={setFilteredTeams}
                maxTeamSize={hackathon.maxTeamSize}
              />
              
              {/* Team Cards */}
              <div className="grid gap-3">
                {filteredTeams.slice(0, 6).map(team => (
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
                
                {filteredTeams.length > 6 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{filteredTeams.length - 6} more teams
                </span>
              </div>
            )}
                
                {filteredTeams.length === 0 && (
                  <div className="text-center py-4">
                    <MaterialIcon name="search" size={32} className="text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No teams match your search criteria
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <MaterialIcon name="people" size={32} className="text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No teams available to join
              </div>
              {!hasTeam && !hasEnded && (
                <button
                  onClick={() => onCreateTeam(hackathon.id)}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                >
                  Create First Team
                </button>
            )}
          </div>
          )}
        </div>
      )}

      {/* Progress bar for running hackathons */}
      {isRunning && hackathon.endDate && (
        <div className={`mb-4 transition-all duration-300 delay-200 ${
          isCollapsed ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{formatProgress(hackathon)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress(hackathon)}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`flex flex-wrap gap-3 transition-all duration-300 delay-300 ${
        isCollapsed ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        {!isRegistered && !hasEnded ? (
          <>
            {/* External Registration Button */}
            {hackathon.registrationUrl && (
              <a
                href={hackathon.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Register on Platform
              </a>
            )}
            
          </>
        ) : (
          <>
            {!hasTeam && !hasEnded ? (
                <button
                  onClick={() => onJoinTeam(hackathon.id)}
                className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                Find a Team
                </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  {hasTeam ? (
                    `Team: ${hackathon.userParticipation?.team?.name || 'Team Member'}`
                  ) : (
                    'Registered'
                  )}
                </div>
                
                {/* Show external registration link if available and user hasn't registered externally */}
                {hackathon.registrationUrl && (
                  <a
                    href={hackathon.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    Register Externally
                  </a>
                )}
                
                {hasTeam && !hasEnded && (
                  <button
                    onClick={() => onLeaveTeam(hackathon.id)}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    Leave Team
                  </button>
                )}
              </div>
            )}
          </>
        )}

        </div>
      </div>
    </div>
  );
};

export default function HackathonClientView({
  initialHackathons,
  userId
}: HackathonClientViewProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'past'>('all');
  const [showShort, setShowShort] = useState(true);
  const [teamSelection, setTeamSelection] = useState<{
    open: boolean;
    hackathonId: string;
    teams: HackathonTeam[];
  }>({ open: false, hackathonId: '', teams: [] });
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);
  const [teamCreation, setTeamCreation] = useState<{
    open: boolean;
    hackathonId: string;
    hackathonTitle: string;
    isCreating: boolean;
  }>({ open: false, hackathonId: '', hackathonTitle: '', isCreating: false });
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
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
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
    setTeamCreation({
      open: true,
      hackathonId,
      hackathonTitle: hackathon.title,
      isCreating: false
    });
  };

  const handleCreateTeamSubmit = async (teamData: { name: string; description: string; lookingForMembers: boolean }) => {
    if (!actions) return;
    
    setTeamCreation(prev => ({ ...prev, isCreating: true }));
    
    try {
      await actions.createTeam(teamCreation.hackathonId, teamData.name, teamData.description, teamData.lookingForMembers);
      setTeamCreation(prev => ({ ...prev, open: false, isCreating: false }));
    } catch (_error) {
      setTeamCreation(prev => ({ ...prev, isCreating: false }));
      // Error is already handled by the action
    }
  };

  const handleJoinTeam = async (hackathonId: string) => {
    if (!supabase) {
      showWarning('Please sign in to join teams.');
      return;
    }

    try {
      // Get available teams for this hackathon
      const teams = await HackathonService.getHackathonTeams(supabase, hackathonId);
      const availableTeams = teams.filter(team => team.lookingForMembers);

      if (availableTeams.length === 0) {
        showError('No teams are currently looking for members. Try creating your own team!');
        return;
      }

      // Show team selection dialog
      setTeamSelection({
        open: true,
        hackathonId,
        teams: availableTeams
      });
  } catch (_error) {
    console.error('Error loading teams:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
    showError(`Failed to load available teams: ${errorMessage}`);
    }
  };

  const handleSelectTeam = async (team: HackathonTeam) => {
    if (!supabase) return;

    setTeamSelection({ open: false, hackathonId: '', teams: [] });

    showConfirmation(
      'Join Team',
      `Join "${team.name}"?\n\n${team.description || 'No description available'}`,
      async () => {
        try {
          await HackathonService.joinTeam(supabase, teamSelection.hackathonId, team.id, userId);
          queryClient.invalidateQueries({ queryKey: ['hackathonEvents', userId] });
          showSuccess(`Successfully joined "${team.name}"!`);
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
    setJoiningTeamId(teamId);
    try {
      await actions.joinTeamById(teamId);
    } finally {
      setJoiningTeamId(null);
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
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <AppSidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                  <div className="grid gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
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
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hackathons
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and participate in exciting coding competitions and events
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all', 'upcoming', 'running', 'past'] as const).map(filterOption => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === filterOption
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              <span className="ml-1 text-xs">({getFilterCount(filterOption)})</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowShort(!showShort)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            showShort
              ? 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-700'
              : 'text-gray-500 bg-gray-50 dark:text-gray-500 dark:bg-gray-800'
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Hackathons
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
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
          <MaterialIcon name="event" size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No {filter !== 'all' ? filter : ''} hackathons found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'upcoming' && 'Check back later for new hackathons to register for.'}
            {filter === 'running' && 'No hackathons are currently in progress.'}
            {filter === 'past' && 'No completed hackathons to show yet.'}
            {filter === 'all' && 'No hackathons available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
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
                onJoinTeam={handleJoinTeam}
                onJoinTeamById={handleJoinTeamById}
              onCreateTeam={handleCreateTeam}
                onDeleteTeam={handleDeleteTeam}
              onLeaveTeam={handleLeaveTeam}
                joiningTeamId={joiningTeamId}
            />
            );
          })}
        </div>
      )}

      {/* Team Selection Dialog */}
      <TeamSelectionDialog
        open={teamSelection.open}
        teams={teamSelection.teams}
        onClose={() => setTeamSelection({ open: false, hackathonId: '', teams: [] })}
        onSelectTeam={handleSelectTeam}
      />

      {/* Team Creation Dialog */}
      <TeamCreationDialog
        open={teamCreation.open}
        hackathonTitle={teamCreation.hackathonTitle}
        onClose={() => setTeamCreation(prev => ({ ...prev, open: false }))}
        onCreateTeam={handleCreateTeamSubmit}
        isCreating={teamCreation.isCreating}
      />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}