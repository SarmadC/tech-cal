/**
 * Consolidated team utilities following DRY principles
 */

import type { HackathonTeam, HackathonEvent, HackathonParticipant } from '@/types/hackathon';

/**
 * Team capacity validation
 */
export function validateTeamCapacity(
  currentSize: number, 
  maxSize: number
): { isValid: boolean; message?: string } {
  if (currentSize >= maxSize) {
    return {
      isValid: false,
      message: `Team is full (${currentSize}/${maxSize} members)`
    };
  }
  return { isValid: true };
}

/**
 * Check if user can join team
 */
export function canUserJoinTeam(
  hackathon: HackathonEvent,
  team: HackathonTeam,
  userParticipation?: HackathonParticipant | null
): { canJoin: boolean; reason?: string } {
  // Check if hackathon allows teams
  if (hackathon.maxTeamSize <= 1) {
    return { canJoin: false, reason: 'This hackathon does not allow teams' };
  }

  // Check if user is already in a team
  if (userParticipation?.teamId) {
    return { canJoin: false, reason: 'You are already part of a team for this hackathon' };
  }

  // Check if team is looking for members
  if (!team.lookingForMembers) {
    return { canJoin: false, reason: 'This team is not looking for new members' };
  }

  // Check team capacity
  const capacityCheck = validateTeamCapacity(
    team.memberCount || 0, 
    hackathon.maxTeamSize
  );
  
  if (!capacityCheck.isValid) {
    return { canJoin: false, reason: capacityCheck.message };
  }

  return { canJoin: true };
}

/**
 * Generate default team name with uniqueness consideration
 */
export function generateDefaultTeamName(
  userInfo: { email?: string; name?: string }, 
  existingNames: string[] = []
): string {
  const baseName = userInfo.name?.split(' ')[0] || userInfo.email?.split('@')[0] || 'User';
  let teamName = `${baseName}'s Team`;
  
  // If name exists, add a number suffix
  let counter = 1;
  while (existingNames.includes(teamName)) {
    teamName = `${baseName}'s Team ${counter}`;
    counter++;
  }
  
  return teamName;
}

/**
 * Sort teams by relevance (looking for members first, then by member count)
 */
export function sortTeamsByRelevance(teams: HackathonTeam[]): HackathonTeam[] {
  return [...teams].sort((a, b) => {
    // Teams looking for members first
    if (a.lookingForMembers && !b.lookingForMembers) return -1;
    if (!a.lookingForMembers && b.lookingForMembers) return 1;
    
    // Then by member count (less full teams first)
    const aCount = a.memberCount || 0;
    const bCount = b.memberCount || 0;
    return aCount - bCount;
  });
}

/**
 * Filter teams by criteria
 */
export function filterTeams(
  teams: HackathonTeam[], 
  criteria: {
    lookingForMembers?: boolean;
    hasCapacity?: boolean;
    maxTeamSize?: number;
  }
): HackathonTeam[] {
  return teams.filter(team => {
    if (criteria.lookingForMembers !== undefined && team.lookingForMembers !== criteria.lookingForMembers) {
      return false;
    }
    
    if (criteria.hasCapacity && criteria.maxTeamSize) {
      const capacityCheck = validateTeamCapacity(team.memberCount || 0, criteria.maxTeamSize);
      if (!capacityCheck.isValid) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Check if user created a team
 */
export function getUserCreatedTeam(
  hackathon: HackathonEvent,
  userId: string
): HackathonTeam | null {
  if (!hackathon.teams) return null;
  
  return hackathon.teams.find(team => team.createdBy === userId) || null;
}

/**
 * Check if user can create a team (hasn't created one already)
 */
export function canUserCreateTeam(
  hackathon: HackathonEvent,
  userId: string
): { canCreate: boolean; reason?: string } {
  if (hackathon.maxTeamSize <= 1) {
    return { canCreate: false, reason: 'This hackathon does not allow teams' };
  }

  const userTeam = getUserCreatedTeam(hackathon, userId);
  if (userTeam) {
    return { 
      canCreate: false, 
      reason: `You already have a team "${userTeam.name}". You can only create one team per hackathon.` 
    };
  }

  return { canCreate: true };
}
