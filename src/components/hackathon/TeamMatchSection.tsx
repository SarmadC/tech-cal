'use client';

import React, { useState } from 'react';
import { Sparkle, CaretRight } from '@phosphor-icons/react';
import { EnhancedTeamCard } from './EnhancedTeamCard';
import type { HackathonTeam, TeamMatchResult } from '@/types/hackathon';

interface RankedTeam extends HackathonTeam {
  match: TeamMatchResult;
}

interface TeamMatchSectionProps {
  rankedTeams: RankedTeam[];
  maxTeamSize: number;
  userId: string;
  onJoin: (teamId: string) => void;
  joiningTeamId?: string | null;
  canJoin: boolean;
}

const TOP_COUNT = 3;

export function TeamMatchSection({
  rankedTeams,
  maxTeamSize,
  userId,
  onJoin,
  joiningTeamId,
  canJoin
}: TeamMatchSectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (rankedTeams.length === 0) return null;

  const displayed = showAll ? rankedTeams : rankedTeams.slice(0, TOP_COUNT);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkle size={14} className="text-blue-400" weight="fill" />
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">
            Best Matches For You
          </h3>
        </div>
        {rankedTeams.length > TOP_COUNT && (
          <button
            onClick={() => setShowAll(prev => !prev)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors"
          >
            {showAll ? 'Show less' : `See all ${rankedTeams.length}`}
            <CaretRight
              size={10}
              className={`transition-transform ${showAll ? 'rotate-90' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Match chips legend */}
      <div className="space-y-2">
        {displayed.map(team => (
          <div key={team.id} className="space-y-1">
            {/* Match reason chips */}
            {team.match.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1 px-1">
                {team.match.matchReasons.map((reason, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/15 uppercase tracking-wider"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
            <EnhancedTeamCard
              team={team}
              maxTeamSize={maxTeamSize}
              onJoin={onJoin}
              isJoining={joiningTeamId === team.id}
              canJoin={canJoin}
              userId={userId}
              compatibilityScore={team.match.overall}
              suggestedRole={team.match.suggestedRole ?? undefined}
              missingSkills={team.match.missingSkills}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
