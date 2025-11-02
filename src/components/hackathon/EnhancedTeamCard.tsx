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
    if (score >= 80) return 'text-green-400 bg-green-500/20 border-green-500/30 border';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30 border';
    return 'text-red-400 bg-red-500/20 border-red-500/30 border';
  };

  const formatRole = (role: string) => {
    return role.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="glass-card p-6">
      {/* Team Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-glass-primary mb-1">{team.name}</h3>
          {team.description && (
            <p className="text-glass-secondary text-sm line-clamp-2">{team.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
            isFull ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'
          }`}>
            {isFull ? 'Full' : `${availableSpots} spots left`}
          </span>
        </div>
      </div>

      {/* Compatibility Score */}
      {compatibilityScore && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-glass-secondary">Compatibility</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompatibilityColor(compatibilityScore)}`}>
              {compatibilityScore}% match
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${compatibilityScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Suggested Role */}
      {suggestedRole && (
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <MaterialIcon name="person" className="text-blue-400" size={16} />
            <span className="text-sm text-glass-secondary">
              Suggested role: <span className="font-medium text-glass-primary">{formatRole(suggestedRole)}</span>
            </span>
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <MaterialIcon name="warning" className="text-amber-400" size={16} />
            <span className="text-sm font-medium text-glass-secondary">Missing Skills</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {missingSkills.slice(0, 3).map((skill, index) => (
              <span key={index} className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">
                {skill}
              </span>
            ))}
            {missingSkills.length > 3 && (
              <span className="px-2 py-1 bg-white/5 text-glass-tertiary text-xs rounded-full border border-white/10">
                +{missingSkills.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Team Stats */}
      <div className="flex items-center justify-between text-sm text-glass-tertiary mb-4">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <MaterialIcon name="people" className="text-glass-tertiary" size={16} />
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
          <span className="px-4 py-2 bg-white/5 text-glass-secondary rounded-lg text-sm font-medium border border-white/10">
            Your Team
          </span>
        ) : (
          <button
            onClick={() => onJoin(team.id)}
            disabled={!canJoin || isFull || isJoining}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !canJoin || isFull
                ? 'bg-white/5 text-glass-tertiary cursor-not-allowed border border-white/10'
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