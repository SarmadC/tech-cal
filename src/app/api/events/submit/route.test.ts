import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
    authGetUser: vi.fn(),
    insert: vi.fn(),
    checkRateLimit: vi.fn(),
    repeatedSubmissionCount: 0,
    eventQueryResults: [] as Array<{ data: Array<{ id: string }>; error: null }>,
}));

function createEventSelectBuilder() {
    const builder = {
        eq: vi.fn(() => builder),
        limit: vi.fn(() => Promise.resolve(mocks.eventQueryResults.shift() ?? { data: [], error: null })),
    };

    return builder;
}

function createSubmissionSelectBuilder() {
    return {
        eq: vi.fn(() => Promise.resolve({ count: mocks.repeatedSubmissionCount, error: null })),
    };
}

const userScopedSupabase = {
    auth: {
        getUser: (...args: unknown[]) => mocks.authGetUser(...args),
    },
    from: vi.fn((table: string) => {
        if (table === 'user_submitted_events') {
            return {
                select: vi.fn(() => createSubmissionSelectBuilder()),
                insert: (...args: unknown[]) => mocks.insert(...args),
            };
        }

        if (table === 'events') {
            return {
                select: vi.fn(() => createEventSelectBuilder()),
            };
        }

        throw new Error(`Unexpected table ${table}`);
    }),
};

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(async () => userScopedSupabase),
}));

vi.mock('@/utils/rateLimit', () => ({
    createRateLimiter: vi.fn(() => ({ limit: vi.fn() })),
    checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

function createRequest(body: Record<string, unknown>, headers?: HeadersInit) {
    return new Request('http://localhost:3000/api/events/submit', {
        method: 'POST',
        headers: {
            origin: 'http://localhost:3000',
            'content-type': 'application/json',
            'x-forwarded-for': '203.0.113.10',
            ...headers,
        },
        body: JSON.stringify(body),
    });
}

describe('POST /api/events/submit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.repeatedSubmissionCount = 0;
        mocks.eventQueryResults = [];
        mocks.authGetUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });
        mocks.checkRateLimit.mockResolvedValue({ success: true });
        mocks.insert.mockImplementation((payload: unknown) => ({
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { id: 'submission-1', payload },
                    error: null,
                }),
            })),
        }));
    });

    it('creates a submission with normalized staged payload', async () => {
        const response = await POST(
            createRequest({
                title: '  Launch Week  ',
                description: '  <p>Product demos</p>  ',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                end_date: '2026-05-01T17:00:00Z',
                timezone: '  America/Edmonton  ',
                event_format: 'Hybrid',
                event_pattern: 'multi_day',
                is_multi_day: true,
                location: '  Edmonton  ',
                location_city: '  Edmonton ',
                location_state: ' Alberta ',
                location_country: ' Canada ',
                source_url: '  https://example.com/event  ',
                registration_url: '  https://example.com/register  ',
                livestream_url: ' https://example.com/live ',
                organizer_name: '  Tech Cal  ',
                organizer_details: {
                    description: '  <strong>Community organizer</strong>  ',
                    website_url: ' https://techcal.dev ',
                },
                series_details: {
                    name: ' Launch Series ',
                },
                target_audience: ' Engineers ',
                tags: [' react ', 'typescript', '', 42],
                admin_override: true,
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload).toMatchObject({
            id: 'submission-1',
            registration_mode: 'external',
        });
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 'user-1',
            title: 'Launch Week',
            description: 'Product demos',
            event_type: 'conference',
            start_date: '2026-05-01T09:00:00.000Z',
            end_date: '2026-05-01T17:00:00.000Z',
            organizer_name: 'Tech Cal',
            event_format: 'Hybrid',
            is_virtual: false,
            location: 'Edmonton',
            source_url: 'https://example.com/event',
            registration_url: 'https://example.com/register',
            registration_mode: 'external',
            tags: ['react', 'typescript'],
            approved_payload: null,
            risk_flags: [],
        }));

        const inserted = mocks.insert.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(inserted.submission_fingerprint).toEqual(expect.any(String));
        expect(inserted.submitted_payload).toMatchObject({
            title: 'Launch Week',
            description: 'Product demos',
            timezone: 'America/Edmonton',
            organizer_details: {
                description: 'Community organizer',
                website_url: 'https://techcal.dev/',
            },
            series_details: {
                name: 'Launch Series',
            },
            tags: ['react', 'typescript'],
        });
        expect(inserted.submitted_payload).not.toHaveProperty('admin_override');
        expect(mocks.checkRateLimit).toHaveBeenCalledTimes(2);
        expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(
            1,
            expect.any(Object),
            'user:user-1',
            { failOpen: false }
        );
        expect(mocks.checkRateLimit).toHaveBeenNthCalledWith(
            2,
            expect.any(Object),
            'ip:203.0.113.10',
            { failOpen: false }
        );
    });

    it('derives native registration mode when no external links are present', async () => {
        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.registration_mode).toBe('native');
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
            source_url: null,
            registration_url: null,
            registration_mode: 'native',
            event_format: 'In-person',
        }));
    });

    it('stores warnings for suspicious but valid submissions', async () => {
        mocks.repeatedSubmissionCount = 2;
        mocks.eventQueryResults = [{ data: [{ id: 'event-1' }], error: null }];

        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
                source_url: 'https://example.com/event',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.warnings).toContain('Similar submission fingerprint has already been seen.');
        expect(payload.warnings).toContain('Possible duplicate event exists in the public events table.');
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
            risk_flags: expect.arrayContaining(['repeat_submission', 'possible_duplicate_event']),
        }));
    });

    it('rejects unsafe URLs', async () => {
        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
                source_url: 'http://localhost:9999/private',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Event website must be publicly reachable');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('blocks private-network URL bypass attempts', async () => {
        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
                source_url: 'http://169.254.169.254/latest/meta-data/',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Event website must be publicly reachable');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('blocks IPv6-mapped loopback URL bypass attempts', async () => {
        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
                source_url: 'http://[::ffff:127.0.0.1]/private',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Event website must be publicly reachable');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects required plain-text fields that become empty after sanitization', async () => {
        const response = await POST(
            createRequest({
                title: '<b></b>',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: '<i></i>',
                location: 'Edmonton',
                event_format: 'In-person',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Title is required');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('rejects cross-site requests', async () => {
        const response = await POST(
            createRequest(
                {
                    title: 'Launch Week',
                    event_type: 'conference',
                    start_date: '2026-05-01T09:00:00Z',
                    organizer_name: 'Tech Cal',
                    location: 'Edmonton',
                    event_format: 'In-person',
                },
                { origin: 'https://evil.example' }
            )
        );
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload.error).toBe('Cross-site requests are not allowed');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 429 when the submit rate limit is exceeded', async () => {
        mocks.checkRateLimit.mockResolvedValue({
            success: false,
            error: { status: 429, message: 'Too many requests. Please try again later.' }
        });

        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(429);
        expect(payload.error).toBe('Too many requests. Please try again later.');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 503 when the rate limiter fails closed (failOpen: false)', async () => {
        mocks.checkRateLimit.mockResolvedValue({
            success: false,
            error: { status: 503, message: 'Rate limiting is temporarily unavailable. Please try again later.' }
        });

        const response = await POST(
            createRequest({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                organizer_name: 'Tech Cal',
                location: 'Edmonton',
                event_format: 'In-person',
            })
        );
        const payload = await response.json();

        expect(response.status).toBe(503);
        expect(payload.error).toBe('Rate limiting is temporarily unavailable. Please try again later.');
        expect(mocks.insert).not.toHaveBeenCalled();
    });
});
