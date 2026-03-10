import { describe, expect, it } from 'vitest';
import {
    coerceAgendaItems,
    coerceSpeakerLineup,
    collectFieldUpdates,
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
            }),
        ]);
        expect(plan.scalarUpdateData).toEqual({});
        expect(plan.fieldsToReject).toEqual([]);
    });
});
