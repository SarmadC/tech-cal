import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TagBasedMatchingService } from '../tagBasedMatchingService';
import type { SupabaseClientType } from '@/types';
import parityInput from './fixtures/parity_input.json';

// Mock specific date for deterministic recency scoring
const MOCK_NOW = new Date('2024-05-01T00:00:00Z').getTime();

describe('TagBasedMatchingService Parity (Golden Master)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const allEvents = parityInput.events as Array<Record<string, unknown>>;
  const eventById = new Map(allEvents.map(event => [String(event.id), event]));
  const tagCandidates = [
    eventById.get('event-1-perfect-match'),
    eventById.get('event-2-partial-match'),
    eventById.get('event-3-skill-to-learn'),
    eventById.get('event-4-location-mismatch')
  ].filter(Boolean) as Array<Record<string, unknown>>;
  const textCandidates = [
    eventById.get('event-1-perfect-match'),
    eventById.get('event-5-agenda-match-only')
  ].filter(Boolean) as Array<Record<string, unknown>>;
  const discoveryCandidates = allEvents;
  const agendaRows = [
    { event_id: 'event-1-perfect-match' },
    { event_id: 'event-5-agenda-match-only' }
  ];

  const createThenableQueryBuilder = (seedData: Array<Record<string, unknown>>) => {
    let currentData = [...seedData];
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation((value: number) => {
        if (Number.isFinite(value) && value >= 0) {
          currentData = currentData.slice(0, value);
        }
        return builder;
      }),
      in: vi.fn().mockImplementation((column: string, values: unknown[]) => {
        if (!Array.isArray(values)) return builder;

        if (column === 'id') {
          const ids = new Set(values.map(value => String(value)));
          currentData = currentData.filter(event => ids.has(String(event.id)));
          return builder;
        }

        if (column === 'tags.event_tags.event_tag') {
          const terms = new Set(values.map(value => String(value).toLowerCase()));
          currentData = currentData.filter(event => {
            const tags = Array.isArray(event.tags) ? event.tags as Array<{ event_tags?: { event_tag?: string } | null }> : [];
            return tags.some(tag => {
              const eventTag = tag?.event_tags?.event_tag;
              return eventTag ? terms.has(eventTag.toLowerCase()) : false;
            });
          });
        }

        return builder;
      })
    };

    builder.then = (resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown) =>
      resolve({ data: currentData, error: null });

    return builder;
  };

  const createAgendaQueryBuilder = () => {
    let currentData = [...agendaRows];
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation((value: number) => {
        if (Number.isFinite(value) && value >= 0) {
          currentData = currentData.slice(0, value);
        }
        return builder;
      }),
    };

    builder.then = (resolve: (value: { data: typeof agendaRows; error: null }) => unknown) =>
      resolve({ data: currentData, error: null });

    return builder;
  };

  const createMockSupabase = (mode: 'recommendation' | 'discovery') => {
    const eventQuerySequences =
      mode === 'recommendation'
        ? [tagCandidates, textCandidates, discoveryCandidates, allEvents]
        : [discoveryCandidates, textCandidates, allEvents];

    let eventsQueryIndex = 0;
    const mockFrom = vi.fn((table: string) => {
      if (table === 'events') {
        const nextData = eventQuerySequences[Math.min(eventsQueryIndex, eventQuerySequences.length - 1)];
        eventsQueryIndex += 1;
        return createThenableQueryBuilder(nextData);
      }
      if (table === 'event_agenda') {
        return createAgendaQueryBuilder();
      }
      return createThenableQueryBuilder([]);
    });

    return {
      from: mockFrom,
    } as unknown as SupabaseClientType;
  };

  it('generates identical recommendation results', async () => {
    const mockSupabase = createMockSupabase('recommendation');
    
    const results = await TagBasedMatchingService.getRecommendedEventsByTags(
      parityInput.careerProfile.userId,
      // @ts-ignore - casting strict fixture types to app types
      parityInput.careerProfile,
      mockSupabase,
      10,
      parityInput.userLocation
    );

    expect((mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([table]) => table === 'events').length).toBeGreaterThanOrEqual(4);
    expect((mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mock.calls.some(([table]) => table === 'event_agenda')).toBe(true);

    // Snapshot the entire result: scores, order, explanations, boosts
    expect(results).toMatchSnapshot();
  });

  it('generates identical discovery-only results', async () => {
    const mockSupabase = createMockSupabase('discovery');
    
    // @ts-ignore - accessing private method for verification
    const results = await TagBasedMatchingService.getDiscoveryEventsOnly(
      // @ts-ignore
      parityInput.careerProfile,
      mockSupabase,
      10,
      parityInput.userLocation
    );

    expect((mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([table]) => table === 'events').length).toBeGreaterThanOrEqual(3);
    expect((mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mock.calls.some(([table]) => table === 'event_agenda')).toBe(true);
    expect(results).toMatchSnapshot();
  });
});
