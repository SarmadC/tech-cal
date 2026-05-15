import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { UserNetworkingContactService } from '../userNetworkingContactService';

function createContactRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'contact-1',
    viewer_user_id: 'user-1',
    target_kind: 'speaker',
    target_user_id: null,
    target_speaker_id: 'speaker-1',
    source_event_id: 'event-1',
    linkedin_requested_at: '2026-04-12T12:00:00.000Z',
    confirmed_connected_at: null,
    created_at: '2026-04-12T12:00:00.000Z',
    updated_at: '2026-04-12T12:00:00.000Z',
    ...overrides,
  };
}

function createMockSupabase(responseRow = createContactRow()) {
  const query = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: responseRow, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(query),
    query,
  };
}

describe('UserNetworkingContactService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates one speaker contact row when a request is logged', async () => {
    const mockSupabase = createMockSupabase();
    vi.spyOn(UserNetworkingContactService, 'getContactForTarget').mockResolvedValueOnce(
      null
    );

    const result = await UserNetworkingContactService.applyAction(
      {
        viewerUserId: 'user-1',
        targetKind: 'speaker',
        targetId: 'speaker-1',
        action: 'mark_request_sent',
        sourceEventId: 'event-1',
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.from).toHaveBeenCalledWith('user_networking_contacts');
    expect(mockSupabase.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        viewer_user_id: 'user-1',
        target_kind: 'speaker',
        target_speaker_id: 'speaker-1',
        source_event_id: 'event-1',
      })
    );
    expect(result?.targetSpeakerId).toBe('speaker-1');
    expect(result?.linkedinRequestedAt).not.toBeNull();
  });

  it('updates the existing row instead of duplicating it when a connection is confirmed', async () => {
    const mockSupabase = createMockSupabase(
      createContactRow({
        confirmed_connected_at: '2026-04-13T12:00:00.000Z',
      })
    );
    vi.spyOn(UserNetworkingContactService, 'getContactForTarget').mockResolvedValueOnce({
      id: 'contact-1',
      viewerUserId: 'user-1',
      targetKind: 'speaker',
      targetUserId: null,
      targetSpeakerId: 'speaker-1',
      sourceEventId: 'event-1',
      linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
      confirmedConnectedAt: null,
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-12T12:00:00.000Z',
    });

    const result = await UserNetworkingContactService.applyAction(
      {
        viewerUserId: 'user-1',
        targetKind: 'speaker',
        targetId: 'speaker-1',
        action: 'confirm_connection',
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmed_connected_at: expect.any(String),
      })
    );
    expect(mockSupabase.query.eq).toHaveBeenCalledWith('id', 'contact-1');
    expect(result?.confirmedConnectedAt).toBe('2026-04-13T12:00:00.000Z');
  });

  it('deletes the row when a pending request is cleared before confirmation', async () => {
    const mockSupabase = createMockSupabase();
    vi.spyOn(UserNetworkingContactService, 'getContactForTarget').mockResolvedValueOnce({
      id: 'contact-1',
      viewerUserId: 'user-1',
      targetKind: 'speaker',
      targetUserId: null,
      targetSpeakerId: 'speaker-1',
      sourceEventId: 'event-1',
      linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
      confirmedConnectedAt: null,
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-12T12:00:00.000Z',
    });

    const result = await UserNetworkingContactService.applyAction(
      {
        viewerUserId: 'user-1',
        targetKind: 'speaker',
        targetId: 'speaker-1',
        action: 'clear_request',
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.query.delete).toHaveBeenCalled();
    expect(mockSupabase.query.eq).toHaveBeenCalledWith('id', 'contact-1');
    expect(result).toBeNull();
  });

  it('keeps the row but clears the confirmed timestamp when a connection is undone', async () => {
    const mockSupabase = createMockSupabase(
      createContactRow({
        confirmed_connected_at: null,
      })
    );
    vi.spyOn(UserNetworkingContactService, 'getContactForTarget').mockResolvedValueOnce({
      id: 'contact-1',
      viewerUserId: 'user-1',
      targetKind: 'speaker',
      targetUserId: null,
      targetSpeakerId: 'speaker-1',
      sourceEventId: 'event-1',
      linkedinRequestedAt: '2026-04-12T12:00:00.000Z',
      confirmedConnectedAt: '2026-04-13T12:00:00.000Z',
      createdAt: '2026-04-12T12:00:00.000Z',
      updatedAt: '2026-04-13T12:00:00.000Z',
    });

    const result = await UserNetworkingContactService.applyAction(
      {
        viewerUserId: 'user-1',
        targetKind: 'speaker',
        targetId: 'speaker-1',
        action: 'clear_connection',
      },
      mockSupabase as unknown as SupabaseClient
    );

    expect(mockSupabase.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmed_connected_at: null,
      })
    );
    expect(mockSupabase.query.eq).toHaveBeenCalledWith('id', 'contact-1');
    expect(result?.confirmedConnectedAt).toBeNull();
    expect(result?.linkedinRequestedAt).toBe('2026-04-12T12:00:00.000Z');
  });
});
