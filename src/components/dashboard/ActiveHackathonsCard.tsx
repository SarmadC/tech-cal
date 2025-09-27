'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/Icon';
import {
  formatHackathonDuration,
  isLongDurationHackathon,
  isShortDurationHackathon,
  isHackathonRunning
} from '@/types/hackathon';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { TeamSelectionDialog } from '@/components/hackathon/TeamSelectionDialog';
import { createHackathonActions } from '@/utils/hackathonActions';
import { generateDefaultTeamName } from '@/utils/teamNameUtils';
import type { HackathonEvent, HackathonTeam } from '@/types/hackathon';
import { getDateRange, calculateProgress, formatProgress } from '@/utils/hackathonUiUtils';

interface ActiveHackathonsCardProps {
  hackathons: HackathonEvent[];
  isLoading?: boolean;
}

interface HackathonMiniCardProps {
  hackathon: HackathonEvent;
  onRegister: (hackathonId: string) => void;
  onCreateTeam: (hackathonId: string) => void;
  onJoinTeam: (hackathonId: string) => void;
  onLeaveTeam: (hackathonId: string) => void;
}

const HackathonMiniCard: React.FC<HackathonMiniCardProps> = ({
  hackathon,
  onRegister,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam
}) => {
  // Get actual participation status from hackathon data
  const isRegistered = !!hackathon.userParticipation;
  const hasTeam = !!hackathon.userParticipation?.teamId;
  const teamName = hackathon.userParticipation?.team?.name || 'Team Member';

  // Duration-based styling
  const isLongDuration = isLongDurationHackathon(hackathon);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border transition-colors ${
      isLongDuration
        ? 'border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600'
        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {hackathon.title}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
            <MaterialIcon name="calendar" size={12} />
            <span>{getDateRange(hackathon, true)}</span>
            <span>•</span>
            <span>{formatHackathonDuration(hackathon)}</span>
            {isLongDuration && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 ml-1">
                Extended
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          <MaterialIcon
            name="event"
            size={16}
            className="text-orange-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {hackathon.location && (
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
            <MaterialIcon name="location" size={12} />
            <span className="truncate">{hackathon.location}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!isRegistered ? (
          <button
            onClick={() => onRegister(hackathon.id)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-full transition-colors"
          >
            <MaterialIcon name="person" size={12} />
            Register
          </button>
        ) : (
          <>
            {!hasTeam ? (
              <>
                <button
                  onClick={() => onCreateTeam(hackathon.id)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-full transition-colors"
                >
                  <MaterialIcon name="people" size={12} />
                  Create Team
                </button>
                <button
                  onClick={() => onJoinTeam(hackathon.id)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-full transition-colors"
                >
                  <MaterialIcon name="people" size={12} />
                  Join Team
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 rounded-full">
                  <MaterialIcon name="check-circle" size={12} />
                  {teamName}
                </div>
                <button
                  onClick={() => onLeaveTeam(hackathon.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-full transition-colors"
                >
                  <MaterialIcon name="logout" size={10} />
                  Leave
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress bar for hackathons that are running */}
      {isHackathonRunning(hackathon) && hackathon.endDate && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>In progress</span>
            <span>{formatProgress(hackathon)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress(hackathon)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const ActiveHackathonsCard: React.FC<ActiveHackathonsCardProps> = ({
  hackathons,
  isLoading = false
}) => {
  const [showShortHackathons, setShowShortHackathons] = useState(true);
  const [selectedHackathon, setSelectedHackathon] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<HackathonTeam[]>([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const { supabase } = useSupabaseSafe();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning, showInfo, showConfirmation } = useSnackbar();

  // Separate long and short hackathons
  const longHackathons = hackathons.filter(h => isLongDurationHackathon(h));
  const shortHackathons = hackathons.filter(h => isShortDurationHackathon(h));

  // Determine which hackathons to display
  const displayedHackathons = showShortHackathons
    ? [...longHackathons, ...shortHackathons]
    : longHackathons;

  // Create hackathon actions handler
  const actions = supabase && user ? createHackathonActions({
    supabase,
    userId: user.id,
    queryClient,
    snackbar: { showSuccess, showError, showWarning, showInfo, showConfirmation }
  }) : null;

  const handleRegister = async (hackathonId: string) => {
    if (!actions) {
      showWarning('Please sign in to register for hackathons.');
      return;
    }
    const hackathon = hackathons.find(h => h.id === hackathonId);
    await actions.registerForHackathon(hackathonId, hackathon);
  };

  const handleCreateTeam = async (hackathonId: string) => {
    if (!actions || !user) {
      showWarning('Please sign in to create teams.');
      return;
    }
    const teamName = generateDefaultTeamName({ email: user.email });
    await actions.createTeam(hackathonId, teamName, 'A new team ready to build amazing things!');
  };

  const handleJoinTeam = async (hackathonId: string) => {
    if (!actions) {
      showWarning('Please sign in to join teams.');
      return;
    }
    await actions.loadTeamsForSelection(hackathonId, hackathons, {
      setSelectedHackathon,
      setTeams,
      setTeamDialogOpen
    });
  };

  const handleSelectTeam = async (team: HackathonTeam) => {
    if (!selectedHackathon || !actions) return;
    setTeamDialogOpen(false);
    await actions.joinTeam(selectedHackathon.id, team.id, team.name);
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

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-2" />
              <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse" />
                <div className="w-20 h-6 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="event" size={20} className="text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Hackathons
          </h3>
          {hackathons.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
              {displayedHackathons.length}
            </span>
          )}
          {shortHackathons.length > 0 && (
            <button
              onClick={() => setShowShortHackathons(!showShortHackathons)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={showShortHackathons ? 'Hide short hackathons' : 'Show short hackathons'}
            >
              <MaterialIcon name="filter" size={12} />
              <span>{showShortHackathons ? 'Hide' : 'Show'} Short</span>
            </button>
          )}
        </div>
        {hackathons.length > 0 && (
          <Link
            href="/hackathons"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
          >
            View All
            <MaterialIcon name="arrow-forward" size={14} />
          </Link>
        )}
      </div>

      {hackathons.length === 0 ? (
        <div className="text-center py-8">
          <MaterialIcon name="event" size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            No active hackathons
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Check back later for exciting coding competitions
          </p>
          <Link
            href="/hackathons"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <MaterialIcon name="event" size={16} />
            Browse Hackathons
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedHackathons.slice(0, 3).map((hackathon) => (
            <HackathonMiniCard
              key={hackathon.id}
              hackathon={hackathon}
              onRegister={handleRegister}
              onCreateTeam={handleCreateTeam}
              onJoinTeam={handleJoinTeam}
              onLeaveTeam={handleLeaveTeam}
            />
          ))}

          {displayedHackathons.length > 3 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <Link
                href="/hackathons"
                className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center justify-center gap-1 py-2"
              >
                <span>+{displayedHackathons.length - 3} more hackathons</span>
                <MaterialIcon name="arrow-forward" size={14} />
              </Link>
            </div>
          )}

          {!showShortHackathons && shortHackathons.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {shortHackathons.length} short hackathon{shortHackathons.length !== 1 ? 's' : ''} hidden
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <TeamSelectionDialog
        open={teamDialogOpen}
        teams={teams}
        onClose={() => setTeamDialogOpen(false)}
        onSelectTeam={handleSelectTeam}
      />
    </div>
  );
};