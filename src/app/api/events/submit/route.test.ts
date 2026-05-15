import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
    checkRateLimit: vi.fn(),
    createRateLimiter: vi.fn(),
    getAuthenticatedRequestContext: vi.fn(),
    insert: vi.fn(),
    queryResult: vi.fn(),
    validateUrlForServerFetch: vi.fn(),
}));

function createAwaitableQueryBuilder() {
    const builder = {
        eq: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        then: (...args: Parameters<PromiseLike<unknown>['then']>) =>
            Promise.resolve(mocks.queryResult()).then(...args),
    };

    return builder;
}

const userScopedSupabase = {
    from: vi.fn((table: string) => {
        if (table !== 'events' && table !== 'user_submitted_events') {
            throw new Error(`Unexpected table ${table}`);
        }

        return {
            insert: (...args: unknown[]) => mocks.insert(...args),
            select: vi.fn(() => createAwaitableQueryBuilder()),
        };
    }),
};

vi.mock('@/utils/supabase/requestAuth', () => ({
    getAuthenticatedRequestContext: (...args: unknown[]) =>
        mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/utils/rateLimit', () => ({
    checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
    createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
}));

vi.mock('@/lib/ssrfProtection', () => ({
    validateUrlForServerFetch: (...args: unknown[]) =>
        mocks.validateUrlForServerFetch(...args),
}));

describe('POST /api/events/submit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createRateLimiter.mockReturnValue({});
        mocks.checkRateLimit.mockResolvedValue({ success: true });
        mocks.getAuthenticatedRequestContext.mockResolvedValue({
            authMethod: 'cookie',
            supabase: userScopedSupabase,
            user: { id: 'user-1' },
        });
        mocks.insert.mockImplementation((payload: unknown) => ({
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'submission-1', payload },
                    error: null,
                }),
            })),
        }));
        mocks.queryResult.mockResolvedValue({
            count: 0,
            data: [],
            error: null,
        });
        mocks.validateUrlForServerFetch.mockResolvedValue({
            valid: true,
            url: new URL('https://example.com/register'),
        });
    });

    it('creates a submission with normalized values and moderation metadata', async () => {
        const response = await POST(
            new Request('http://localhost/api/events/submit', {
                body: JSON.stringify({
                    title: '  Launch Week  ',
                    description: '  Product demos  ',
                    event_type: 'conference',
                    start_date: '2026-05-01T09:00:00Z',
                    end_date: '2026-05-01T17:00:00Z',
                    location: '  Edmonton  ',
                    is_virtual: false,
                    registration_url: '  https://example.com/register  ',
                    organizer_name: '  Tech Cal  ',
                    tags: [' react ', 'typescript', '', 42],
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            }) as never
        );
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.id).toBe('submission-1');
        expect(mocks.checkRateLimit).toHaveBeenCalledTimes(1);
        expect(mocks.validateUrlForServerFetch).toHaveBeenCalledWith(
            'https://example.com/register',
            { allowUnresolvedHostnames: true }
        );
        expect(mocks.insert).toHaveBeenCalledWith({
            user_id: 'user-1',
            title: 'Launch Week',
            description: 'Product demos',
            event_type: 'conference',
            start_date: '2026-05-01T09:00:00.000Z',
            end_date: '2026-05-01T17:00:00.000Z',
            location: 'Edmonton',
            is_virtual: false,
            organizer_name: 'Tech Cal',
            registration_mode: 'external',
            registration_url: 'https://example.com/register',
            risk_flags: [],
            submission_fingerprint: expect.stringMatching(/^[a-f0-9]{32}$/),
            submitted_payload: {
                title: 'Launch Week',
                description: 'Product demos',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00.000Z',
                end_date: '2026-05-01T17:00:00.000Z',
                is_virtual: false,
                location: 'Edmonton',
                registration_url: 'https://example.com/register',
                organizer_name: 'Tech Cal',
                tags: ['react', 'typescript'],
            },
            tags: ['react', 'typescript'],
            validation_summary: expect.objectContaining({
                duplicate_event_count: 0,
                repeated_submission_count: 0,
                schema_version: 1,
                warnings: [],
            }),
        });
    });

    it('accepts bearer-authenticated mobile submissions with the same payload contract', async () => {
        mocks.getAuthenticatedRequestContext.mockResolvedValueOnce({
            authMethod: 'bearer',
            supabase: userScopedSupabase,
            user: { id: 'mobile-user-1' },
        });

        const response = await POST(
            new Request('http://localhost/api/events/submit', {
                body: JSON.stringify({
                    title: 'Mobile Launch Week',
                    event_type: 'meetup',
                    start_date: '2026-05-01T09:00:00Z',
                    end_date: null,
                    is_virtual: true,
                    location: 'should be ignored',
                    tags: ['react-native', 'expo'],
                }),
                headers: {
                    Authorization: 'Bearer mobile-token',
                    'Content-Type': 'application/json',
                    Origin: 'https://evil.example',
                },
                method: 'POST',
            }) as never
        );
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.id).toBe('submission-1');
        expect(mocks.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'mobile-user-1',
                location: null,
                registration_mode: 'native',
                registration_url: null,
            })
        );
    });

    it('returns 403 for cross-site cookie-authenticated requests', async () => {
        const response = await POST(
            new Request('http://localhost/api/events/submit', {
                body: JSON.stringify({
                    title: 'Launch Week',
                    event_type: 'conference',
                    start_date: '2026-05-01T09:00:00Z',
                    location: 'Edmonton',
                }),
                headers: {
                    'Content-Type': 'application/json',
                    Origin: 'https://evil.example',
                },
                method: 'POST',
            }) as never
        );
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload.error).toBe('Cross-site requests are not allowed.');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 429 when rate limited', async () => {
        mocks.checkRateLimit.mockResolvedValueOnce({ success: false });

        const response = await POST(
            new Request('http://localhost/api/events/submit', {
                body: JSON.stringify({
                    title: 'Launch Week',
                    event_type: 'conference',
                    start_date: '2026-05-01T09:00:00Z',
                    location: 'Edmonton',
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            }) as never
        );
        const payload = await response.json();

        expect(response.status).toBe(429);
        expect(payload.error).toBe('Too many requests. Please try again later.');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 400 when the registration URL is not publicly reachable', async () => {
        mocks.validateUrlForServerFetch.mockResolvedValueOnce({
            reason: 'Host is not allowed',
            valid: false,
        });

        const response = await POST(
            new Request('http://localhost/api/events/submit', {
                body: JSON.stringify({
                    title: 'Launch Week',
                    event_type: 'conference',
                    start_date: '2026-05-01T09:00:00Z',
                    location: 'Edmonton',
                    registration_url: 'https://localhost/register',
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            }) as never
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Registration URL must be publicly reachable');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 401 when authentication cannot be resolved', async () => {
        mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

        const response = await POST(
            new Request('http://localhost/api/events/submit', {
                body: JSON.stringify({
                    title: 'Launch Week',
                    event_type: 'conference',
                    start_date: '2026-05-01T09:00:00Z',
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            }) as never
        );
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.error).toBe('Unauthorized');
        expect(mocks.insert).not.toHaveBeenCalled();
    });
});
