// Test file for atomic event tracking functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserEventService } from '../userEventService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn()
} as unknown as SupabaseClient;

describe('Atomic Event Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should call RPC function with correct parameters for new tracking', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          is_new_tracking: true,
          message: 'Event tracked successfully'
        },
        error: null
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      await UserEventService.trackEvent('user1', 'event1', 'attending', 'test notes', mockSupabase);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('track_event_and_update_profile', {
        p_user_id: 'user1',
        p_event_id: 'event1',
        p_status: 'attending',
        p_notes: 'test notes'
      });
    });

    it('should call RPC function with null notes when notes are undefined', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          is_new_tracking: true,
          message: 'Event tracked successfully'
        },
        error: null
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      await UserEventService.trackEvent('user1', 'event1', 'attending', undefined, mockSupabase);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('track_event_and_update_profile', {
        p_user_id: 'user1',
        p_event_id: 'event1',
        p_status: 'attending',
        p_notes: undefined
      });
    });

    it('should throw error when RPC returns success: false', async () => {
      const mockRpcResponse = {
        data: {
          success: false,
          message: 'Event already exists'
        },
        error: null
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      await expect(
        UserEventService.trackEvent('user1', 'event1', 'attending', undefined, mockSupabase)
      ).rejects.toThrow('Failed to track event.');
    });

    it('should throw error when RPC call fails', async () => {
      const mockRpcResponse = {
        data: null,
        error: new Error('Database connection failed')
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      await expect(
        UserEventService.trackEvent('user1', 'event1', 'attending', undefined, mockSupabase)
      ).rejects.toThrow('Failed to track event.');
    });
  });

  describe('untrackEvent', () => {
    it('should call RPC function with correct parameters', async () => {
      const mockRpcResponse = {
        data: {
          success: true,
          was_tracked: true,
          message: 'Event untracked successfully'
        },
        error: null
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      const result = await UserEventService.untrackEvent('user1', 'event1', mockSupabase);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('untrack_event_and_update_profile', {
        p_user_id: 'user1',
        p_event_id: 'event1'
      });
      expect(result).toEqual({
        external_calendar_event_id: undefined,
        external_provider: undefined
      });
    });

    it('should throw error when RPC returns success: false', async () => {
      const mockRpcResponse = {
        data: {
          success: false,
          message: 'Event not found'
        },
        error: null
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      await expect(
        UserEventService.untrackEvent('user1', 'event1', mockSupabase)
      ).rejects.toThrow('Failed to untrack event.');
    });

    it('should throw error when RPC call fails', async () => {
      const mockRpcResponse = {
        data: null,
        error: new Error('Database connection failed')
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue(mockRpcResponse);

      await expect(
        UserEventService.untrackEvent('user1', 'event1', mockSupabase)
      ).rejects.toThrow('Failed to untrack event.');
    });
  });
});
