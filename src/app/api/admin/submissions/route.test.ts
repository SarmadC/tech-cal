import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
    authGetUser: vi.fn(),
    createServiceClient: vi.fn(),
    isAdminUser: vi.fn(),
    queryResult: vi.fn(),
    eventInsert: vi.fn(),
    updateSingle: vi.fn(),
}));

function createSubmissionQueryBuilder() {
    return {
        select: vi.fn(() => createSubmissionQueryBuilder()),
        order: vi.fn(() => createSubmissionQueryBuilder()),
        range: vi.fn(() => createSubmissionQueryBuilder()),
        update: vi.fn(() => createSubmissionQueryBuilder()),
        eq: vi.fn(() => createSubmissionQueryBuilder()),
        is: vi.fn(() => createSubmissionQueryBuilder()),
        single: vi.fn((...args: unknown[]) => mocks.queryResult(...args)),
        then: (...args: Parameters<PromiseLike<unknown>['then']>) =>
            Promise.resolve(mocks.queryResult()).then(...args),
    };
}

const serviceClient = {
    from: vi.fn((table: string) => {
        if (table === 'events') {
            return {
                insert: (...args: unknown[]) => mocks.eventInsert(...args),
            };
        }

        if (table === 'user_submitted_events') {
            return createSubmissionQueryBuilder();
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
    const pendingSubmission = {
        id: 'submission-1',
        title: 'Launch Week',
        description: 'Product demos',
        start_date: '2026-05-01T09:00:00.000Z',
        end_date: '2026-05-01T17:00:00.000Z',
        location: 'Edmonton',
        is_virtual: false,
        registration_url: 'https://example.com/register',
        status: 'pending',
        reviewed_at: null,
        event_id: null,
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
        mocks.updateSingle.mockResolvedValue({
            data: { id: 'submission-1' },
            error: null,
        });
        mocks.queryResult.mockResolvedValue({
            data: [pendingSubmission],
            error: null,
            count: 1,
        });
    });

    it('lists submissions for admins', async () => {
        const response = await GET({
            nextUrl: new URL('http://localhost/api/admin/submissions?status=pending&page=1&pageSize=20'),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.submissions).toEqual([pendingSubmission]);
        expect(payload.total).toBe(1);
    });

    it('approves a pending submission and preserves registration_url semantics', async () => {
        mocks.queryResult
            .mockResolvedValueOnce({
                data: pendingSubmission,
                error: null,
            });

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
        expect(mocks.eventInsert).toHaveBeenCalledWith({
            title: 'Launch Week',
            description: 'Product demos',
            start_time: '2026-05-01T09:00:00.000Z',
            end_time: '2026-05-01T17:00:00.000Z',
            location: 'Edmonton',
            event_format: 'In-person',
            source_url: null,
            registration_url: 'https://example.com/register',
            status: 'active',
            ingestion_provenance: 'user_submitted',
            enrichment_status: 'pending',
        });
    });

    it('returns 409 when trying to approve an already reviewed submission', async () => {
        mocks.queryResult.mockResolvedValueOnce({
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

        const conflictingUpdateBuilder = {
            eq: vi.fn(() => conflictingUpdateBuilder),
            is: vi.fn(() => conflictingUpdateBuilder),
            select: vi.fn(() => conflictingUpdateBuilder),
            single: vi.fn((...args: unknown[]) => mocks.updateSingle(...args)),
        };

        serviceClient.from = vi.fn((table: string) => {
            if (table === 'events') {
                return {
                    insert: (...args: unknown[]) => mocks.eventInsert(...args),
                };
            }
            if (table === 'user_submitted_events') {
                return {
                    select: vi.fn(() => createSubmissionQueryBuilder()),
                    update: vi.fn(() => conflictingUpdateBuilder),
                };
            }
            throw new Error(`Unexpected table ${table}`);
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
