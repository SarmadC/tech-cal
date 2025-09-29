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
}

export function EnhancedTeamCard({ 
  team, 
  maxTeamSize, 
  onJoin, 
  isJoining = false, 
  canJoin = true,
  userId 
}: EnhancedTeamCardProps) {
  const status = getTeamStatus(team, maxTeamSize, userId);
  const { isFull, availableSpots } = status;
  const isCreator = team.createdBy === userId;
  const capacityPercentage = ((team.memberCount || 0) / maxTeamSize) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
            {team.name}
          </h4>
          {team.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {team.description}
            </p>
          )}
        </div>
        
        {/* Status Badge */}
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Team Stats */}
      <div className="space-y-2 mb-3">
        {/* Member Count & Capacity */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <MaterialIcon name="people" size={14} />
            <span>{team.memberCount || 0} / {maxTeamSize} members</span>
          </div>
          {!isFull && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              {availableSpots} spot{availableSpots !== 1 ? 's' : ''} left
            </span>
          )}
        </div>

        {/* Capacity Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              capacityPercentage >= 100 
                ? 'bg-gray-400' 
                : capacityPercentage >= 80 
                ? 'bg-orange-400' 
                : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          />
        </div>

        {/* Looking for Members Status */}
        {team.lookingForMembers && !isFull && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <MaterialIcon name="add" size={14} />
            <span>Looking for new members</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      {!isCreator && (
        <div className="flex justify-end">
          {canJoin && !isFull && team.lookingForMembers ? (
            <button
              onClick={() => onJoin(team.id)}
              disabled={isJoining}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1"
            >
              {isJoining ? (
                <>
                  <MaterialIcon name="refresh" size={14} className="animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <MaterialIcon name="add" size={14} />
                  Join Team
                </>
              )}
            </button>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5">
              {isFull ? 'Team is full' : !team.lookingForMembers ? 'Not accepting members' : 'Cannot join'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
