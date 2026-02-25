// src/types/hackathon.ts

import type { SkillTag, TeamRole, CollaborationStyle, TeamSizePreference, CommunicationPreference, MentorshipPreference } from './career';

/**
 * Core hackathon event - independent from calendar events
 */
export interface HackathonEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerId: string;
  organizerName?: string;
  organizerLogoUrl?: string | null;
  registrationDeadline?: string | null;
  submissionDeadline?: string | null;
  maxTeamSize: number;
  minTeamSize: number;
  platformUrl?: string | null;
  registrationUrl?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  status: HackathonStatus;
  isVirtual: boolean;
  eventId?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  prizePool?: string | null;
  prizeDescription?: string | null;
  tags?: string[];
  userParticipation?: HackathonParticipant;
  teams?: HackathonTeam[];
  totalParticipants?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hackathon team structure
 */
export interface HackathonTeam {
  id: string;
  hackathonId: string;
  name: string;
  description?: string | null;
  lookingForMembers: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: HackathonParticipant[];
  icon?: string | null;
  roles?: string[];
}

/**
 * Hackathon participant/team member
 */
export interface HackathonParticipant {
  id: string;
  hackathonId: string;
  userId: string;
  teamId?: string | null;
  status: HackathonParticipantStatus;
  skills: string[];
  skillProficiencies?: SkillTag[];
  preferredTeamRole?: TeamRole;
  collaborationStyle?: CollaborationStyle[];
  teamSizePreference?: TeamSizePreference;
  communicationPreferences?: CommunicationPreference[];
  teamGoals?: string[];
  mentorshipPreference?: MentorshipPreference;
  availabilityPattern?: Record<string, unknown>;
  projectTypePreferences?: string[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  team?: HackathonTeam;
}

/**
 * Hackathon status values
 */
export type HackathonStatus = 'active' | 'cancelled' | 'completed';

/**
 * Participant status in hackathon
 */
export type HackathonParticipantStatus =
  | 'interested'     // Bookmarked/interested in participating
  | 'registered'     // Officially registered for the hackathon
  | 'team_formed';   // Has joined or created a team

/**
 * Team creation/update form data
 */
export interface TeamFormData {
  name: string;
  description?: string;
  lookingForMembers: boolean;
}

/**
 * User registration form data for hackathons
 */
export interface HackathonRegistrationData {
  skills: string[];
  status: HackathonParticipantStatus;
  skillProficiencies?: SkillTag[];
  preferredTeamRole?: string;
  collaborationStyle?: string[];
  teamSizePreference?: string;
  communicationPreferences?: string[];
  teamGoals?: string[];
  mentorshipPreference?: string;
  availabilityPattern?: Record<string, unknown>;
  projectTypePreferences?: string[];
}

// ==========================================
// DATE/DURATION HELPERS (DRY Principle Applied)
// ==========================================

/**
 * Parse date string safely with error handling
 */
function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

/**
 * Calculate duration in days between two dates
 */
function calculateDurationDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Get hackathon date range for comparison operations
 */
function getHackathonDateRange(hackathon: HackathonEvent): { start: Date; end: Date; now: Date } {
  return {
    start: parseDate(hackathon.startDate),
    end: parseDate(hackathon.endDate),
    now: new Date()
  };
}

// ==========================================
// DURATION UTILITIES
// ==========================================

/**
 * Check if hackathon is long duration (>7 days)
 */
export function isLongDurationHackathon(hackathon: HackathonEvent): boolean {
  return calculateDurationDays(hackathon.startDate, hackathon.endDate) > 7;
}

/**
 * Check if hackathon is short duration (≤7 days)
 */
export function isShortDurationHackathon(hackathon: HackathonEvent): boolean {
  return !isLongDurationHackathon(hackathon);
}

/**
 * Get hackathon duration in days
 */
export function getHackathonDurationDays(hackathon: HackathonEvent): number {
  return calculateDurationDays(hackathon.startDate, hackathon.endDate);
}

/**
 * Format hackathon duration for display
 */
export function formatHackathonDuration(hackathon: HackathonEvent): string {
  const days = getHackathonDurationDays(hackathon);

  if (days === 1) return '1 day';
  if (days <= 7) return `${days} days`;
  if (days <= 14) return `${Math.ceil(days / 7)} week${days > 7 ? 's' : ''}`;
  if (days <= 60) return `${Math.ceil(days / 30)} month${days > 30 ? 's' : ''}`;

  return `${Math.ceil(days / 30)} months`;
}

// ==========================================
// STATUS UTILITIES
// ==========================================

/**
 * Check if hackathon is currently running
 */
export function isHackathonRunning(hackathon: HackathonEvent): boolean {
  const { start, end, now } = getHackathonDateRange(hackathon);
  return now >= start && now <= end;
}

/**
 * Check if hackathon has ended
 */
export function isHackathonEnded(hackathon: HackathonEvent): boolean {
  const { end, now } = getHackathonDateRange(hackathon);
  return now > end;
}

/**
 * Check if hackathon is upcoming (not started yet)
 */
export function isHackathonUpcoming(hackathon: HackathonEvent): boolean {
  const { start, now } = getHackathonDateRange(hackathon);
  return now < start;
}