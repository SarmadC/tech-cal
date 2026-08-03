import { describe, expect, it, vi } from 'vitest';
import { PublicProfileService } from '../publicProfileService';
import type { SupabaseClientType } from '@/types';

function createEventQuery(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (
      onFulfilled?: (result: { data: unknown[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve({ data, error: null }).then(onFulfilled, onRejected),
  };

  return query;
}

type RecentEventReader = {
  getRecentAttendingEvents: (input: {
    readClient: SupabaseClientType;
    userId: string;
    viewerId: string | null;
    isViewerOwner: boolean;
    canViewAttendance: boolean;
  }) => Promise<unknown[]>;
};

type CareerContextReader = {
  getCareerProfile: (
    readClient: SupabaseClientType,
    userId: string
  ) => Promise<{
    currentRole: string | null;
    companyName: string | null;
    primarySkills: string[];
    skillsToLearn: string[];
    interests: string[];
    careerGoals: string[];
    networkingGoals: string[];
    preferredEventTypes: string[];
    lastUpdated: string;
  } | null>;
};

function createMaybeSingleQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };

  return query;
}

function createCareerRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-1',
    current_role: null,
    company_name: null,
    primary_skills: [],
    skills_to_learn: [],
    interests: [],
    career_goals: [],
    timeframe: null,
    target_path: null,
    learning_style: [],
    networking_goals: [],
    preferred_event_types: [],
    updated_at: '2026-07-20T12:00:00.000Z',
    ...overrides,
  };
}

function createOnboardingDraft(overrides: Record<string, unknown> = {}) {
  return {
    careerOnboardingDraft: {
      step1_role: { currentRole: 'Backend Engineer', companyName: 'KureCal' },
      step2_skills: { primarySkills: ['TypeScript', 'PostgreSQL'], skillsToLearn: [], interests: [] },
      step3_goals: { careerGoals: ['skill-development'], timeframe: 'medium-term' },
      step5_networking: { networkingGoals: ['find-peers'], preferredEventTypes: ['conference'] },
    },
    careerOnboardingDraftUpdatedAt: '2026-07-21T12:00:00.000Z',
    ...overrides,
  };
}

function createCareerContextClient(careerResult: { data: unknown; error: unknown }, preferences: Record<string, unknown>) {
  const careerQuery = createMaybeSingleQuery(careerResult);
  const profileQuery = createMaybeSingleQuery({ data: { preferences }, error: null });

  return {
    from: vi.fn((table: string) => table === 'career_profiles' ? careerQuery : profileQuery),
  } as unknown as SupabaseClientType;
}

describe('PublicProfileService recent journey', () => {
  it('excludes a stale attended activity after attendance is removed', async () => {
    const stalePastEvent = {
      id: 'event-1',
      slug: 'data-saturday-chicago-2026',
      title: 'Data Saturday Chicago 2026',
      start_time: '2026-03-14T07:00:00.000Z',
      end_time: null,
      location: 'Palatine, USA',
      user_events: [{
        user_id: 'user-1',
        activity_type: 'attended',
        role: null,
        status: null,
      }],
    };
    const readClient = {
      from: vi.fn()
        .mockReturnValueOnce(createEventQuery([]))
        .mockReturnValueOnce(createEventQuery([stalePastEvent])),
    } as unknown as SupabaseClientType;

    const events = await (PublicProfileService as unknown as RecentEventReader).getRecentAttendingEvents({
      readClient,
      userId: 'user-1',
      viewerId: 'user-1',
      isViewerOwner: false,
      canViewAttendance: true,
    });

    expect(events).toEqual([]);
  });

  it('retains speaking activity independently of removed attendance', async () => {
    const speakingEvent = {
      id: 'event-2',
      slug: 'speaker-event',
      title: 'Speaker Event',
      start_time: '2026-03-14T07:00:00.000Z',
      end_time: null,
      location: null,
      user_events: [{
        user_id: 'user-1',
        activity_type: 'speaking',
        role: 'Speaker',
        status: null,
      }],
    };
    const readClient = {
      from: vi.fn()
        .mockReturnValueOnce(createEventQuery([]))
        .mockReturnValueOnce(createEventQuery([speakingEvent])),
    } as unknown as SupabaseClientType;

    const events = await (PublicProfileService as unknown as RecentEventReader).getRecentAttendingEvents({
      readClient,
      userId: 'user-1',
      viewerId: null,
      isViewerOwner: false,
      canViewAttendance: true,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'event-2', activityType: 'speaking' });
  });
});

describe('PublicProfileService partial career context', () => {
  const reader = PublicProfileService as unknown as CareerContextReader;

  it('returns visible onboarding draft fields when no career row exists', async () => {
    const result = await reader.getCareerProfile(
      createCareerContextClient({ data: null, error: null }, createOnboardingDraft()),
      'user-1'
    );

    expect(result).toMatchObject({
      currentRole: 'Backend Engineer',
      companyName: 'KureCal',
      primarySkills: ['TypeScript', 'PostgreSQL'],
      careerGoals: ['skill-development'],
    });
  });

  it('merges a newer partial onboarding draft into a sparse career row', async () => {
    const result = await reader.getCareerProfile(
      createCareerContextClient(
        { data: createCareerRow({ interests: ['Open source'] }), error: null },
        createOnboardingDraft()
      ),
      'user-1'
    );

    expect(result).toMatchObject({
      currentRole: 'Backend Engineer',
      companyName: 'KureCal',
      primarySkills: ['TypeScript', 'PostgreSQL'],
      interests: ['Open source'],
      careerGoals: ['skill-development'],
      networkingGoals: ['find-peers'],
    });
  });

  it('keeps a newer persisted career profile instead of applying a stale draft', async () => {
    const result = await reader.getCareerProfile(
      createCareerContextClient(
        {
          data: createCareerRow({
            current_role: 'Staff Engineer',
            company_name: 'Completed Co',
            primary_skills: ['Go', 'Kubernetes'],
            career_goals: ['leadership-growth'],
            updated_at: '2026-07-22T12:00:00.000Z',
          }),
          error: null,
        },
        createOnboardingDraft(),
      ),
      'user-1'
    );

    expect(result).toMatchObject({
      currentRole: 'Staff Engineer',
      companyName: 'Completed Co',
      primarySkills: ['Go', 'Kubernetes'],
      careerGoals: ['leadership-growth'],
    });
  });

  it('returns no career context for an empty onboarding draft', async () => {
    const result = await reader.getCareerProfile(
      createCareerContextClient(
        { data: null, error: null },
        createOnboardingDraft({
          careerOnboardingDraft: {
            step1_role: {},
            step2_skills: {},
            step3_goals: {},
            step5_networking: {},
          },
        })
      ),
      'user-1'
    );

    expect(result).toBeNull();
  });
});
