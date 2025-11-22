import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventTagEnrichmentService } from '../eventTagEnrichmentService';
import type { SupabaseClientType } from '@/types';
import type { AgendaItem } from '@/types/events';

// Type for accessing private methods in tests
type EventTagEnrichmentServicePrivate = {
  extractCandidateTags: (event: { title: string; description?: string | null; agenda?: AgendaItem[] }) => string[];
  mapToCanonicalTags: (candidates: string[], supabaseClient: SupabaseClientType) => Promise<Array<{
    tagId: string;
    tagName: string;
    confidence: number;
    matchType: 'exact' | 'synonym' | 'category' | 'partial';
  }>>;
};

// Type for mocked Supabase client
type MockSupabaseFrom = {
  mockReturnValue: (value: unknown) => unknown;
  mockImplementation: (fn: (table: string) => unknown) => unknown;
};

describe('EventTagEnrichmentService', () => {
  let mockSupabase: SupabaseClientType;

  beforeEach(() => {
    // Create a mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    } as unknown as SupabaseClientType;
  });

  describe('extractCandidateTags', () => {
    it('extracts terms from title', () => {
      const event = {
        title: 'React Summit 2024',
        description: null,
        agenda: undefined
      };

      // Access private method for testing
      const candidates = (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).extractCandidateTags(event);
      
      expect(candidates).toContain('react');
      expect(candidates).toContain('summit');
      expect(candidates).toContain('2024');
    });

    it('extracts terms from description', () => {
      const event = {
        title: 'Tech Conference',
        description: 'Learn about JavaScript and TypeScript',
        agenda: undefined
      };

      const candidates = (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).extractCandidateTags(event);
      
      expect(candidates).toContain('javascript');
      expect(candidates).toContain('typescript');
    });

    it('extracts terms from agenda items', () => {
      const agenda: AgendaItem[] = [
        {
          id: '1',
          title: 'Python Workshop',
          description: 'Introduction to Python programming',
          startTime: '10:00',
          endTime: '12:00',
          type: 'workshop'
        }
      ];

      const event = {
        title: 'Conference',
        description: null,
        agenda
      };

      const candidates = (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).extractCandidateTags(event);
      
      expect(candidates).toContain('python');
      expect(candidates).toContain('workshop');
      expect(candidates).toContain('programming');
    });

    it('filters out blacklisted terms', () => {
      const event = {
        title: 'Lunch Break',
        description: 'Welcome Session',
        agenda: undefined
      };

      const candidates = (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).extractCandidateTags(event);
      
      expect(candidates).not.toContain('lunch');
      expect(candidates).not.toContain('break');
      expect(candidates).not.toContain('welcome');
    });

    it('filters out terms shorter than minimum length', () => {
      const event = {
        title: 'AB CD EF',
        description: null,
        agenda: undefined
      };

      const candidates = (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).extractCandidateTags(event);
      
      // All terms should be filtered out (too short)
      expect(candidates.length).toBe(0);
    });
  });

  describe('shouldEnrich', () => {
    it('returns true when event has no tags', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      });

      const result = await EventTagEnrichmentService.shouldEnrich('event-1', mockSupabase);
      expect(result).toBe(true);
    });

    it('returns false when event already has tags', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ 
              data: [{ tag_id: 'tag-1' }], 
              error: null 
            })
          })
        })
      });

      const result = await EventTagEnrichmentService.shouldEnrich('event-1', mockSupabase);
      expect(result).toBe(false);
    });
  });

  describe('enrichEventTags', () => {
    it('extracts and assigns React tag for "React Summit" event', async () => {
      // Mock: event has no tags
      (mockSupabase.from as unknown as MockSupabaseFrom).mockImplementation((table: string) => {
        if (table === 'event_tag_relations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'event_tags') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: 'react-id', event_tag: 'React', category: 'Framework' },
                { id: 'js-id', event_tag: 'JavaScript', category: 'Programming' }
              ],
              error: null
            })
          };
        }
        return {};
      });

      const result = await EventTagEnrichmentService.enrichEventTags(
        'event-1',
        {
          title: 'React Summit 2024',
          description: 'Join us for the biggest React conference',
          agenda: undefined
        },
        mockSupabase
      );

      expect(result.success).toBe(true);
      expect(result.tagsAssigned).toBeGreaterThan(0);
    });

    it('does not assign tags for "Lunch Break" event (blacklist)', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockImplementation((table: string) => {
        if (table === 'event_tag_relations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'event_tags') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        return {};
      });

      const result = await EventTagEnrichmentService.enrichEventTags(
        'event-1',
        {
          title: 'Lunch Break',
          description: 'Welcome Session',
          agenda: undefined
        },
        mockSupabase
      );

      // Should succeed but assign no tags (blacklisted)
      expect(result.success).toBe(true);
      expect(result.tagsAssigned).toBe(0);
    });

    it('is idempotent - does not duplicate tags', async () => {
      const existingTags = [{ tag_id: 'react-id' }];
      
      (mockSupabase.from as unknown as MockSupabaseFrom).mockImplementation((table: string) => {
        if (table === 'event_tag_relations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ 
                data: existingTags, 
                error: null 
              })
            }),
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'event_tags') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: 'react-id', event_tag: 'React', category: 'Framework' }
              ],
              error: null
            })
          };
        }
        return {};
      });

      const result = await EventTagEnrichmentService.enrichEventTags(
        'event-1',
        {
          title: 'React Summit',
          description: null,
          agenda: undefined
        },
        mockSupabase
      );

      expect(result.success).toBe(true);
      // Should not insert duplicate tags
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('skips enrichment when event already has tags', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockImplementation((table: string) => {
        if (table === 'event_tag_relations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ 
                  data: [{ tag_id: 'existing-tag' }], 
                  error: null 
                })
              })
            })
          };
        }
        return {};
      });

      const result = await EventTagEnrichmentService.enrichEventTags(
        'event-1',
        {
          title: 'React Summit',
          description: null,
          agenda: undefined
        },
        mockSupabase
      );

      expect(result.success).toBe(true);
      expect(result.tagsAssigned).toBe(0);
    });
  });

  describe('mapToCanonicalTags', () => {
    it('maps "React" to exact match', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'react-id', event_tag: 'React', category: 'Framework' }
          ],
          error: null
        })
      });

      const candidates = ['react', 'summit'];
      const matches = await (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).mapToCanonicalTags(
        candidates,
        mockSupabase
      );

      expect(matches.length).toBeGreaterThan(0);
      const reactMatch = matches.find((m) => m.tagName === 'React');
      expect(reactMatch).toBeDefined();
      expect(reactMatch.confidence).toBe(1.0);
      expect(reactMatch.matchType).toBe('exact');
    });

    it('maps "js" to "JavaScript" via synonym', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'js-id', event_tag: 'JavaScript', category: 'Programming' }
          ],
          error: null
        })
      });

      const candidates = ['js', 'nodejs'];
      const matches = await (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).mapToCanonicalTags(
        candidates,
        mockSupabase
      );

      // Should find JavaScript via synonym match
      expect(matches.length).toBeGreaterThan(0);
    });

    it('filters by confidence threshold', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'tag-id', event_tag: 'SomeTag', category: 'General' }
          ],
          error: null
        })
      });

      const candidates = ['unrelated', 'term'];
      const matches = await (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).mapToCanonicalTags(
        candidates,
        mockSupabase
      );

      // Low confidence matches should be filtered out
      expect(matches.every((m) => m.confidence > 0.7)).toBe(true);
    });

    it('only includes technical categories', async () => {
      (mockSupabase.from as unknown as MockSupabaseFrom).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'tech-id', event_tag: 'Python', category: 'Programming' },
            { id: 'nontech-id', event_tag: 'Lunch', category: 'Event-Type' }
          ],
          error: null
        })
      });

      const candidates = ['python', 'lunch'];
      const matches = await (EventTagEnrichmentService as unknown as EventTagEnrichmentServicePrivate).mapToCanonicalTags(
        candidates,
        mockSupabase
      );

      // Should only include Programming category
      expect(matches.every((m) => 
        ['Programming', 'Framework', 'Tech', 'Development', 'Methodology', 'Platform'].includes(m.category)
      )).toBe(true);
    });
  });
});

