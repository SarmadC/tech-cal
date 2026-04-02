import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppProfile, Event } from '@/types';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';

vi.mock('@/hooks/useTrackedEventsUnified', () => ({
  useTrackedEventIds: () => ({ trackedEventIds: new Set() }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

function createMockProfile(overrides: Partial<AppProfile> = {}): AppProfile {
  return {
    id: 'user-1',
    fullName: 'Test User',
    avatarUrl: null,
    timezone: 'America/Edmonton',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    preferences: {
      careerProfile: {
        currentRole: 'Designer',
        seniority: 'junior',
        industry: 'technology',
        primarySkills: ['Figma'],
        skillsToLearn: ['Framer'],
        interests: ['UI/UX Design'],
        careerGoals: ['skill-development'],
        learningStyle: ['hands-on'],
        networkingGoals: ['find-peers'],
        preferredEventTypes: ['networking'],
      },
    },
    ...overrides,
  };
}

function createEvent(id: string): Event {
  return {
    id,
    createdAt: '2026-03-31T09:00:00.000Z',
    title: `Event ${id}`,
    description: '',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    timezone: 'UTC',
    organizer: 'Test Organizer',
    location: 'Remote',
    status: 'confirmed',
    sourceUrl: 'https://example.com/events/test',
    livestreamUrl: null,
    eventTypeId: 'general',
    agendaUrl: null,
  };
}

function createSuccessResponse(eventIds: string[]) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        events: eventIds.map(createEvent),
        pagination: { page: 1, pageSize: 50, total: eventIds.length, hasMore: false },
        filters: { applied: {}, available: { categories: [], difficulties: [], formats: [], locations: [] } },
        stats: { processingTimeMs: 10, filteredCount: eventIds.length, totalCount: eventIds.length },
        counts: null,
      },
    }),
  } as Response;
}

function createDeferredResponse(eventIds: string[]) {
  let resolve: (value: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });

  return {
    promise,
    resolve: () => resolve(createSuccessResponse(eventIds)),
  };
}

function getFilteredQueryKeys(queryClient: QueryClient) {
  return queryClient
    .getQueryCache()
    .getAll()
    .map((query) => query.queryKey)
    .filter((queryKey) => Array.isArray(queryKey) && queryKey[0] === 'filtered-events');
}

function getPersonalizationPayload(queryKey: readonly unknown[]) {
  const queryMeta = queryKey[3] as { personalizationKey: string };
  return JSON.parse(queryMeta.personalizationKey) as { userId: string };
}

