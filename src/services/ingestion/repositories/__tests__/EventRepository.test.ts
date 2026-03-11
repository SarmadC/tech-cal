import { describe, expect, it } from 'vitest';
import { EventRepository } from '../EventRepository';

describe('EventRepository.upsertSpeakers', () => {
    it('upgrades a name-matched speaker with a missing linkedin url', async () => {
        const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

        const supabaseClient = {
            from(table: string) {
                if (table !== 'speakers') {
                    throw new Error(`Unexpected table: ${table}`);
                }

                return {
                    select(columns: string) {
                        if (columns === 'id, linkedin_url') {
                            return {
                                in() {
                                    return Promise.resolve({ data: [], error: null });
                                },
                            };
                        }

                        if (columns === 'id, name, linkedin_url') {
                            return {
                                in() {
                                    return Promise.resolve({
                                        data: [
                                            {
                                                id: 'speaker-1',
                                                name: 'Jane Doe',
                                                linkedin_url: null,
                                            },
                                        ],
                                        error: null,
                                    });
                                },
                            };
                        }

                        throw new Error(`Unexpected select columns: ${columns}`);
                    },
                    update(data: Record<string, unknown>) {
                        return {
                            eq(_field: string, id: string) {
                                updates.push({ id, data });
                                return Promise.resolve({ error: null });
                            },
                        };
                    },
                    insert() {
                        throw new Error('Insert should not be called');
                    },
                };
            },
        };

        const speakerIds = await EventRepository.upsertSpeakers(
            supabaseClient as never,
            [
                {
                    name: 'Jane Doe',
                    linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
                    title: 'Staff Engineer',
                },
            ]
        );

        expect(speakerIds).toEqual(['speaker-1']);
        expect(updates).toEqual([
            {
                id: 'speaker-1',
                data: expect.objectContaining({
                    name: 'Jane Doe',
                    title: 'Staff Engineer',
                    linkedin_url: 'https://www.linkedin.com/in/jane-doe',
                }),
            },
        ]);
    });
});
