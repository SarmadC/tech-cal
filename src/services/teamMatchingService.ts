// src/services/teamMatchingService.ts
// Multi-factor compatibility scoring for smart team matching

import type {
  HackathonParticipant,
  HackathonTeam,
  TeamMatchResult
} from '@/types/hackathon';
import type { TeamRole, CollaborationStyle, CommunicationPreference, MentorshipPreference, SkillTag } from '@/types/career';

// Scoring weights (must sum to 100)
const WEIGHTS = {
  role: 0.30,
  skills: 0.25,
  collaboration: 0.20,
  communication: 0.15,
  mentorship: 0.10
} as const;

// ==========================================
// INDIVIDUAL SCORING FUNCTIONS (0–100)
// ==========================================

/**
 * Score how well the user's role fills a gap in the team.
 * 100 = fills a unique gap, 50 = flexible role, 0 = fully redundant
 */
function scoreRoleComplementarity(
  userRole: TeamRole | undefined,
  teamMemberRoles: (TeamRole | undefined)[]
): number {
  if (!userRole || userRole === 'flexible') return 50;

  const existingRoles = teamMemberRoles.filter(Boolean) as TeamRole[];

  if (existingRoles.length === 0) return 75; // Empty team — any role is useful

  const roleOccurrences = existingRoles.filter(r => r === userRole).length;

  if (roleOccurrences === 0) return 100; // Role not present — fills a gap
  if (roleOccurrences === 1) return 40;  // One already exists — some overlap
  return 10;                              // Multiple — highly redundant
}

/**
 * Score how complementary the user's skills are to the team.
 * High score = user brings unique skills team lacks.
 */
function scoreSkillComplementarity(
  userSkills: SkillTag[],
  teamSkills: SkillTag[]
): number {
  const userSkillNames = userSkills.map(s => s.skill.toLowerCase());
  const teamSkillNames = teamSkills.map(s => s.skill.toLowerCase());

  if (userSkillNames.length === 0) return 30;
  if (teamSkillNames.length === 0) return 70; // Team has no skills set — user's skills are fully unique

  const uniqueSkills = userSkillNames.filter(s => !teamSkillNames.includes(s));
  return Math.round((uniqueSkills.length / userSkillNames.length) * 100);
}

/**
 * Score alignment of collaboration styles via intersection-over-union.
 */
function scoreCollaborationAlignment(
  userStyles: CollaborationStyle[] | undefined,
  teamMemberStyles: (CollaborationStyle[] | undefined)[]
): number {
  if (!userStyles || userStyles.length === 0) return 50;

  // Flatten team member styles
  const allTeamStyles = teamMemberStyles
    .filter(Boolean)
    .flatMap(s => s as CollaborationStyle[]);

  if (allTeamStyles.length === 0) return 50;

  const userSet = new Set(userStyles);
  const teamSet = new Set(allTeamStyles);

  const intersection = [...userSet].filter(s => teamSet.has(s)).length;
  const union = new Set([...userSet, ...teamSet]).size;

  return union === 0 ? 50 : Math.round((intersection / union) * 100);
}

/**
 * Score alignment of communication preferences.
 */
function scoreCommunicationAlignment(
  userPrefs: CommunicationPreference[] | undefined,
  teamMemberPrefs: (CommunicationPreference[] | undefined)[]
): number {
  if (!userPrefs || userPrefs.length === 0) return 50;

  const allTeamPrefs = teamMemberPrefs
    .filter(Boolean)
    .flatMap(p => p as CommunicationPreference[]);

  if (allTeamPrefs.length === 0) return 50;

  const userSet = new Set(userPrefs);
  const teamSet = new Set(allTeamPrefs);

  const intersection = [...userSet].filter(p => teamSet.has(p)).length;
  const union = new Set([...userSet, ...teamSet]).size;

  return union === 0 ? 50 : Math.round((intersection / union) * 100);
}

/**
 * Score mentorship compatibility.
 * mentor + mentee pair = 100; both open = 75; no conflict = 50; mismatch = 25
 */
function scoreMentorshipCompatibility(
  userPref: MentorshipPreference | undefined,
  teamMemberPrefs: (MentorshipPreference | undefined)[]
): number {
  if (!userPref || userPref === 'neither') return 50;

  const teamPrefs = teamMemberPrefs.filter(Boolean) as MentorshipPreference[];
  if (teamPrefs.length === 0) return 50;

  if (userPref === 'mentor') {
    if (teamPrefs.some(p => p === 'mentee' || p === 'both')) return 100;
    if (teamPrefs.some(p => p === 'neither')) return 50;
    return 25; // All mentors
  }

  if (userPref === 'mentee') {
    if (teamPrefs.some(p => p === 'mentor' || p === 'both')) return 100;
    if (teamPrefs.some(p => p === 'neither')) return 50;
    return 25; // All mentees
  }

  if (userPref === 'both') {
    if (teamPrefs.some(p => p === 'mentor' || p === 'mentee')) return 75;
    return 50;
  }

  return 50;
}

// ==========================================
// MATCH REASON CHIP GENERATION
// ==========================================

