import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
    authGetUser: vi.fn(),
    createServiceClient: vi.fn(),
    eventInsert: vi.fn(),
    eventQueryResult: vi.fn(),
    isAdminUser: vi.fn(),
    queryResult: vi.fn(),
    updateSingle: vi.fn(),
    validateUrlForServerFetch: vi.fn(),
}));

function createAwaitableBuilder(
    resultFactory: (...args: unknown[]) => unknown
) {
    const builder = {
        eq: vi.fn(() => builder),
        is: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        order: vi.fn(() => builder),
        range: vi.fn(() => builder),
        select: vi.fn(() => builder),
        single: vi.fn((...args: unknown[]) => resultFactory(...args)),
        then: (...args: Parameters<PromiseLike<unknown>['then']>) =>
            Promise.resolve(resultFactory()).then(...args),
    };

    return builder;
}

const serviceClient = {
    from: vi.fn((table: string) => {
        if (table === 'events') {
            return {
                insert: (...args: unknown[]) => mocks.eventInsert(...args),
                select: vi.fn(() =>
                    createAwaitableBuilder(() => mocks.eventQueryResult())
                ),
            };
        }

        if (table === 'user_submitted_events') {
            return {
                select: vi.fn(() =>
                    createAwaitableBuilder(() => mocks.queryResult())
                ),
                update: vi.fn(() =>
                    createAwaitableBuilder((...args: unknown[]) =>
                        mocks.updateSingle(...args)
                    )
                ),
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

vi.mock('@/lib/ssrfProtection', () => ({
    validateUrlForServerFetch: (...args: unknown[]) =>
        mocks.validateUrlForServerFetch(...args),
}));

describe('/api/admin/submissions', () => {
    const pendingSubmission = {
        event_id: null,
        id: 'submission-1',
        is_virtual: false,
        registration_mode: 'external',
        registration_url: 'https://example.com/register',
        reviewed_at: null,
        risk_flags: [],
        start_date: '2026-05-01T09:00:00.000Z',
        status: 'pending',
        title: 'Launch Week',
        validation_summary: { warnings: [] },
        description: 'Product demos',
        end_date: '2026-05-01T17:00:00.000Z',
        location: 'Edmonton',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

        mocks.authGetUser.mockResolvedValue({
            data: { user: { id: 'admin-1' } },
            error: null,
        });
        mocks.isAdminUser.mockResolvedValue(true);
        mocks.createServiceClient.mockReturnValue(serviceClient);
        mocks.eventInsert.mockImplementation((payload: unknown) => ({
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'event-1', payload },
                    error: null,
                }),
            })),
        }));
        mocks.eventQueryResult.mockResolvedValue({
            data: [],
            error: null,
        });
        mocks.queryResult.mockResolvedValue({
            count: 1,
            data: [pendingSubmission],
            error: null,
        });
        mocks.updateSingle.mockResolvedValue({
            data: { id: 'submission-1' },
            error: null,
        });
        mocks.validateUrlForServerFetch.mockResolvedValue({
            valid: true,
            url: new URL('https://example.com/register'),
        });
    });

    it('lists submissions for admins', async () => {
        const response = await GET({
            nextUrl: new URL(
                'http://localhost/api/admin/submissions?status=pending&page=1&pageSize=20'
            ),
        } as never);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.submissions).toEqual([pendingSubmission]);
        expect(payload.total).toBe(1);
    });

    it('approves a pending submission and preserves registration_url semantics', async () => {
        mocks.queryResult.mockResolvedValueOnce({
            data: pendingSubmission,
            error: null,
        });

        const response = await PATCH({
            json: async () => ({
                action: 'approve',
                admin_notes: 'Looks good',
                id: 'submission-1',
            }),
        } as never);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.event_id).toBe('event-1');
        expect(mocks.validateUrlForServerFetch).toHaveBeenCalledWith(
            'https://example.com/register',
            { allowUnresolvedHostnames: true }
        );
        expect(mocks.eventInsert).toHaveBeenCalledWith({
            title: 'Launch Week',
            description: 'Product demos',
            start_time: '2026-05-01T09:00:00.000Z',
            end_time: '2026-05-01T17:00:00.000Z',
            location: 'Edmonton',
            event_format: 'In-person',
            source_url: null,
            registration_mode: 'external',
            registration_url: 'https://example.com/register',
            status: 'active',
            ingestion_provenance: 'user_submitted',
            enrichment_status: 'pending',
        });
    });

    it('returns 400 when approval hits an unsafe registration URL', async () => {
        mocks.queryResult.mockResolvedValueOnce({
            data: pendingSubmission,
            error: null,
        });
        mocks.validateUrlForServerFetch.mockResolvedValueOnce({
            reason: 'Host is not allowed',
            valid: false,
        });

        const response = await PATCH({
            json: async () => ({
                action: 'approve',
                id: 'submission-1',
            }),
        } as never);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Registration URL must be publicly reachable');
        expect(mocks.eventInsert).not.toHaveBeenCalled();
        expect(mocks.updateSingle).toHaveBeenCalled();
    });

    it('returns 409 when approval finds duplicate events', async () => {
        mocks.queryResult.mockResolvedValueOnce({
            data: pendingSubmission,
            error: null,
        });
        mocks.eventQueryResult.mockResolvedValue({
            data: [
                {
                    id: 'event-2',
                    start_time: '2026-05-01T09:00:00.000Z',
                    title: 'Launch Week',
                },
            ],
            error: null,
        });

        const response = await PATCH({
            json: async () => ({
                action: 'approve',
                id: 'submission-1',
            }),
        } as never);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe(
            'Possible duplicate event found. Review the submission warnings before approving.'
        );
        expect(payload.duplicate_candidates).toHaveLength(1);
        expect(mocks.eventInsert).not.toHaveBeenCalled();
        expect(mocks.updateSingle).toHaveBeenCalled();
    });

    it('returns 409 when trying to approve an already reviewed submission', async () => {
        mocks.queryResult.mockResolvedValueOnce({
            data: {
                ...pendingSubmission,
                event_id: 'event-1',
                reviewed_at: '2026-03-20T00:00:00.000Z',
                status: 'approved',
            },
            error: null,
        });

        const response = await PATCH({
            json: async () => ({
                action: 'approve',
                id: 'submission-1',
            }),
        } as never);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe('Submission has already been reviewed');
        expect(mocks.eventInsert).not.toHaveBeenCalled();
    });

    it('returns 409 when the pending-state update no longer matches', async () => {
        mocks.queryResult.mockResolvedValueOnce({
            data: pendingSubmission,
            error: null,
        });
        mocks.updateSingle.mockResolvedValueOnce({
            data: null,
            error: { message: 'No rows updated' },
        });

        const response = await PATCH({
            json: async () => ({
                action: 'decline',
                id: 'submission-1',
            }),
        } as never);
        const payload = await response.json();

        expect(response.status).toBe(409);
        expect(payload.error).toBe('Submission has already been reviewed');
    });
});
