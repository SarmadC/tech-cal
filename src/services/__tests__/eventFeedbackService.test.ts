import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { EventFeedbackService } from '../eventFeedbackService';

function createFeedbackRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'feedback-1',
    event_id: 'event-1',
    user_id: 'user-1',
    actual_value_rating: 4,
    career_benefit: 'Met strong backend candidates',
    connections_made: 2,
    event_attended: true,
    feedback_date: '2026-04-01T12:00:00.000Z',
    feedback_text: 'Useful event',
    predicted_score: 88,
    skills_gained: ['Networking'],
    would_recommend: true,
    ...overrides,
  };
}

function createMockSupabaseClient(responseRow = createFeedbackRow()) {
  const query = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: responseRow, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: responseRow, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(query),
    query,
  };
}

describe('EventFeedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits event feedback without storing linkedin outreach state', async () => {
    const mockSupabase = createMockSupabaseClient();

    const result = await EventFeedbackService.submitFeedback(
      {
        eventId: 'event-1',
        userId: 'user-1',
        actualValueRating: 4,
        connectionsMade: 2,
        predictedScore: 88,
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('event_feedback');
    expect(mockSupabase.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: 'event-1',
        user_id: 'user-1',
        connections_made: 2,
      })
    );
    expect(result.connectionsMade).toBe(2);
  });

  it('updates confirmed connection counts on existing feedback rows', async () => {
    const mockSupabase = createMockSupabaseClient(
      createFeedbackRow({
        connections_made: 3,
      })
    );

    const result = await EventFeedbackService.updateFeedback(
      'feedback-1',
      {
        connectionsMade: 3,
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('event_feedback');
    expect(mockSupabase.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        connections_made: 3,
      })
    );
    expect(mockSupabase.query.eq).toHaveBeenCalledWith('id', 'feedback-1');
    expect(result.connectionsMade).toBe(3);
  });
});
