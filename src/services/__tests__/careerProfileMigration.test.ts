import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CareerProfileService } from '../careerProfileService';
import { CareerImpactService } from '../careerImpactService';
import { CareerProfile } from '@/types/career';
import type { SupabaseClientType } from '@/types';

const fromMock = vi.fn();
const rpcMock = vi.fn();

const mockSupabaseClient = {
  from: fromMock,
  rpc: rpcMock,
} as unknown as SupabaseClientType;

const createSelectEqSingleMock = <T>(response: { data: T; error: unknown }) => {
  const single = vi.fn().mockResolvedValue(response);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, single };
};

const createUpsertSelectSingleMock = <T>(response: { data: T; error: unknown }) => {
  // select() should return a thenable (promise-like) that resolves to { data, error }
  const select = vi.fn(() => Promise.resolve(response));
  const upsert = vi.fn(() => ({ select }));
  return { upsert, select };
};

describe('CareerProfileService Migration', () => {
  const userId = 'test-user-123';
  const mockCareerProfile: CareerProfile = {
    userId,
    profileId: 'profile_test-user-123_1234567890',
    lastUpdated: '2024-01-01T00:00:00Z',
    currentRole: 'Frontend Engineer',
    seniority: 'senior',
    industry: 'Technology/Software',
    companySize: 'medium',
    primarySkills: ['React', 'TypeScript', 'Node.js'],
    skillsToLearn: ['GraphQL', 'Docker'],
    interests: ['Web Development', 'UI/UX'],
    skillTags: [
      {
        skill: 'React',
        proficiency: 'advanced',
        yearsOfExperience: 5,
        lastUsed: '2024-01-01T00:00:00Z'
      }
    ],
    careerGoals: ['skill-development', 'career-advancement'],
    timeframe: 'medium-term',
    learningStyle: ['hands-on', 'interactive'],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: ['find-peers', 'find-mentors'],
    preferredEventTypes: ['conference', 'workshop']
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    fromMock.mockReset();
    fromMock.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    }));
    rpcMock.mockReset();
    vi.spyOn(CareerImpactService, 'invalidateProfileCache').mockResolvedValue(0);
    vi.spyOn(CareerProfileService, 'saveCareerProfileToPreferences').mockResolvedValue();
  });

  describe('transformRowToCareerProfile', () => {
    it('should transform database row to CareerProfile', () => {
      const mockRow = {
        user_id: userId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        "current_role": 'Frontend Engineer',
        seniority: 'senior',
        industry: 'Technology/Software',
        company_size: 'medium',
        primary_skills: ['React', 'TypeScript', 'Node.js'],
        skills_to_learn: ['GraphQL', 'Docker'],
        interests: ['Web Development', 'UI/UX'],
        skill_tags: [
          {
            skill: 'React',
            proficiency: 'advanced',
            yearsOfExperience: 5,
            lastUsed: '2024-01-01T00:00:00Z'
          }
        ],
        career_goals: ['skill-development', 'career-advancement'],
        timeframe: 'medium-term',
        learning_style: ['hands-on', 'interactive'],
        available_time: 'moderate',
        budget: 'moderate',
        networking_goals: ['find-peers', 'find-mentors'],
        preferred_event_types: ['conference', 'workshop']
      };

      // Access private method for testing
      const result = (CareerProfileService as unknown as { transformRowToCareerProfile: (row: unknown) => CareerProfile }).transformRowToCareerProfile(mockRow);

      expect(result).toEqual({
        userId: mockRow.user_id,
        profileId: expect.stringMatching(/^profile_test-user-123_\d+$/),
        lastUpdated: mockRow.updated_at,
        currentRole: mockRow.current_role,
        seniority: mockRow.seniority,
        industry: mockRow.industry,
        companySize: mockRow.company_size,
        primarySkills: mockRow.primary_skills,
        skillsToLearn: mockRow.skills_to_learn,
        interests: mockRow.interests,
        skillTags: mockRow.skill_tags,
        careerGoals: mockRow.career_goals,
        timeframe: mockRow.timeframe,
        learningStyle: mockRow.learning_style,
        availableTime: mockRow.available_time,
        budget: mockRow.budget,
        networkingGoals: mockRow.networking_goals,
        preferredEventTypes: mockRow.preferred_event_types
      });
    });
  });

  describe('transformCareerProfileToRow', () => {
    it('should transform CareerProfile to database row data', () => {
      const result = (CareerProfileService as unknown as { transformCareerProfileToRow: (profile: CareerProfile) => unknown }).transformCareerProfileToRow(mockCareerProfile);

      expect(result).toEqual({
        current_role: mockCareerProfile.currentRole,
        seniority: mockCareerProfile.seniority,
        industry: mockCareerProfile.industry,
        company_size: mockCareerProfile.companySize,
        primary_skills: mockCareerProfile.primarySkills,
        skills_to_learn: mockCareerProfile.skillsToLearn,
        interests: mockCareerProfile.interests,
        skill_tags: mockCareerProfile.skillTags,
        career_goals: mockCareerProfile.careerGoals,
        timeframe: mockCareerProfile.timeframe,
        learning_style: mockCareerProfile.learningStyle,
        available_time: mockCareerProfile.availableTime,
        budget: mockCareerProfile.budget,
        networking_goals: mockCareerProfile.networkingGoals,
        preferred_event_types: mockCareerProfile.preferredEventTypes
      });
    });
  });

  describe('getCareerProfile', () => {
    it('should return career profile from database', async () => {
      const mockRow = {
        user_id: userId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        "current_role": 'Frontend Engineer',
        seniority: 'senior',
        industry: 'Technology/Software',
        company_size: 'medium',
        primary_skills: ['React', 'TypeScript'],
        skills_to_learn: ['GraphQL'],
        interests: ['Web Development'],
        skill_tags: [],
        career_goals: ['skill-development'],
        timeframe: 'medium-term',
        learning_style: ['hands-on'],
        available_time: 'moderate',
        budget: 'moderate',
        networking_goals: ['find-peers'],
        preferred_event_types: ['conference']
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockRow,
              error: null
            })
          }))
        }))
      }));

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.getCareerProfile(userId, mockSupabaseClient);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.currentRole).toBe('Frontend Engineer');
      expect(fromMock).toHaveBeenCalledWith('career_profiles');
    });

    it('should return null when no career profile exists', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          }))
        }))
      }));

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.getCareerProfile(userId, mockSupabaseClient);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          }))
        }))
      }));

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.getCareerProfile(userId, mockSupabaseClient);

      expect(result).toBeNull();
    });
  });

  describe('saveCareerProfile', () => {
    it('should save career profile to database', async () => {
      const { upsert } = createUpsertSelectSingleMock({
        data: { user_id: userId },
        error: null
      });
      const { select: preferencesSelect } = createSelectEqSingleMock({
        data: { preferences: {} },
        error: null
      });
      const update = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }));

      const mockFrom = vi.fn((table: string) => {
        if (table === 'career_profiles') {
          return { upsert };
        }

        if (table === 'profiles') {
          return {
            select: preferencesSelect,
            update
          };
        }

        return {} as never;
      });

      fromMock.mockImplementation(mockFrom);

      await CareerProfileService.saveCareerProfile(userId, mockCareerProfile, mockSupabaseClient);

      expect(fromMock).toHaveBeenCalledWith('career_profiles');
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          current_role: mockCareerProfile.currentRole,
          seniority: mockCareerProfile.seniority,
          industry: mockCareerProfile.industry,
          company_size: mockCareerProfile.companySize,
          primary_skills: mockCareerProfile.primarySkills,
          skills_to_learn: mockCareerProfile.skillsToLearn,
          interests: mockCareerProfile.interests,
          skill_tags: mockCareerProfile.skillTags,
          career_goals: mockCareerProfile.careerGoals,
          timeframe: mockCareerProfile.timeframe,
          learning_style: mockCareerProfile.learningStyle,
          available_time: mockCareerProfile.availableTime,
          budget: mockCareerProfile.budget,
          networking_goals: mockCareerProfile.networkingGoals,
          preferred_event_types: mockCareerProfile.preferredEventTypes
        }),
        { onConflict: 'user_id' }
      );
    });

    it('should handle save errors', async () => {
      const { upsert } = createUpsertSelectSingleMock({
        data: null,
        error: { message: 'Save failed' }
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'career_profiles') {
          return { upsert };
        }
        return {} as never;
      });

      fromMock.mockImplementation(mockFrom);
      vi.spyOn(CareerProfileService, 'saveCareerProfileToPreferences').mockRejectedValueOnce(
        new Error('Fallback failed')
      );

      await expect(
        CareerProfileService.saveCareerProfile(userId, mockCareerProfile, mockSupabaseClient)
      ).rejects.toThrow('Failed to save career profile.');
    });
  });

  describe('hasCompletedOnboarding', () => {
    it('should return true when career profile exists', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { user_id: userId },
              error: null
            })
          }))
        }))
      }));

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.hasCompletedOnboarding(userId, mockSupabaseClient);

      expect(result).toBe(true);
    });

    it('should return false when no career profile exists', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          }))
        }))
      }));

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.hasCompletedOnboarding(userId, mockSupabaseClient);

      expect(result).toBe(false);
    });
  });

  describe('migrateCareerProfileData', () => {
    it('should migrate data from preferences to new table', async () => {
      const { select: existingProfileSelect } = createSelectEqSingleMock({
        data: null,
        error: null
      });
      const { select: preferencesSelect } = createSelectEqSingleMock({
        data: { preferences: { careerProfile: mockCareerProfile } },
        error: null
      });
      const mockFrom = vi.fn((table: string) => {
        if (table === 'career_profiles') {
          return { select: existingProfileSelect };
        }
        if (table === 'profiles') {
          return { select: preferencesSelect };
        }
        return {} as never;
      });
      const saveSpy = vi.spyOn(CareerProfileService, 'saveCareerProfile').mockResolvedValue();

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.migrateCareerProfileData(userId, mockSupabaseClient);

      expect(result).toBe(true);
      expect(saveSpy).toHaveBeenCalledWith(userId, mockCareerProfile, mockSupabaseClient);
    });

    it('should return true if profile already migrated', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { user_id: userId },
              error: null
            })
          }))
        }))
      }));

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.migrateCareerProfileData(userId, mockSupabaseClient);

      expect(result).toBe(true);
    });

    it('should return false if no career profile to migrate', async () => {
      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { preferences: {} },
                error: null
              })
            }))
          }))
        });

      fromMock.mockImplementation(mockFrom);

      const result = await CareerProfileService.migrateCareerProfileData(userId, mockSupabaseClient);

      expect(result).toBe(false);
    });
  });
});
