import { describe, it, expect } from 'vitest';
import {
  calculateTeamMatch,
  rankParticipantsForTeam,
  rankTeamsForUser,
} from '../teamMatchingService';
import type { HackathonParticipant, HackathonTeam } from '@/types/hackathon';
import type { CollaborationStyle, SkillTag } from '@/types/career';

function makeSkill(skill: string): SkillTag {
  return { skill, yearsOfExperience: 2, lastUsed: '2024-01-01' };
}

function makeParticipant(overrides: Partial<HackathonParticipant> = {}): HackathonParticipant {
  return {
    id: 'p1',
    hackathonId: 'h1',
    userId: 'u1',
    status: 'registered',
    skills: [],
    skillProficiencies: [],
    preferredTeamRole: 'frontend-developer',
    collaborationStyle: ['hands-on'],
    communicationPreferences: ['slack'],
    mentorshipPreference: 'both',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function makeTeam(overrides: Partial<HackathonTeam> = {}): HackathonTeam {
  return {
    id: 't1',
    hackathonId: 'h1',
    name: 'Team Alpha',
    lookingForMembers: true,
    createdBy: 'u2',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    members: [],
    memberCount: 0,
    ...overrides,
  };
}

describe('teamMatchingService', () => {
  describe('calculateTeamMatch', () => {
    it('returns a TeamMatchResult with all required fields', () => {
      const user = makeParticipant({
        preferredTeamRole: 'frontend-developer',
        skillProficiencies: [makeSkill('React')],
        collaborationStyle: ['hands-on'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'mentee',
      });
      const team = makeTeam({
        members: [
          makeParticipant({
            id: 'p2',
            userId: 'u2',
            preferredTeamRole: 'backend-developer',
            skillProficiencies: [makeSkill('Python')],
            collaborationStyle: ['hands-on'],
            communicationPreferences: ['slack'],
            mentorshipPreference: 'mentor',
          }),
        ],
        memberCount: 1,
      });

      const result = calculateTeamMatch(user, team, 4);

      expect(result).toHaveProperty('teamId', 't1');
      expect(result).toHaveProperty('overall');
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown).toHaveProperty('role');
      expect(result.breakdown).toHaveProperty('skills');
      expect(result.breakdown).toHaveProperty('collaboration');
      expect(result.breakdown).toHaveProperty('communication');
      expect(result.breakdown).toHaveProperty('mentorship');
      expect(result).toHaveProperty('matchReasons');
      expect(Array.isArray(result.matchReasons)).toBe(true);
    });

    it('gives higher score for complementary team composition', () => {
      const user = makeParticipant({
        preferredTeamRole: 'ui-ux-designer',
        skillProficiencies: [makeSkill('Figma')],
        collaborationStyle: ['strategic'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'mentor',
      });

      const complementaryTeam = makeTeam({
        id: 't-comp',
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p2',
            preferredTeamRole: 'backend-developer',
            skillProficiencies: [makeSkill('Node.js')],
            collaborationStyle: ['strategic'],
            communicationPreferences: ['slack'],
            mentorshipPreference: 'mentee',
          }),
        ],
      });

      const duplicateTeam = makeTeam({
        id: 't-dup',
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p3',
            preferredTeamRole: 'ui-ux-designer',
            skillProficiencies: [makeSkill('Figma')],
            collaborationStyle: ['hands-on'],
            communicationPreferences: ['zoom'],
            mentorshipPreference: 'neither',
          }),
        ],
      });

      const compResult = calculateTeamMatch(user, complementaryTeam, 4);
      const dupResult = calculateTeamMatch(user, duplicateTeam, 4);

      expect(compResult.overall).toBeGreaterThan(dupResult.overall);
    });

    it('handles team with no members (empty team)', () => {
      const user = makeParticipant({
        skillProficiencies: [makeSkill('React')],
      });
      const emptyTeam = makeTeam({ members: [], memberCount: 0 });
      const result = calculateTeamMatch(user, emptyTeam, 4);
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });

    it('gives high role score when user fills unique gap', () => {
      const user = makeParticipant({
        preferredTeamRole: 'devops-engineer',
        skillProficiencies: [makeSkill('Docker')],
        collaborationStyle: ['hands-on'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'both',
      });
      const team = makeTeam({
        memberCount: 2,
        members: [
          makeParticipant({
            id: 'p2',
            preferredTeamRole: 'frontend-developer',
            skillProficiencies: [makeSkill('React')],
          }),
          makeParticipant({
            id: 'p3',
            preferredTeamRole: 'backend-developer',
            skillProficiencies: [makeSkill('Python')],
          }),
        ],
      });

      const result = calculateTeamMatch(user, team, 4);
      expect(result.breakdown.role).toBe(100);
    });

    it('gives lower role score when role is duplicated', () => {
      const user = makeParticipant({
        preferredTeamRole: 'frontend-developer',
        skillProficiencies: [makeSkill('React')],
      });
      const team = makeTeam({
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p2',
            preferredTeamRole: 'frontend-developer',
            skillProficiencies: [makeSkill('Vue')],
          }),
        ],
      });

      const result = calculateTeamMatch(user, team, 4);
      expect(result.breakdown.role).toBeLessThan(100);
    });

    it('gives high skill score when user brings unique skills', () => {
      const user = makeParticipant({
        preferredTeamRole: 'frontend-developer',
        skillProficiencies: [makeSkill('React'), makeSkill('TypeScript')],
        collaborationStyle: ['hands-on'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'both',
      });
      const team = makeTeam({
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p2',
            skillProficiencies: [makeSkill('Python'), makeSkill('Docker')],
          }),
        ],
      });

      const result = calculateTeamMatch(user, team, 4);
      expect(result.breakdown.skills).toBe(100); // all user skills are unique
    });

    it('gives lower skill score when skills overlap', () => {
      const user = makeParticipant({
        preferredTeamRole: 'frontend-developer',
        skillProficiencies: [makeSkill('React')],
        collaborationStyle: ['hands-on'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'both',
      });
      const team = makeTeam({
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p2',
            skillProficiencies: [makeSkill('React')],
          }),
        ],
      });

      const result = calculateTeamMatch(user, team, 4);
      expect(result.breakdown.skills).toBeLessThan(100);
    });

    it('gives high mentorship score for complementary mentor/mentee', () => {
      const user = makeParticipant({
        preferredTeamRole: 'frontend-developer',
        skillProficiencies: [makeSkill('React')],
        collaborationStyle: ['hands-on'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'mentee',
      });
      const team = makeTeam({
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p2',
            skillProficiencies: [makeSkill('Python')],
            mentorshipPreference: 'mentor',
          }),
        ],
      });

      const result = calculateTeamMatch(user, team, 4);
      expect(result.breakdown.mentorship).toBeGreaterThan(70);
    });

    it('computes weighted overall score within valid range', () => {
      const user = makeParticipant({
        skillProficiencies: [makeSkill('React')],
      });
      const team = makeTeam({
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p2',
            skillProficiencies: [makeSkill('Python')],
          }),
        ],
      });

      const result = calculateTeamMatch(user, team, 4);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      // Overall is a weighted sum of breakdown scores
      expect(typeof result.overall).toBe('number');
      expect(Number.isInteger(result.overall)).toBe(true);
    });
  });

  describe('rankParticipantsForTeam', () => {
    it('ranks participants by match score descending', () => {
      const team = makeTeam({
        memberCount: 1,
        members: [
          makeParticipant({
            id: 'p-existing',
            preferredTeamRole: 'backend-developer',
            skillProficiencies: [makeSkill('Python')],
            collaborationStyle: ['strategic'],
            communicationPreferences: ['slack'],
            mentorshipPreference: 'mentor',
          }),
        ],
      });

      const candidates = [
        makeParticipant({
          id: 'c1',
          userId: 'u-c1',
          preferredTeamRole: 'backend-developer', // duplicate role
          skillProficiencies: [makeSkill('Python')], // duplicate skill
          collaborationStyle: ['hands-on'],
          communicationPreferences: ['zoom'],
          mentorshipPreference: 'neither',
        }),
        makeParticipant({
          id: 'c2',
          userId: 'u-c2',
          preferredTeamRole: 'frontend-developer', // unique role
          skillProficiencies: [makeSkill('React')], // unique skill
          collaborationStyle: ['strategic'],
          communicationPreferences: ['slack'],
          mentorshipPreference: 'mentee',
        }),
      ];

      const ranked = rankParticipantsForTeam(team, candidates, 4);

      expect(ranked.length).toBe(2);
      // c2 (complementary) should rank higher than c1 (duplicate)
      expect(ranked[0].id).toBe('c2');
      expect(ranked[0].match.overall).toBeGreaterThan(ranked[1].match.overall);
    });

    it('returns empty for empty candidates', () => {
      const team = makeTeam();
      const ranked = rankParticipantsForTeam(team, [], 4);
      expect(ranked).toEqual([]);
    });

    it('includes match details for each participant', () => {
      const team = makeTeam({
        memberCount: 1,
        members: [makeParticipant({ id: 'p2', skillProficiencies: [makeSkill('Go')] })],
      });
      const candidates = [
        makeParticipant({ id: 'c1', skillProficiencies: [makeSkill('React')] }),
      ];

      const ranked = rankParticipantsForTeam(team, candidates, 4);
      expect(ranked[0].match).toBeDefined();
      expect(ranked[0].match.breakdown).toBeDefined();
      expect(ranked[0].match.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('rankTeamsForUser', () => {
    it('ranks teams by match score descending', () => {
      const user = makeParticipant({
        preferredTeamRole: 'frontend-developer',
        skillProficiencies: [makeSkill('React')],
        collaborationStyle: ['hands-on'],
        communicationPreferences: ['slack'],
        mentorshipPreference: 'mentee',
      });

      const teams = [
        makeTeam({
          id: 't1',
          lookingForMembers: true,
          memberCount: 1,
          members: [
            makeParticipant({
              id: 'p-bad',
              preferredTeamRole: 'frontend-developer',
              skillProficiencies: [makeSkill('React')],
              collaborationStyle: ['mentoring' as CollaborationStyle],
              communicationPreferences: ['zoom'],
              mentorshipPreference: 'neither',
            }),
          ],
        }),
        makeTeam({
          id: 't2',
          lookingForMembers: true,
          memberCount: 1,
          members: [
            makeParticipant({
              id: 'p-good',
              preferredTeamRole: 'backend-developer',
              skillProficiencies: [makeSkill('Python')],
              collaborationStyle: ['hands-on'],
              communicationPreferences: ['slack'],
              mentorshipPreference: 'mentor',
            }),
          ],
        }),
      ];

      const ranked = rankTeamsForUser(user, teams, 4);

      expect(ranked.length).toBe(2);
      expect(ranked[0].id).toBe('t2');
      expect(ranked[0].match.overall).toBeGreaterThan(ranked[1].match.overall);
    });

    it('filters out teams not looking for members', () => {
      const user = makeParticipant({ skillProficiencies: [makeSkill('React')] });
      const teams = [
        makeTeam({ id: 't1', lookingForMembers: false, memberCount: 1 }),
        makeTeam({ id: 't2', lookingForMembers: true, memberCount: 1 }),
      ];

      const ranked = rankTeamsForUser(user, teams, 4);

      expect(ranked.length).toBe(1);
      expect(ranked[0].id).toBe('t2');
    });

    it('filters out full teams (memberCount >= maxTeamSize)', () => {
      const user = makeParticipant({ skillProficiencies: [makeSkill('React')] });
      const fullTeam = makeTeam({
        id: 't1',
        lookingForMembers: true,
        memberCount: 4,
      });
      const openTeam = makeTeam({
        id: 't2',
        lookingForMembers: true,
        memberCount: 1,
      });

      const ranked = rankTeamsForUser(user, [fullTeam, openTeam], 4);

      expect(ranked.length).toBe(1);
      expect(ranked[0].id).toBe('t2');
    });

    it('returns empty for empty teams array', () => {
      const user = makeParticipant({ skillProficiencies: [makeSkill('React')] });
      const ranked = rankTeamsForUser(user, [], 4);
      expect(ranked).toEqual([]);
    });
  });
});
