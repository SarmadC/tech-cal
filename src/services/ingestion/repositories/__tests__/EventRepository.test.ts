import { describe, expect, it, vi } from 'vitest';
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

describe('EventRepository.upsertEvent', () => {
    it('updates an existing canonical event resolved through identity keys', async () => {
        const eventIdentitySelect = vi
            .fn()
            .mockResolvedValueOnce({ data: { event_id: 'event-1' }, error: null })
            .mockResolvedValueOnce({ data: { event_id: 'event-1' }, error: null });
        const eventUpdateEq = vi.fn().mockResolvedValue({ error: null });
        const identityDeleteIn = vi.fn().mockResolvedValue({ error: null });
        const identityInsert = vi.fn().mockResolvedValue({ error: null });

        const supabaseClient = {
            from(table: string) {
                if (table === 'event_identity_keys') {
                    return {
                        select() {
                            return {
                                eq() {
                                    return {
                                        eq() {
                                            return {
                                                eq() {
                                                    return {
                                                        limit() {
                                                            return {
                                                                maybeSingle: eventIdentitySelect,
                                                            };
                                                        },
                                                    };
                                                },
                                            };
                                        },
                                    };
                                },
                            };
                        },
                        delete() {
                            return {
                                eq() {
                                    return {
                                        in: identityDeleteIn,
                                    };
                                },
                            };
                        },
                        insert: identityInsert,
                    };
                }

                if (table === 'events') {
                    return {
                        update() {
                            return {
                                eq: eventUpdateEq,
                            };
                        },
                    };
                }

                throw new Error(`Unexpected table: ${table}`);
            },
        };

        const result = await EventRepository.upsertEvent(
            supabaseClient as never,
            {
                slug: 'canonical-event',
                title: 'Canonical Event',
                start_time: '2026-03-26T18:00:00.000Z',
                source_url: 'https://example.com/events/canonical',
            },
            {
                normalizedUrl: 'https://example.com/events/canonical',
            }
        );

        expect(result).toEqual({ eventId: 'event-1', created: false });
        expect(eventUpdateEq).toHaveBeenCalledWith('id', 'event-1');
        expect(identityDeleteIn).toHaveBeenCalledWith('key_type', [
            'source_url',
            'registration_url',
            'external_id',
        ]);
        expect(identityInsert).toHaveBeenCalledWith([
            expect.objectContaining({
                event_id: 'event-1',
                key_type: 'source_url',
                event_year: 2026,
            }),
        ]);
    });

    it('returns the conflicting canonical event when a new insert races on identity keys', async () => {
        const eventIdentitySelect = vi
            .fn()
            .mockResolvedValueOnce({ data: null, error: null })
            .mockResolvedValueOnce({ data: { event_id: 'event-existing' }, error: null });
        const insertedEventDeleteEq = vi.fn().mockResolvedValue({ error: null });

        const supabaseClient = {
            from(table: string) {
                if (table === 'event_identity_keys') {
                    return {
                        select() {
                            return {
                                eq() {
                                    return {
                                        eq() {
                                            return {
                                                eq() {
                                                    return {
                                                        limit() {
                                                            return {
                                                                maybeSingle: eventIdentitySelect,
                                                            };
                                                        },
                                                    };
                                                },
                                            };
                                        },
                                    };
                                },
                            };
                        },
                    };
                }

                if (table === 'events') {
                    return {
                        insert() {
                            return {
                                select() {
                                    return {
                                        single: async () => ({ data: { id: 'event-new' }, error: null }),
                                    };
                                },
                            };
                        },
                        delete() {
                            return {
                                eq: insertedEventDeleteEq,
                            };
                        },
                    };
                }

                throw new Error(`Unexpected table: ${table}`);
            },
        };

        const result = await EventRepository.upsertEvent(
            supabaseClient as never,
            {
                slug: 'canonical-event',
                title: 'Canonical Event',
                start_time: '2026-03-26T18:00:00.000Z',
                registration_url: 'https://tickets.example.com/canonical',
                source_url: null,
            },
            {
                normalizedRegistrationUrl: 'https://tickets.example.com/canonical',
            }
        );

        expect(result).toEqual({ eventId: 'event-existing', created: false });
        expect(insertedEventDeleteEq).toHaveBeenCalledWith('id', 'event-new');
    });
});
