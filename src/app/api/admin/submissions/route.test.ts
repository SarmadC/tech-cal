import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
    authGetUser: vi.fn(),
    createServiceClient: vi.fn(),
    isAdminUser: vi.fn(),
    listQueryResult: vi.fn(),
    fetchSubmission: vi.fn(),
    eventInsert: vi.fn(),
    updateSingle: vi.fn(),
    updateThen: vi.fn(),
    rpc: vi.fn(),
    eventSelectResults: [] as Array<{ data: Array<{ id: string; title: string; start_time: string | null }>; error: null }>,
}));

function createListQueryBuilder() {
    return {
        select: vi.fn(() => createListQueryBuilder()),
        order: vi.fn(() => createListQueryBuilder()),
        range: vi.fn(() => createListQueryBuilder()),
        eq: vi.fn(() => createListQueryBuilder()),
        single: vi.fn(() => mocks.fetchSubmission()),
        then: (...args: Parameters<PromiseLike<unknown>['then']>) =>
            Promise.resolve(mocks.listQueryResult()).then(...args),
    };
}

function createUpdateBuilder() {
    const builder = {
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        select: vi.fn(() => builder),
        single: vi.fn(() => mocks.updateSingle()),
        then: (...args: Parameters<PromiseLike<unknown>['then']>) =>
            Promise.resolve(mocks.updateThen()).then(...args),
    };

    return builder;
}

function createEventSelectBuilder() {
    const builder = {
        eq: vi.fn(() => builder),
        limit: vi.fn(() => Promise.resolve(mocks.eventSelectResults.shift() ?? { data: [], error: null })),
    };

    return builder;
}

const serviceClient = {
    rpc: (...args: unknown[]) => mocks.rpc(...args),
    from: vi.fn((table: string) => {
        if (table === 'events') {
            return {
                select: vi.fn(() => createEventSelectBuilder()),
                insert: (...args: unknown[]) => mocks.eventInsert(...args),
            };
        }

        if (table === 'user_submitted_events') {
            return {
                select: vi.fn(() => createListQueryBuilder()),
                update: vi.fn(() => createUpdateBuilder()),
            };
        }

        throw new Error(`Unexpected table ${table}`);
    }),
};

const userScopedSupabase = {
    auth: {
        getUser: (...args: unknown[]) => mocks.authGetUser(...args),
    },
};

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(async () => userScopedSupabase),
}));

vi.mock('@/utils/supabase/service', () => ({
    createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/lib/adminAuth', () => ({
    isAdminUser: (...args: unknown[]) => mocks.isAdminUser(...args),
}));

