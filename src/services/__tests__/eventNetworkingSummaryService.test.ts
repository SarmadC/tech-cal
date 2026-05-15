import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { EventNetworkingSummaryService } from '../eventNetworkingSummaryService';

function createSummaryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'summary-1',
    event_id: 'event-1',
    user_id: 'user-1',
    linkedin_requests_sent: 3,
    last_outreach_logged_at: '2026-04-11T12:00:00.000Z',
    created_at: '2026-04-11T12:00:00.000Z',
    updated_at: '2026-04-11T12:00:00.000Z',
    ...overrides,
  };
}

function createMockSupabaseClient(responseRow = createSummaryRow()) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: responseRow, error: null }),
    order: vi.fn().mockResolvedValue({ data: [responseRow], error: null }),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: responseRow, error: null }),
    delete: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn().mockReturnValue(query),
    query,
  };
}

describe('EventNetworkingSummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts linkedin request counts into the networking summary table', async () => {
    const mockSupabase = createMockSupabaseClient(
      createSummaryRow({ linkedin_requests_sent: 4 })
    );

    const result = await EventNetworkingSummaryService.setLinkedInRequestsSent(
      {
        eventId: 'event-1',
        userId: 'user-1',
        linkedinRequestsSent: 4,
        lastOutreachLoggedAt: '2026-04-12T12:00:00.000Z',
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('event_networking_summary');
    expect(mockSupabase.query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: 'event-1',
        user_id: 'user-1',
        linkedin_requests_sent: 4,
      }),
      expect.objectContaining({
        onConflict: 'user_id,event_id',
      })
    );
    expect(result?.linkedinRequestsSent).toBe(4);
  });

  it('deletes the summary row when linkedin request count is cleared', async () => {
    const mockSupabase = createMockSupabaseClient();

    const result = await EventNetworkingSummaryService.setLinkedInRequestsSent(
      {
        eventId: 'event-1',
        userId: 'user-1',
        linkedinRequestsSent: null,
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.query.delete).toHaveBeenCalled();
    expect(mockSupabase.query.eq).toHaveBeenCalledWith('event_id', 'event-1');
    expect(result).toBeNull();
  });
});
