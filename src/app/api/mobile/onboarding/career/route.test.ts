import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  mobileCareerOnboardingBootstrapSchema,
  mobileOnboardingStatusSchema,
} from '@kurecal/domain';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  buildMobileCareerOnboardingBootstrap: vi.fn(),
  completeCareerOnboarding: vi.fn(),
  ensureMobileProfile: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  markOnboardingCompleted: vi.fn(),
  saveMobileOnboardingDraft: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/app/api/mobile/profileState', () => ({
  buildMobileCareerOnboardingBootstrap: (...args: unknown[]) =>
    mocks.buildMobileCareerOnboardingBootstrap(...args),
  ensureMobileProfile: (...args: unknown[]) => mocks.ensureMobileProfile(...args),
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    completeCareerOnboarding: (...args: unknown[]) =>
      mocks.completeCareerOnboarding(...args),
    markOnboardingCompleted: (...args: unknown[]) =>
      mocks.markOnboardingCompleted(...args),
    saveMobileOnboardingDraft: (...args: unknown[]) =>
      mocks.saveMobileOnboardingDraft(...args),
  },
}));

const bootstrap = {
  status: {
    onboarded: false,
    source: 'none',
  },
  initialData: null,
  taxonomy: {
    roleGroups: [
      {
        key: 'engineering',
        label: 'Engineering',
        roles: ['Software Engineer'],
      },
    ],
    skillOptions: [],
    interestOptions: [],
    roleSuggestions: {},
  },
};

describe('/api/mobile/onboarding/career', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.buildMobileCareerOnboardingBootstrap.mockResolvedValue(bootstrap);
    mocks.ensureMobileProfile.mockResolvedValue({});
    mocks.completeCareerOnboarding.mockResolvedValue({});
    mocks.markOnboardingCompleted.mockResolvedValue({});
    mocks.saveMobileOnboardingDraft.mockResolvedValue({});
  });

  it('returns onboarding bootstrap state', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/onboarding/career', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(
      mobileCareerOnboardingBootstrapSchema.parse(payload.data).status.onboarded
    ).toBe(false);
  });

  it('completes onboarding with the shared mobile payload', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/onboarding/career', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          data: {
            step1_role: {
              currentRole: 'Software Engineer',
              seniority: 'mid-level',
              industry: 'Technology',
              companyName: 'KureCal',
              companySize: 'medium',
            },
            step2_skills: {
              primarySkills: ['TypeScript', 'React'],
              skillsToLearn: [],
              interests: [],
            },
            step3_goals: {
              careerGoals: ['skill-development'],
              timeframe: 'medium-term',
            },
            step4_preferences: {
              targetPath: '',
              learningStyle: [],
              availableTime: 'moderate',
              budget: 'moderate',
            },
            step5_networking: {
              networkingGoals: [],
              preferredEventTypes: [],
            },
            step6_teamBuilding: {
              teamRole: 'flexible',
              collaborationStyle: [],
              teamSizePreference: 'flexible',
              communicationPreferences: [],
              teamGoals: [],
              mentorshipPreference: 'neither',
              availabilityPattern: null,
              projectTypePreferences: [],
            },
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.completeCareerOnboarding).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        step1_role: expect.objectContaining({ companyName: 'KureCal' }),
      }),
      {}
    );
    expect(mobileOnboardingStatusSchema.parse(payload.data).source).toBe(
      'career_profiles'
    );
  });

  it('saves completed onboarding fields as an in-progress draft', async () => {
    const draft = {
      step1_role: { currentRole: 'Software Engineer', seniority: 'mid-level', industry: '', companyName: 'KureCal', companySize: 'medium' },
      step2_skills: { primarySkills: [], skillsToLearn: [], interests: [] },
      step3_goals: { careerGoals: [], timeframe: 'medium-term' },
      step4_preferences: { targetPath: '', learningStyle: [], availableTime: 'moderate', budget: 'moderate' },
      step5_networking: { networkingGoals: [], preferredEventTypes: [] },
      step6_teamBuilding: { teamRole: 'flexible', collaborationStyle: [], teamSizePreference: 'flexible', communicationPreferences: [], teamGoals: [], mentorshipPreference: 'neither', availabilityPattern: null, projectTypePreferences: [] },
    };
    const response = await POST(
      new Request('http://localhost/api/mobile/onboarding/career', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-draft', data: draft }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.saveMobileOnboardingDraft).toHaveBeenCalledWith('user-1', draft, {});
  });

  it('supports skipping onboarding', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/onboarding/career', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'skip',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.markOnboardingCompleted).toHaveBeenCalledWith('user-1', {});
    expect(payload.data.source).toBe('legacy');
  });
});