describe('useUnifiedServerFiltering personalization', () => {
  let queryClient: QueryClient;
  let authContextValue: AuthContextType;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    authContextValue = {
      user: { id: 'user-1' } as AuthContextType['user'],
      session: null,
      profile: null,
      loading: false,
      initialized: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updateProfile: vi.fn(),
      refreshProfile: vi.fn(),
    };

    global.fetch = vi.fn().mockResolvedValue(createSuccessResponse(['initial']));
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  it('changes the paged query key when the auth user changes with no profile', async () => {
    const { rerender } = renderHook(
      ({ profile }) => useUnifiedServerFiltering(profile),
      { initialProps: { profile: null as AppProfile | null }, wrapper }
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const firstKey = getFilteredQueryKeys(queryClient)[0] as readonly unknown[];
    expect(getPersonalizationPayload(firstKey).userId).toBe('user-1');

    authContextValue = { ...authContextValue, user: { id: 'user-2' } as AuthContextType['user'] };
    rerender({ profile: null });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      const queryKeys = getFilteredQueryKeys(queryClient) as unknown as readonly unknown[][];
      expect(queryKeys.some((queryKey) => getPersonalizationPayload(queryKey).userId === 'user-2')).toBe(true);
    });
  });

  it('changes the query key when ranking-relevant profile fields change', async () => {
    const firstProfile = createMockProfile();
    const secondProfile = createMockProfile({
      preferences: {
        careerProfile: {
          ...(firstProfile.preferences as Record<string, unknown>).careerProfile as Record<string, unknown>,
          primarySkills: ['Framer'],
        },
      },
    });

    const { rerender } = renderHook(
      ({ profile }) => useUnifiedServerFiltering(profile),
      { initialProps: { profile: firstProfile }, wrapper }
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const firstKey = getFilteredQueryKeys(queryClient)[0] as readonly unknown[];

    rerender({ profile: secondProfile });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const secondKey = getFilteredQueryKeys(queryClient)[1] as readonly unknown[];

    expect(JSON.stringify(firstKey)).not.toBe(JSON.stringify(secondKey));
  });

  it('changes the query key when updatedAt changes even if profile content is unchanged', async () => {
    const firstProfile = createMockProfile({ updatedAt: '2026-01-01T00:00:00.000Z' });
    const secondProfile = createMockProfile({ updatedAt: '2026-01-02T00:00:00.000Z' });

    const { rerender } = renderHook(
      ({ profile }) => useUnifiedServerFiltering(profile),
      { initialProps: { profile: firstProfile }, wrapper }
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const firstKey = getFilteredQueryKeys(queryClient)[0] as readonly unknown[];

    rerender({ profile: secondProfile });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const secondKey = getFilteredQueryKeys(queryClient)[1] as readonly unknown[];

    expect(JSON.stringify(firstKey)).not.toBe(JSON.stringify(secondKey));
  });

  it('keeps fastSearch in the query key when typing a search', async () => {
    const { result } = renderHook(() => useUnifiedServerFiltering(null), { wrapper });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.updateFilter('searchTerm', 'figma');
    });

    await waitFor(() => {
      const queryKeys = getFilteredQueryKeys(queryClient);
      expect(queryKeys.some((queryKey) => JSON.stringify(queryKey).includes('"fastSearch":true'))).toBe(true);
    });
  });

  it('reuses placeholder data for filter-only changes', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(createSuccessResponse(['old']));

    const { result } = renderHook(() => useUnifiedServerFiltering(createMockProfile()), { wrapper });

    await waitFor(() => expect(result.current.filteredEvents.map((event) => event.id)).toEqual(['old']));

    const deferredResponse = createDeferredResponse(['new-filter']);
    fetchMock.mockReturnValueOnce(deferredResponse.promise);

    await act(async () => {
      result.current.updateFilter('categories', ['design']);
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current.filteredEvents.map((event) => event.id)).toEqual(['old']);

    deferredResponse.resolve();
    await waitFor(() => expect(result.current.filteredEvents.map((event) => event.id)).toEqual(['new-filter']));
  });

  it('drops placeholder data when the personalization context changes', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(createSuccessResponse(['old']));

    const { result, rerender } = renderHook(
      ({ profile }) => useUnifiedServerFiltering(profile),
      { initialProps: { profile: createMockProfile() }, wrapper }
    );

    await waitFor(() => expect(result.current.filteredEvents.map((event) => event.id)).toEqual(['old']));

    const deferredResponse = createDeferredResponse(['new-profile']);
    fetchMock.mockReturnValueOnce(deferredResponse.promise);

    rerender({
      profile: createMockProfile({
        updatedAt: '2026-01-03T00:00:00.000Z',
        preferences: {
          careerProfile: {
            currentRole: 'Designer',
            seniority: 'junior',
            industry: 'technology',
            primarySkills: ['Framer'],
            skillsToLearn: ['Figma Variables'],
            interests: ['UI/UX Design'],
            careerGoals: ['networking'],
            learningStyle: ['hands-on'],
            networkingGoals: ['find-mentors'],
            preferredEventTypes: ['meetup'],
          },
        },
      }),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current.filteredEvents).toEqual([]);

    deferredResponse.resolve();
    await waitFor(() => expect(result.current.filteredEvents.map((event) => event.id)).toEqual(['new-profile']));
  });
});
