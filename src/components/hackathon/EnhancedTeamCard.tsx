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
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatRole = (role: string) => {
    return role.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Team Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{team.name}</h3>
          {team.description && (
            <p className="text-gray-600 text-sm line-clamp-2">{team.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {isFull ? 'Full' : `${availableSpots} spots left`}
          </span>
        </div>
      </div>

      {/* Compatibility Score */}
      {compatibilityScore && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Compatibility</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompatibilityColor(compatibilityScore)}`}>
              {compatibilityScore}% match
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${compatibilityScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Suggested Role */}
      {suggestedRole && (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <MaterialIcon name="person" className="text-blue-600" size={16} />
            <span className="text-sm text-gray-600">
              Suggested role: <span className="font-medium text-gray-900">{formatRole(suggestedRole)}</span>
            </span>
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <MaterialIcon name="warning" className="text-amber-600" size={16} />
            <span className="text-sm font-medium text-gray-700">Missing Skills</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {missingSkills.slice(0, 3).map((skill, index) => (
              <span key={index} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                {skill}
              </span>
            ))}
            {missingSkills.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{missingSkills.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Team Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <MaterialIcon name="people" className="text-gray-400" size={16} />
            <span>{team.memberCount || 0}/{maxTeamSize} members</span>
          </span>
        </div>
        <span className="text-xs">
          Created {new Date(team.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        {isCreator ? (
          <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
            Your Team
          </span>
        ) : (
          <button
            onClick={() => onJoin(team.id)}
            disabled={!canJoin || isFull || isJoining}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !canJoin || isFull
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
            }`}
          >
            {isJoining ? 'Joining...' : isFull ? 'Team Full' : 'Join Team'}
          </button>
        )}
      </div>
    </div>
  );
}