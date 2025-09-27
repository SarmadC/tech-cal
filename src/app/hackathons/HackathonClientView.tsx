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
  isShortDurationHackathon,
  formatHackathonDuration,
  getHackathonDurationDays,
  isHackathonRunning,
  isHackathonEnded
} from '@/types/hackathon';
import { AppProfile } from '@/types';
import { TeamSelectionDialog } from '@/components/hackathon/TeamSelectionDialog';
import { createHackathonActions } from '@/utils/hackathonActions';
import { generateDefaultTeamName } from '@/utils/teamNameUtils';
import { formatDate, formatTime, getDateRange, calculateProgress, formatProgress } from '@/utils/hackathonUiUtils';

interface HackathonClientViewProps {
  initialHackathons: HackathonEvent[];
  profile: AppProfile | null;
  userId: string;
}

interface HackathonCardProps {
  hackathon: HackathonEvent;
  onRegister: (hackathonId: string) => void;
  onCreateTeam: (hackathonId: string) => void;
  onJoinTeam: (hackathonId: string) => void;
  onLeaveTeam: (hackathonId: string) => void;
}

const HackathonCard: React.FC<HackathonCardProps> = ({
  hackathon,
  onRegister,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam
}) => {
  const isRegistered = !!hackathon.userParticipation;
  const hasTeam = !!hackathon.userParticipation?.teamId;
  const isLongDuration = isLongDurationHackathon(hackathon);
  const durationDays = getHackathonDurationDays(hackathon);
  const isRunning = isHackathonRunning(hackathon);
  const hasEnded = isHackathonEnded(hackathon);

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
            {isLongDuration && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                Extended ({durationDays} days)
              </span>
            )}
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
        <div className="flex-shrink-0 ml-4">
          <MaterialIcon
            name="event"
            size={24}
            className="text-orange-500"
          />
        </div>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MaterialIcon name="time" size={16} />
            <span>{formatHackathonDuration(hackathon)}</span>
          </div>
        </div>
        <div className="space-y-2">
          {hackathon.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MaterialIcon name="location" size={16} />
              <span className="truncate">{hackathon.location}</span>
            </div>
          )}
          {hackathon.organizerId && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MaterialIcon name="building" size={16} />
              <span>Organizer ID: {hackathon.organizerId}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MaterialIcon name="people" size={16} />
            <span>{hackathon.totalParticipants} participants</span>
          </div>
        </div>
      </div>

      {/* Hackathon Details */}
      {(hackathon.registrationDeadline || hackathon.submissionDeadline || hackathon.maxTeamSize || hackathon.platformUrl) && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Hackathon Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
            {hackathon.maxTeamSize && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Max Team Size:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {hackathon.maxTeamSize} members
                </span>
              </div>
            )}
            {hackathon.platformUrl && (
              <div>
                <a
                  href={hackathon.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Platform Link ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar for running hackathons */}
      {isRunning && hackathon.endDate && (
        <div className="mb-4">
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
      <div className="flex flex-wrap gap-3">
        {!isRegistered && !hasEnded ? (
          <button
            onClick={() => onRegister(hackathon.id)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <MaterialIcon name="person" size={16} />
            Register
          </button>
        ) : (
          <>
            {!hasTeam && !hasEnded ? (
              <>
                <button
                  onClick={() => onCreateTeam(hackathon.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <MaterialIcon name="people" size={16} />
                  Create Team
                </button>
                <button
                  onClick={() => onJoinTeam(hackathon.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                >
                  <MaterialIcon name="people" size={16} />
                  Join Team
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 rounded-lg">
                  <MaterialIcon name="check" size={16} />
                  {hasTeam ? (hackathon.userParticipation?.team?.name || 'Team Member') : 'Registered'}
                </div>
                {hasTeam && !hasEnded && (
                  <button
                    onClick={() => onLeaveTeam(hackathon.id)}
                    className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <MaterialIcon name="close" size={12} />
                    Leave Team
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {hackathon.websiteUrl && (
          <a
            href={hackathon.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <MaterialIcon name="arrow-forward" size={16} />
            Event Page
          </a>
        )}
      </div>
    </div>
  );
};

export default function HackathonClientView({
  initialHackathons,
  profile,
  userId
}: HackathonClientViewProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'past'>('upcoming');
  const [showShort, setShowShort] = useState(true);
  const [teamSelection, setTeamSelection] = useState<{
    open: boolean;
    hackathonId: string;
    teams: HackathonTeam[];
  }>({ open: false, hackathonId: '', teams: [] });
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
      filtered = filtered.filter(h => !isShortDurationHackathon(h));
    }

    return filtered;
  }, [hackathons, filter, showShort]);

  const handleRegister = async (hackathonId: string) => {
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
    const teamName = generateDefaultTeamName({
      fullName: profile?.fullName || undefined
    });
    await actions.createTeam(hackathonId, teamName, 'Ready to build amazing things!');
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
    } catch (error) {
      console.error('Error loading teams:', error);
      showError('Failed to load available teams. Please try again.');
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
        } catch (error) {
          console.error('Error joining team:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to join team. Please try again.';
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
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
          {filteredHackathons.map(hackathon => (
            <HackathonCard
              key={hackathon.id}
              hackathon={hackathon}
              onRegister={handleRegister}
              onCreateTeam={handleCreateTeam}
              onJoinTeam={handleJoinTeam}
              onLeaveTeam={handleLeaveTeam}
            />
          ))}
        </div>
      )}

      {/* Team Selection Dialog */}
      <TeamSelectionDialog
        open={teamSelection.open}
        teams={teamSelection.teams}
        onClose={() => setTeamSelection({ open: false, hackathonId: '', teams: [] })}
        onSelectTeam={handleSelectTeam}
      />
    </div>
  );
}