describe('/api/admin/submissions', () => {
    const submittedPayload = {
        title: 'Launch Week',
        description: 'Product demos',
        event_type: 'conference',
        organizer_name: 'Tech Cal',
        organizer_details: {
            description: 'Community organizer',
            website_url: 'https://techcal.dev',
            logo_url: 'https://techcal.dev/logo.png',
        },
        start_date: '2026-05-01T09:00:00.000Z',
        end_date: '2026-05-01T17:00:00.000Z',
        timezone: 'America/Edmonton',
        event_format: 'Hybrid',
        location: 'Edmonton',
        location_city: 'Edmonton',
        location_state: 'Alberta',
        location_country: 'Canada',
        virtual_platform: 'Zoom',
        event_pattern: 'multi_day',
        is_multi_day: true,
        language: 'en',
        difficulty_level: 'advanced',
        capacity: 250,
        attendee_count: 175,
        certificate_offered: true,
        recording_available: true,
        social_media_hashtag: '#LaunchWeek',
        target_audience: 'Engineers',
        prerequisites: 'Bring laptop',
        accessibility_features: {
            captioning: true,
            sign_language: false,
            translator: true,
        },
        source_url: 'https://example.com/event',
        registration_url: 'https://example.com/register',
        livestream_url: 'https://example.com/live',
        event_image_url: 'https://example.com/banner.png',
        agenda_url: 'https://example.com/agenda',
        pricing_type: 'Paid',
        price_min: 49,
        price_max: 199.5,
        currency: 'CAD',
        registration_deadline: '2026-04-25T23:59:00.000Z',
        speaker_lineup: [{ name: 'Jane Doe' }],
        tags: ['react', 'typescript'],
        series_details: {
            name: 'Launch Series',
            description: 'Product launches',
            website_url: 'https://example.com/series',
        },
    };

    const pendingSubmission = {
        id: 'submission-1',
        title: 'Launch Week',
        description: 'Product demos',
        event_type: 'conference',
        start_date: '2026-05-01T09:00:00.000Z',
        end_date: '2026-05-01T17:00:00.000Z',
        location: 'Edmonton',
        is_virtual: false,
        event_format: 'Hybrid',
        source_url: 'https://example.com/event',
        registration_url: 'https://example.com/register',
        registration_mode: 'external',
        organizer_name: 'Tech Cal',
        tags: ['react', 'typescript'],
        risk_flags: ['repeat_submission'],
        validation_summary: {
            warnings: ['Similar submission fingerprint has already been seen.'],
        },
        submitted_payload: submittedPayload,
        approved_payload: null,
        status: 'pending',
        admin_notes: null,
        reviewed_at: null,
        event_id: null,
        created_at: '2026-04-01T00:00:00.000Z',
        submitter: {
            id: 'user-1',
            email: 'organizer@example.com',
            raw_user_meta_data: {
                full_name: 'Kure Organizer',
            },
        },
        submission_fingerprint: 'abc123',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.eventSelectResults = [];
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

        mocks.authGetUser.mockResolvedValue({
            data: { user: { id: 'admin-1' } },
            error: null,
        });
        mocks.isAdminUser.mockResolvedValue(true);
        mocks.createServiceClient.mockReturnValue(serviceClient);
        mocks.listQueryResult.mockResolvedValue({
            data: [pendingSubmission],
            error: null,
            count: 1,
        });
        mocks.fetchSubmission.mockResolvedValue({
            data: pendingSubmission,
            error: null,
        });
        mocks.eventInsert.mockImplementation((payload: unknown) => ({
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'event-1', payload },
                    error: null,
                }),
            })),
        }));
        mocks.rpc.mockResolvedValue({ data: 'event-1', error: null });
        mocks.updateThen.mockResolvedValue({ data: null, error: null });
        mocks.updateSingle.mockResolvedValue({
            data: { id: 'submission-1' },
            error: null,
        });
    });

    it('lists submissions for admins with risk metadata', async () => {
        const response = await GET({
            nextUrl: new URL('http://localhost/api/admin/submissions?status=pending&page=1&pageSize=20'),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.submissions).toEqual([pendingSubmission]);
        expect(payload.total).toBe(1);
    });

    it('approves a pending submission from submitted_payload using curated promotion', async () => {
        mocks.eventSelectResults = [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
        ];

        const response = await PATCH({
            json: async () => ({
                id: 'submission-1',
                action: 'approve',
                admin_notes: 'Looks good',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.event_id).toBe('event-1');
        expect(mocks.rpc).toHaveBeenCalledWith('approve_user_submitted_event', expect.objectContaining({
            p_submission_id: 'submission-1',
            p_reviewed_by: 'admin-1',
            p_admin_notes: 'Looks good',
            p_approved_payload: expect.objectContaining({
                title: 'Launch Week',
                description: 'Product demos',
                start_time: '2026-05-01T09:00:00.000Z',
                end_time: '2026-05-01T17:00:00.000Z',
                location: 'Edmonton',
                location_city: 'Edmonton',
                location_state: 'Alberta',
                location_country: 'Canada',
                timezone: 'America/Edmonton',
                event_format: 'Hybrid',
                event_pattern: 'multi_day',
                is_multi_day: true,
                language: 'en',
                difficulty_level: 'advanced',
                capacity: 250,
                attendee_count: 175,
                certificate_offered: true,
                recording_available: true,
                social_media_hashtag: '#LaunchWeek',
                virtual_platform: 'Zoom',
                target_audience: 'Engineers',
                prerequisites: 'Bring laptop',
                source_url: 'https://example.com/event',
                registration_url: 'https://example.com/register',
                livestream_url: 'https://example.com/live',
                event_image_url: 'https://example.com/banner.png',
                agenda_url: 'https://example.com/agenda',
                registration_mode: 'external',
                pricing_type: 'Paid',
                price_min: 49,
                price_max: 199.5,
                currency: 'CAD',
                registration_deadline: '2026-04-25T23:59:00.000Z',
                accessibility_features: {
                    captioning: true,
                    sign_language: false,
                    translator: true,
                },
                speaker_lineup: [{ name: 'Jane Doe' }],
            }),
            p_enrichment_metadata: expect.objectContaining({
                organizer: {
                    description: 'Community organizer',
                    website_url: 'https://techcal.dev/',
                    logo_url: 'https://techcal.dev/logo.png',
                },
                series: {
                    name: 'Launch Series',
                    description: 'Product launches',
                    website_url: 'https://example.com/series',
                },
                submitted_tags: ['react', 'typescript'],
            }),
        }));
    });

    it('falls back to legacy staged fields when submitted_payload is missing', async () => {
        mocks.fetchSubmission.mockResolvedValueOnce({
            data: {
                ...pendingSubmission,
                submitted_payload: null,
                source_url: null,
                registration_url: null,
                registration_mode: null,
                event_format: null,
            },
            error: null,
        });
        mocks.eventSelectResults = [{ data: [], error: null }];

        const response = await PATCH({
            json: async () => ({
                id: 'submission-1',
                action: 'approve',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        expect(response.status).toBe(200);
        expect(mocks.rpc).toHaveBeenCalledWith('approve_user_submitted_event', expect.objectContaining({
            p_approved_payload: expect.objectContaining({
                registration_mode: 'native',
                event_format: 'In-person',
            })
        }));
    });

    it('blocks approval when duplicate events are found', async () => {
        mocks.eventSelectResults = [
            {
                data: [{ id: 'event-dup', title: 'Launch Week', start_time: '2026-05-01T09:00:00.000Z' }],
                error: null,
            },
            { data: [], error: null },
            { data: [], error: null },
        ];

        const response = await PATCH({
            json: async () => ({
                id: 'submission-1',
                action: 'approve',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe('Possible duplicate event found. Review the submission warnings before approving.');
        expect(mocks.rpc).not.toHaveBeenCalled();
        expect(mocks.updateThen).toHaveBeenCalled();
    });

    it('returns 409 when the orphaned-event race occurs during RPC execution (rpc returns null)', async () => {
        mocks.eventSelectResults = [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
        ];
        mocks.rpc.mockResolvedValueOnce({ data: null, error: null });

        const response = await PATCH({
            json: async () => ({
                id: 'submission-1',
                action: 'approve',
            }),
        } as any);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe('Submission has already been reviewed');
    });

    it('returns 409 when trying to approve an already reviewed submission', async () => {
        mocks.fetchSubmission.mockResolvedValueOnce({
            data: {
                ...pendingSubmission,
                status: 'approved',
                reviewed_at: '2026-03-20T00:00:00.000Z',
                event_id: 'event-1',
            },
            error: null,
        });

        const response = await PATCH({
            json: async () => ({
                id: 'submission-1',
                action: 'approve',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe('Submission has already been reviewed');
        expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it('returns 409 when the pending-state update no longer matches', async () => {
        mocks.eventSelectResults = [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
        ];
        mocks.updateSingle.mockResolvedValueOnce({
            data: null,
            error: { message: 'No rows updated' },
        });

        const response = await PATCH({
            json: async () => ({
                id: 'submission-1',
                action: 'decline',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe('Submission has already been reviewed');
    });
});
