import { describe, expect, it } from 'vitest';
import {
    coerceAgendaItems,
    coerceSpeakerLineup,
    collectFieldUpdates,
    normalizeApprovalPlanAgendaUpdates,
    sanitizeAgendaFieldValue,
} from '../updateQueueApproval';

describe('updateQueueApproval', () => {
    it('coerces rich agenda items and preserves speaker names separately from ids', () => {
        const result = coerceAgendaItems([
            {
                title: 'Keynote',
                start_time: '09:00',
                end_time: '10:00',
                agenda_type: 'Keynote',
                track: 'Main Stage',
                topics: ['platform', 'scaling'],
                day_number: 2,
                difficulty_level: 'advanced',
                capacity: '250',
                prerequisites: 'Badge required',
                is_required: 'true',
                duration_minutes: 60,
                speakers: ['Jane Doe', 'John Smith'],
            },
        ]);

        expect(result.invalidItems).toEqual([]);
        expect(result.items).toEqual([
            expect.objectContaining({
                title: 'Keynote',
                startTime: '09:00',
                endTime: '10:00',
                type: 'Keynote',
                track: 'Main Stage',
                topics: ['platform', 'scaling'],
                dayNumber: 2,
                difficultyLevel: 'advanced',
                capacity: 250,
                prerequisites: 'Badge required',
                isRequired: true,
                durationMinutes: 60,
                speakerNames: ['Jane Doe', 'John Smith'],
                speakerIds: undefined,
            }),
        ]);
    });

    it('accepts agenda items without end_time', () => {
        const result = coerceAgendaItems([
            {
                title: 'Office Hours',
                start_time: '13:00',
                speakers: ['Jane Doe'],
            },
        ]);

        expect(result.invalidItems).toEqual([]);
        expect(result.items).toEqual([
            expect.objectContaining({
                title: 'Office Hours',
                startTime: '13:00',
                endTime: undefined,
                speakerNames: ['Jane Doe'],
            }),
        ]);
    });

    it('coerces speaker lineup entries with social links', () => {
        const result = coerceSpeakerLineup([
            {
                name: 'Jane Doe',
                linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
                twitterUrl: 'https://x.com/jane',
                websiteUrl: 'https://janedoe.dev',
            },
            {
                title: 'Missing name',
            },
        ]);

        expect(result.items).toEqual([
            {
                name: 'Jane Doe',
                linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
                title: undefined,
                company: undefined,
                bio: undefined,
                photoUrl: undefined,
                twitterUrl: 'https://x.com/jane',
                websiteUrl: 'https://janedoe.dev',
            },
        ]);
        expect(result.invalidItems).toEqual(['speaker 2']);
    });

    it('collects speaker and agenda updates without treating speaker names as ids', () => {
        const plan = collectFieldUpdates([
            {
                id: 'speaker-field',
                field_name: 'speaker_lineup',
                new_value: [
                    {
                        name: 'Jane Doe',
                        linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
                    },
                ],
            },
            {
                id: 'agenda-field',
                field_name: 'agenda',
                new_value: [
                    {
                        title: 'Deep Dive',
                        start_time: '11:00',
                        end_time: '11:45',
                        speakers: ['Jane Doe'],
                        location: 'Room A',
                        track: 'Platform',
                        topics: ['architecture', 'commerce'],
                    },
                ],
            },
        ]);

        expect(plan.speakerUpdates).toEqual([
            expect.objectContaining({
                name: 'Jane Doe',
                linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
            }),
        ]);
        expect(plan.agendaUpdates).toEqual([
            expect.objectContaining({
                title: 'Deep Dive',
                startTime: '11:00',
                endTime: '11:45',
                speakerNames: ['Jane Doe'],
                speakerIds: undefined,
                location: 'Room A',
                track: 'Platform',
                topics: ['architecture', 'commerce'],
            }),
        ]);
        expect(plan.scalarUpdateData).toEqual({});
        expect(plan.fieldsToReject).toEqual([]);
    });

    it('sanitizes mixed agenda payloads without rejecting missing end_time items', () => {
        const plan = collectFieldUpdates([
            {
                id: 'agenda-field',
                field_name: 'agenda',
                new_value: [
                    {
                        title: 'Valid Session',
                        start_time: '11:00',
                        topics: ['architecture'],
                    },
                    {
                        title: 'Missing start',
                    },
                ],
            },
        ]);

        expect(plan.fieldsToApprove.map((field) => field.id)).toEqual(['agenda-field']);
        expect(plan.fieldsToReject).toEqual([]);
        expect(plan.sanitizedFieldUpdates).toEqual([
            {
                id: 'agenda-field',
                newValue: [
                    expect.objectContaining({
                        title: 'Valid Session',
                        start_time: '11:00',
                        end_time: null,
                        topics: ['architecture'],
                    }),
                ],
            },
        ]);
        expect(plan.warnings).toEqual([
            'Skipped invalid agenda items missing title/start: Missing start',
        ]);
    });

    it('normalizes approval agenda updates to ISO timestamps before RPC submission', () => {
        const plan = collectFieldUpdates([
            {
                id: 'agenda-field',
                field_name: 'agenda',
                new_value: [
                    {
                        title: 'GMT Session',
                        start_time: '07:15AM GMT',
                        end_time: '08:00AM GMT',
                        topics: ['systems', 'commerce'],
                    },
                ],
            },
        ]);

        const normalizedPlan = normalizeApprovalPlanAgendaUpdates(plan, {
            eventStartTime: '2026-03-10T15:00:00.000Z',
            eventTimezone: 'America/New_York',
        });

        expect(normalizedPlan.agendaUpdates).toEqual([
            expect.objectContaining({
                title: 'GMT Session',
                startTime: '2026-03-10T07:15:00.000Z',
                endTime: '2026-03-10T08:00:00.000Z',
                topics: ['systems', 'commerce'],
                durationMinutes: 45,
            }),
        ]);
        expect(normalizedPlan.sanitizedFieldUpdates).toEqual([
            {
                id: 'agenda-field',
                newValue: [
                    expect.objectContaining({
                        title: 'GMT Session',
                        start_time: '2026-03-10T07:15:00.000Z',
                        end_time: '2026-03-10T08:00:00.000Z',
                        topics: ['systems', 'commerce'],
                        duration_minutes: 45,
                    }),
                ],
            },
        ]);
    });

    it('rejects malformed agenda edits instead of saving unsupported time strings', () => {
        expect(() =>
            sanitizeAgendaFieldValue(
                [
                    {
                        title: 'Broken Session',
                        start_time: 'sometime after lunch',
                    },
                ],
                {
                    eventStartTime: '2026-03-10T15:00:00.000Z',
                    eventTimezone: 'America/New_York',
                }
            )
        ).toThrow('Agenda items have invalid times');
    });

    it('sanitizes valid agenda edits into normalized JSON payloads', () => {
        const sanitized = sanitizeAgendaFieldValue(
            [
                {
                    title: 'GMT Session',
                    start_time: '07:15AM GMT',
                    end_time: '08:00AM GMT',
                },
            ],
            {
                eventStartTime: '2026-03-10T15:00:00.000Z',
                eventTimezone: 'America/New_York',
            }
        );

        expect(sanitized.sanitizedValue).toEqual([
            expect.objectContaining({
                title: 'GMT Session',
                start_time: '2026-03-10T07:15:00.000Z',
                end_time: '2026-03-10T08:00:00.000Z',
                duration_minutes: 45,
            }),
        ]);
    });
});
