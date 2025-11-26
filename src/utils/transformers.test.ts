// src/utils/transformers.test.ts (Final Corrected Version)

import { describe, it, expect } from 'vitest';
import { eventTransformer } from './transformers';
import { SupabaseEventWithDetails } from '@/types';

// This mock now perfectly matches your updated, synchronized types.
const mockDetailedSupabaseEvent: SupabaseEventWithDetails = {
    id: 'evt_12345',
    created_at: '2024-05-01T10:00:00.000Z',
    updated_at: '2024-05-01T11:00:00.000Z',
    title: 'AI Developer Conference',
    description: 'A deep dive into the future of AI.',
    start_time: '2024-10-20T09:00:00.000Z',
    end_time: '2024-10-22T17:00:00.000Z',
    timezone: 'UTC',
    organizer_id: 'org_abc', // Added to match schema
    location: 'San Francisco, CA',
    status: 'confirmed',
    source_url: 'https://example.com/aiconf',
    livestream_url: 'https://youtube.com/aiconf',
    event_type_id: 'type_conf_123',
    agenda_url: null,
    // ----- Joined relations -----
    organizer: { id: 'org_abc', name: 'Tech Events Inc.' },
    event_type: {
        id: 'type_conf_123',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Multi-day technical events.'
    }
};

describe('eventTransformer.toApp', () => {

    it('should correctly transform a complete, detailed Supabase event to an AppEvent', () => {
        const result = eventTransformer.toApp(mockDetailedSupabaseEvent);

        expect(result.id).toBe('evt_12345');
        expect(result.createdAt).toBe('2024-05-01T10:00:00.000Z');
        expect(result.title).toBe('AI Developer Conference');
        expect(result.startTime).toBe('2024-10-20T09:00:00.000Z');
        expect(result.organizer).toBe('Tech Events Inc.');
        expect(result.sourceUrl).toBe('https://example.com/aiconf');
    });

    it('should handle null or missing properties gracefully', () => {
        // This test will now pass because the types allow nulls
        const sparseSupabaseEvent: SupabaseEventWithDetails = {
            ...mockDetailedSupabaseEvent,
            title: null,
            description: null,
            livestream_url: null,
            organizer: null,
        };

        const result = eventTransformer.toApp(sparseSupabaseEvent);

        expect(result.title).toBe('Untitled Event');
        expect(result.description).toBe('');
        expect(result.livestreamUrl).toBeNull();
        expect(result.organizer).toBe('Unknown Organizer');
    });
});