function buildMatchReasons(
  roleScore: number,
  skillScore: number,
  collaborationScore: number,
  mentorshipScore: number,
  userRole: TeamRole | undefined,
  userSkills: SkillTag[],
  teamSkills: SkillTag[],
  userPref: MentorshipPreference | undefined,
  teamMemberMentorPrefs: (MentorshipPreference | undefined)[]
): string[] {
  const reasons: string[] = [];

  // Role chip
  if (roleScore >= 70 && userRole && userRole !== 'flexible') {
    const formattedRole = userRole
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    reasons.push(`Fills ${formattedRole} gap`);
  }

  // Skills chips (up to 2 unique skills)
  const teamSkillNames = new Set(teamSkills.map(s => s.skill.toLowerCase()));
  const uniqueUserSkills = userSkills
    .filter(s => !teamSkillNames.has(s.skill.toLowerCase()))
    .slice(0, 2);
  if (uniqueUserSkills.length > 0) {
    reasons.push(`Brings ${uniqueUserSkills.map(s => s.skill).join(', ')}`);
  }

  // Collaboration chip
  if (collaborationScore >= 70) {
    reasons.push('Collaboration: great fit');
  }

  // Mentorship chip
  if (userPref === 'mentor') {
    const teamHasMentee = teamMemberMentorPrefs.some(p => p === 'mentee' || p === 'both');
    if (teamHasMentee) reasons.push('Seeks mentor — you can help');
  } else if (userPref === 'mentee') {
    const teamHasMentor = teamMemberMentorPrefs.some(p => p === 'mentor' || p === 'both');
    if (teamHasMentor) reasons.push('Mentor available on team');
  }

  return reasons;
}

// ==========================================
// MAIN SCORING FUNCTION
// ==========================================

/**
 * Calculate match result between a user and a team.
 */
export function calculateTeamMatch(
  userParticipant: HackathonParticipant,
  team: HackathonTeam,
  _hackathonMaxTeamSize: number
): TeamMatchResult {
  const members = team.members || [];

  // Collect team member data
  const teamMemberRoles = members.map(m => m.preferredTeamRole);
  const teamMemberSkills: SkillTag[] = members.flatMap(m => m.skillProficiencies || []);
  const teamMemberCollabStyles = members.map(m => m.collaborationStyle);
  const teamMemberCommPrefs = members.map(m => m.communicationPreferences);
  const teamMemberMentorPrefs = members.map(m => m.mentorshipPreference);

  const userSkills = userParticipant.skillProficiencies || [];
  const userRole = userParticipant.preferredTeamRole;
  const userCollabStyles = userParticipant.collaborationStyle;
  const userCommPrefs = userParticipant.communicationPreferences;
  const userMentorPref = userParticipant.mentorshipPreference;

  // Calculate individual scores
  const roleScore = scoreRoleComplementarity(userRole, teamMemberRoles);
  const skillScore = scoreSkillComplementarity(userSkills, teamMemberSkills);
  const collaborationScore = scoreCollaborationAlignment(userCollabStyles, teamMemberCollabStyles);
  const communicationScore = scoreCommunicationAlignment(userCommPrefs, teamMemberCommPrefs);
  const mentorshipScore = scoreMentorshipCompatibility(userMentorPref, teamMemberMentorPrefs);

  // Weighted overall score
  const overall = Math.round(
    roleScore * WEIGHTS.role +
    skillScore * WEIGHTS.skills +
    collaborationScore * WEIGHTS.collaboration +
    communicationScore * WEIGHTS.communication +
    mentorshipScore * WEIGHTS.mentorship
  );

  // Compute suggested role
  const suggestedRole = userRole && userRole !== 'flexible' ? userRole : null;

  // Compute skills user brings that team lacks
  const teamSkillSet = new Set(teamMemberSkills.map(s => s.skill.toLowerCase()));
  const missingSkills = userSkills
    .filter(s => !teamSkillSet.has(s.skill.toLowerCase()))
    .map(s => s.skill);

  // Complementary skills (user has, team also has — shared strengths)
  const complementarySkills = userSkills
    .filter(s => teamSkillSet.has(s.skill.toLowerCase()))
    .map(s => s.skill);

  // Build match reason chips
  const matchReasons = buildMatchReasons(
    roleScore,
    skillScore,
    collaborationScore,
    mentorshipScore,
    userRole,
    userSkills,
    teamMemberSkills,
    userMentorPref,
    teamMemberMentorPrefs
  );

  return {
    teamId: team.id,
    overall,
    breakdown: {
      role: roleScore,
      skills: skillScore,
      collaboration: collaborationScore,
      communication: communicationScore,
      mentorship: mentorshipScore
    },
    suggestedRole,
    missingSkills,
    complementarySkills,
    matchReasons
  };
}

/**
 * Rank unteamed participants by how well they fit a team.
 * Used by team creators to find the best candidates to invite.
 */
export function rankParticipantsForTeam(
  team: HackathonTeam,
  participants: HackathonParticipant[],
  hackathonMaxTeamSize: number
): Array<HackathonParticipant & { match: TeamMatchResult }> {
  return participants
    .map(participant => ({
      ...participant,
      match: calculateTeamMatch(participant, team, hackathonMaxTeamSize)
    }))
    .sort((a, b) => b.match.overall - a.match.overall);
}

/**
 * Rank teams for a user sorted by overall compatibility score descending.
 * Only includes teams that are looking for members and are not full.
 */
export function rankTeamsForUser(
  userParticipant: HackathonParticipant,
  teams: HackathonTeam[],
  hackathonMaxTeamSize: number
): Array<HackathonTeam & { match: TeamMatchResult }> {
  return teams
    .filter(team => team.lookingForMembers && (team.memberCount || 0) < hackathonMaxTeamSize)
    .map(team => ({
      ...team,
      match: calculateTeamMatch(userParticipant, team, hackathonMaxTeamSize)
    }))
    .sort((a, b) => b.match.overall - a.match.overall);
}
