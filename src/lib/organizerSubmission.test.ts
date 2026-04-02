import { describe, expect, it } from 'vitest';
import { buildSubmissionFingerprint, parseOrganizerSubmission } from './organizerSubmission';

describe('organizerSubmission', () => {
    it('rejects required fields that become empty after HTML stripping', () => {
        expect(() =>
            parseOrganizerSubmission({
                title: '<b></b>',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: '<i></i>',
                location: 'Edmonton',
                event_format: 'In-person',
            })
        ).toThrow('Title is required');
    });

    it('builds md5 submission fingerprints to match the migration backfill format', () => {
        const fingerprint = buildSubmissionFingerprint({
            title: 'Launch Week',
            start_date: '2026-05-01T09:00:00.000Z',
            organizer_name: 'Tech Cal',
            source_url: 'https://example.com/event',
            registration_url: 'https://example.com/register',
            event_format: 'Hybrid',
        });

        expect(fingerprint).toBe('1c19a4dc1bc5980a3aee961140336960');
    });
});
