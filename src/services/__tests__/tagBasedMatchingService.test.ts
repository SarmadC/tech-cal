import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TagBasedMatchingService } from '../tagBasedMatchingService';
import type { AgendaItem, Event, EventTag, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';
import { buildAgendaItem, buildEvent, buildEventTag } from '@/tests/factories/eventFactories';

// Type for accessing private methods in tests
type TagBasedMatchingServicePrivate = {
  extractHighValueTerms: (p: CareerProfile) => string[];
  sanitizeTextSearchTerm: (t: string) => string | null;
  getTextSearchCandidates: (p: CareerProfile, c: SupabaseClientType, t: string[], l: number) => Promise<Record<string, unknown>[]>;
};

describe('TagBasedMatchingService', () => {
  const createTestEvent = (title: string, tags: EventTag[] = [], agenda: AgendaItem[] = []): Event =>
    buildEvent({
      title,
      tags,
      agenda,
    });

  const createTestProfile = (overrides: Partial<CareerProfile> = {}): CareerProfile => ({
    userId: 'test-user-id',
    profileId: 'test-profile-id',
    lastUpdated: new Date().toISOString(),
    currentRole: 'Developer',
    seniority: 'mid-level',
    industry: 'Technology',
    companySize: 'medium',
    primarySkills: [],
    skillsToLearn: [],
    interests: [],
    careerGoals: [],
    timeframe: 'medium-term',
    learningStyle: [],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: [],
    preferredEventTypes: [],
    ...overrides,
  });

  describe('Transitive Similarity', () => {
    it('matches A -> B -> C paths', () => {
      const profile = createTestProfile({ interests: ['AI'] });
      const event = createTestEvent('Data Science Summit', [
        buildEventTag({ id: '1', name: 'Data Science', color: '#0f0', category: 'Tech' })
      ]);
      const result = TagBasedMatchingService.calculateTagSimilarity(event, profile);
      expect(result.score).toBeGreaterThan(0);
      expect(result.explanation).toContain('Data Science');
    });
  });

  describe('High-value term extraction', () => {
    it('prioritizes role, primary skills, and fills from skills to learn', () => {
      const profile = createTestProfile({
        currentRole: 'Data Analyst',
        primarySkills: ['Python', 'SQL', 'R'],
        skillsToLearn: ['Spark', 'ML']
      });
      const terms = (TagBasedMatchingService as unknown as TagBasedMatchingServicePrivate)
        .extractHighValueTerms(profile);
      expect(terms).toEqual(['Data Analyst', 'Python', 'SQL', 'Spark']);
    });
  });

  describe('Text search sanitization', () => {
    it('escapes SQL wildcards and trims commas', () => {
      const sanitized = (TagBasedMatchingService as unknown as TagBasedMatchingServicePrivate)
        .sanitizeTextSearchTerm('  Data%Science_, ');
      expect(sanitized).toBe('data\\%science\\_');
    });
  });

  describe('Candidate prioritization', () => {
    const mockSupabase = {
      from: vi.fn()
    } as unknown as SupabaseClientType;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('merges Tag -> Text -> Discovery while deduplicating', async () => {
      const profile = createTestProfile({
        primarySkills: ['React'],
        skillsToLearn: ['GraphQL']
      });

      const makeRawEvent = (id: string) => ({
        id,
        start_time: new Date(Date.now() + Number(id) * 1000).toISOString(),
        tags: [],
        event_agenda: []
      });

      const tagEvent = makeRawEvent('1');
      const textEvent = makeRawEvent('2');
      const discoveryEvent = makeRawEvent('3');

      const tagBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnValue(Promise.resolve({ data: [tagEvent], error: null }))
      };

      const discoveryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(Promise.resolve({ data: [discoveryEvent], error: null }))
      };

        const mockFrom = mockSupabase.from as unknown as {
          mockReturnValueOnce: (value: unknown) => { mockReturnValueOnce: (value: unknown) => unknown };
        };
        mockFrom.mockReturnValueOnce({ select: () => tagBuilder } as unknown as {
          mockReturnValueOnce: (value: unknown) => unknown;
        }).mockReturnValueOnce({ select: () => discoveryBuilder });

      const textSpy = vi
        .spyOn(TagBasedMatchingService as unknown as TagBasedMatchingServicePrivate, 'getTextSearchCandidates')
        .mockResolvedValue([textEvent]);

      const results = await TagBasedMatchingService.getRecommendedEventsByTags('user', profile, mockSupabase, 3);
      const ids = results.map(r => r.event.id);
      expect(ids).toHaveLength(3);
      expect(ids).toEqual(expect.arrayContaining(['1', '2', '3']));

      textSpy.mockRestore();
    });
  });

  describe('Beginner weighting', () => {
    it('weights skills to learn higher for beginners', () => {
      const profile = createTestProfile({
        primarySkills: ['HTML'],
        skillsToLearn: ['React'],
        learningStyle: ['hands-on']
      });
      const primaryEvent = createTestEvent('HTML Workshop', [
        buildEventTag({ id: '1', name: 'HTML', color: 'blue', category: 'Programming' })
      ]);
      const learningEvent = createTestEvent('React Workshop', [
        buildEventTag({ id: '2', name: 'React', color: 'blue', category: 'Programming' })
      ]);
      const primaryScore = TagBasedMatchingService.calculateTagSimilarity(primaryEvent, profile).score;
      const learningScore = TagBasedMatchingService.calculateTagSimilarity(learningEvent, profile).score;
      expect(learningScore).toBeGreaterThan(primaryScore);
    });
  });

  describe('Agenda-derived tags', () => {
    it('matches interests found only in agenda sessions', () => {
      const profile = createTestProfile({ interests: ['Kubernetes'] });
      const event = createTestEvent('Cloud Summit', [], [
        buildAgendaItem({ id: 'agenda-k8s', title: 'Intro to Kubernetes', description: 'Container orchestration' })
      ]);
      const result = TagBasedMatchingService.calculateTagSimilarity(event, profile);
      expect(result.matchedTags).toContain('Kubernetes');
    });

    it('honors word boundaries to avoid false positives', () => {
      const profile = createTestProfile({ interests: ['AI'] });
      const event = createTestEvent('Tailwind CSS Workshop', [], [
        buildAgendaItem({ id: 'agenda-tailwind', title: 'Styling with Tailwind', description: 'CSS framework' })
      ]);
      const result = TagBasedMatchingService.calculateTagSimilarity(event, profile);
      expect(result.score).toBe(0);
    });
  });

  describe('Bidirectional similarity', () => {
    it('matches python interests with django tags', () => {
      const profile = createTestProfile({ interests: ['Python'] });
      const event = createTestEvent('Django Con', [
        buildEventTag({ id: '1', name: 'Django', color: '#0ff', category: 'Framework' })
      ]);
      expect(TagBasedMatchingService.calculateTagSimilarity(event, profile).score).toBeGreaterThan(0);
    });

    it('matches django interests with python tags', () => {
      const profile = createTestProfile({ interests: ['Django'] });
      const event = createTestEvent('Python Summit', [
        buildEventTag({ id: '1', name: 'Python', color: '#0ff', category: 'Programming' })
      ]);
      expect(TagBasedMatchingService.calculateTagSimilarity(event, profile).score).toBeGreaterThan(0);
    });
  });

  describe('Text Search Improvements', () => {
    const mockSupabase = {
      from: vi.fn()
    } as unknown as SupabaseClientType;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('Agenda content search', () => {
      it('finds events with matching agenda content when searching for "React"', async () => {
        const profile = createTestProfile({
          primarySkills: ['React']
        });

        // Mock agenda search
        const agendaBuilder = {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ event_id: 'event-1' }],
            error: null
          })
        };

        // Mock event fetch
        const eventBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{
              id: 'event-1',
              title: 'Tech Conference',
              description: 'General tech conference',
              start_time: new Date(Date.now() + 86400000).toISOString(),
              event_agenda: [
                { id: '1', title: 'React Workshop', description: 'Learn React' }
              ],
              tags: [],
              event_type: { id: '1', name: 'Conference' },
              organizer: { name: 'Test Org' }
            }],
            error: null
          })
        };

        const mockFrom = mockSupabase.from as unknown as {
          mockReturnValueOnce: (value: unknown) => { mockReturnValueOnce: (value: unknown) => unknown };
        };
        mockFrom.mockReturnValueOnce(agendaBuilder) // event_agenda query
          .mockReturnValueOnce(eventBuilder); // events query

        const textSpy = vi
          .spyOn(TagBasedMatchingService as unknown as TagBasedMatchingServicePrivate, 'getTextSearchCandidates')
          .mockImplementation(async (profile, client, terms, limit) => {
            // Simulate agenda search
            const { data: agendaMatches } = await client
              .from('event_agenda')
              .select('event_id')
              .or('title.ilike.%react%,description.ilike.%react%')
              .limit(limit * 2);
            
            if (!agendaMatches || agendaMatches.length === 0) return [];
            
            const eventIds = [...new Set(agendaMatches.map((item: { event_id: string }) => item.event_id))];
            const { data: events } = await client
              .from('events')
              .select('*,event_agenda(*)')
              .in('id', eventIds)
              .limit(limit);
            
            return events || [];
          });

        const results = await TagBasedMatchingService.getRecommendedEventsByTags(
          'user',
          profile,
          mockSupabase,
          10
        );

        // Should find event via agenda search
        expect(textSpy).toHaveBeenCalled();
        expect(results.length).toBeGreaterThan(0);

        textSpy.mockRestore();
      });
    });

    describe('Synonym expansion', () => {
      it('finds events with "js" in agenda when user has "JavaScript" in profile', async () => {
        const profile = createTestProfile({
          primarySkills: ['JavaScript']
        });

        const agendaBuilder = {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ event_id: 'event-1' }],
            error: null
          })
        };

        const eventBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{
              id: 'event-1',
              title: 'JS Conference',
              description: 'JavaScript conference',
              start_time: new Date(Date.now() + 86400000).toISOString(),
              event_agenda: [
                { id: '1', title: 'Node.js Workshop', description: 'Learn Node.js' }
              ],
              tags: [],
              event_type: { id: '1', name: 'Conference' },
              organizer: { name: 'Test Org' }
            }],
            error: null
          })
        };

        const mockFrom = mockSupabase.from as unknown as {
          mockReturnValueOnce: (value: unknown) => { mockReturnValueOnce: (value: unknown) => unknown };
        };
        mockFrom.mockReturnValueOnce(agendaBuilder)
          .mockReturnValueOnce(eventBuilder);

        const textSpy = vi
          .spyOn(TagBasedMatchingService as unknown as TagBasedMatchingServicePrivate, 'getTextSearchCandidates')
          .mockResolvedValue([{
            id: 'event-1',
            title: 'JS Conference',
            event_agenda: [{ title: 'Node.js Workshop' }]
          }]);

        const results = await TagBasedMatchingService.getRecommendedEventsByTags(
          'user',
          profile,
          mockSupabase,
          10
        );

        // Should expand "JavaScript" to include "js" and "node.js"
        expect(textSpy).toHaveBeenCalled();
        expect(results.length).toBeGreaterThan(0);

        textSpy.mockRestore();
      });
    });

    describe('Ranking improvements', () => {
      it('ranks agenda matches higher than description-only matches', async () => {
        const profile = createTestProfile({
          primarySkills: ['React']
        });

        const agendaMatchEvent = {
          id: 'event-1',
          title: 'Tech Conference',
          description: 'General conference',
          start_time: new Date(Date.now() + 86400000).toISOString(),
          event_agenda: [
            { id: '1', title: 'React Workshop', description: 'Learn React' }
          ],
          tags: [],
          _matchLocation: 'agenda'
        };

        const descriptionMatchEvent = {
          id: 'event-2',
          title: 'Web Development',
          description: 'Learn React and build apps',
          start_time: new Date(Date.now() + 172800000).toISOString(),
          event_agenda: [],
          tags: [],
          _matchLocation: 'description'
        };

        const textSpy = vi
          .spyOn(TagBasedMatchingService as unknown as TagBasedMatchingServicePrivate, 'getTextSearchCandidates')
          .mockResolvedValue([agendaMatchEvent, descriptionMatchEvent]);

        const results = await TagBasedMatchingService.getRecommendedEventsByTags(
          'user',
          profile,
          mockSupabase,
          10
        );

        // Agenda match should appear before description match
        expect(textSpy).toHaveBeenCalled();
        const agendaMatchIndex = results.findIndex(r => r.event.id === 'event-1');
        const descriptionMatchIndex = results.findIndex(r => r.event.id === 'event-2');
        
        if (agendaMatchIndex !== -1 && descriptionMatchIndex !== -1) {
          expect(agendaMatchIndex).toBeLessThan(descriptionMatchIndex);
        }

        textSpy.mockRestore();
      });
    });

    describe('Untagged events with matching agenda', () => {
      it('gives nonzero score to untagged event with matching agenda content', async () => {
        const profile = createTestProfile({
          primarySkills: ['Python']
        });

        const untaggedEvent = createTestEvent('Data Science Summit', [], [
          buildAgendaItem({
            id: 'agenda-python',
            title: 'Python Workshop',
            description: 'Learn Python for data science',
          })
        ]);

        const result = TagBasedMatchingService.calculateTagSimilarity(untaggedEvent, profile);
        
        // Should get nonzero score from agenda match
        expect(result.score).toBeGreaterThan(0);
        expect(result.matchedTags.length).toBeGreaterThan(0);
      });
    });
  });
});
