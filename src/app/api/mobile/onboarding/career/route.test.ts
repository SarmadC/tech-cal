import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getProfile: vi.fn(),
  createProfile: vi.fn(),
  getCareerProfile: vi.fn(),
  getTeamBuildingPreferences: vi.fn(),
  completeCareerOnboarding: vi.fn(),
  fetchOnboardingTaxonomy: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/profileService', () => ({
  ProfileService: {
    getProfile: (...args: unknown[]) => mocks.getProfile(...args),
    createProfile: (...args: unknown[]) => mocks.createProfile(...args),
    updatePreferences: (...args: unknown[]) => mocks.updatePreferences(...args),
  },
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mocks.getCareerProfile(...args),
    getTeamBuildingPreferences: (...args: unknown[]) => mocks.getTeamBuildingPreferences(...args),
    completeCareerOnboarding: (...args: unknown[]) => mocks.completeCareerOnboarding(...args),
  },
}));

vi.mock('@/services/onboardingTaxonomyService', () => ({
  fetchOnboardingTaxonomy: (...args: unknown[]) => mocks.fetchOnboardingTaxonomy(...args),
}));

describe('mobile onboarding career route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'ada@example.com',
        user_metadata: { full_name: 'Ada Lovelace' },
      },
    });
    mocks.fetchOnboardingTaxonomy.mockResolvedValue({
      skillOptions: [{ value: 'TypeScript', label: 'TypeScript' }],
      interestOptions: [{ value: 'AI', label: 'AI' }],
      roleSuggestions: { 'Software Engineer': { current: ['TypeScript'] } },
      source: 'fallback',
    });
    mocks.getCareerProfile.mockResolvedValue({
      currentRole: 'Software Engineer',
      seniority: 'mid-level',
      industry: 'technology',
      companySize: 'medium',
      primarySkills: ['TypeScript', 'React'],
      skillsToLearn: ['Swift'],
      interests: ['AI'],
      skillTags: [],
      careerGoals: ['skill-development'],
      timeframe: 'short-term',
      targetPath: 'Frontend Engineering',
      learningStyle: ['hands-on'],
      availableTime: 'moderate',
      budget: 'low',
      networkingGoals: ['find-peers'],
      preferredEventTypes: ['workshop'],
    });
    mocks.getTeamBuildingPreferences.mockResolvedValue({
      teamRole: 'flexible',
      collaborationStyle: [],
      teamSizePreference: 'flexible',
      communicationPreferences: [],
      teamGoals: [],
      mentorshipPreference: 'neither',
      availabilityPattern: undefined,
      projectTypePreferences: [],
      skillProficiencies: [],
    });
  });

  it('returns the onboarding bootstrap payload', async () => {
    mocks.getProfile.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      preferences: {
        careerOnboardingCompleted: false,
        careerOptionalSections: {
          learningPreferences: true,
          networkingPreferences: false,
          teamPreferences: false,
        },
      },
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/onboarding/career', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.profileExists).toBe(true);
    expect(payload.data.draft.step1_role.currentRole).toBe('Software Engineer');
    expect(payload.data.taxonomy.skillOptions[0].value).toBe('TypeScript');
  });

  it('creates a profile if missing and completes onboarding', async () => {
    const missingProfileError = new Error('Profile not found');
    missingProfileError.name = 'ProfileNotFoundError';
    mocks.getProfile.mockRejectedValueOnce(missingProfileError).mockResolvedValueOnce({
      id: '22222222-2222-4222-8222-222222222222',
      preferences: {},
    });
    mocks.createProfile.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      preferences: {},
    });
    mocks.completeCareerOnboarding.mockResolvedValue(undefined);
    mocks.updatePreferences.mockResolvedValue(undefined);

    const response = await POST(
      new Request('http://localhost/api/mobile/onboarding/career', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
          'x-timezone': 'America/Edmonton',
        },
        body: JSON.stringify({
          data: {
            step1_role: {
              currentRole: 'Software Engineer',
              seniority: 'mid-level',
              industry: 'technology',
              companySize: 'medium',
            },
            step2_skills: {
              primarySkills: ['TypeScript', 'React'],
              skillsToLearn: ['Swift'],
              interests: ['AI'],
            },
            step3_goals: {
              careerGoals: ['skill-development'],
              timeframe: 'short-term',
            },
            step4_preferences: {
              learningStyle: ['hands-on'],
              availableTime: 'moderate',
              budget: 'low',
            },
            step5_networking: {
              networkingGoals: ['find-peers'],
              preferredEventTypes: ['workshop'],
            },
            step6_teamBuilding: {
              teamRole: 'flexible',
              collaborationStyle: [],
              teamSizePreference: 'flexible',
              communicationPreferences: [],
              teamGoals: [],
              mentorshipPreference: 'neither',
              projectTypePreferences: [],
            },
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.createProfile).toHaveBeenCalled();
    expect(mocks.completeCareerOnboarding).toHaveBeenCalled();
    expect(mocks.updatePreferences).toHaveBeenCalled();
  });
});
