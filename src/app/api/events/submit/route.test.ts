import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
    getAuthenticatedRequestContext: vi.fn(),
    insert: vi.fn(),
}));

const insertBuilder = {
    insert: (...args: unknown[]) => mocks.insert(...args),
};

const userScopedSupabase = {
    from: vi.fn(() => insertBuilder),
};

vi.mock('@/utils/supabase/requestAuth', () => ({
    getAuthenticatedRequestContext: (...args: unknown[]) => mocks.getAuthenticatedRequestContext(...args),
}));

describe('POST /api/events/submit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
    });

    it('creates a submission with normalized values', async () => {
        const response = await POST({
            json: async () => ({
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.id).toBe('submission-1');
        expect(mocks.insert).toHaveBeenCalledWith({
            user_id: 'user-1',
            title: 'Launch Week',
            description: 'Product demos',
            event_type: 'conference',
            start_date: '2026-05-01T09:00:00.000Z',
            end_date: '2026-05-01T17:00:00.000Z',
            location: 'Edmonton',
            is_virtual: false,
            registration_url: 'https://example.com/register',
            organizer_name: 'Tech Cal',
            tags: ['react', 'typescript'],
        });
    });

    it('accepts bearer-authenticated mobile submissions with the same payload contract', async () => {
        mocks.getAuthenticatedRequestContext.mockResolvedValueOnce({
            authMethod: 'bearer',
            supabase: userScopedSupabase,
            user: { id: 'mobile-user-1' },
        });

        const response = await POST({
            headers: new Headers({ authorization: 'Bearer mobile-token' }),
            json: async () => ({
                title: 'Mobile Launch Week',
                event_type: 'meetup',
                start_date: '2026-05-01T09:00:00Z',
                end_date: null,
                is_virtual: true,
                location: 'should be ignored',
                tags: ['react-native', 'expo'],
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(payload.id).toBe('submission-1');
        expect(mocks.insert).toHaveBeenCalledWith({
            user_id: 'mobile-user-1',
            title: 'Mobile Launch Week',
            description: null,
            event_type: 'meetup',
            start_date: '2026-05-01T09:00:00.000Z',
            end_date: null,
            location: null,
            is_virtual: true,
            registration_url: null,
            organizer_name: null,
            tags: ['react-native', 'expo'],
        });
    });

    it('returns 401 when authentication cannot be resolved', async () => {
        mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

        const response = await POST({
            headers: new Headers(),
            json: async () => ({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.error).toBe('Unauthorized');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid bearer token', async () => {
        mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

        const response = await POST({
            headers: new Headers({ authorization: 'Bearer invalid-token' }),
            json: async () => ({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.error).toBe('Unauthorized');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid event type', async () => {
        const response = await POST({
            json: async () => ({
                title: 'Launch Week',
                event_type: 'webinar',
                start_date: '2026-05-01T09:00:00Z',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Event type is invalid');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid start date', async () => {
        const response = await POST({
            json: async () => ({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: 'not-a-date',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Start date must be a valid datetime');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid end date', async () => {
        const response = await POST({
            json: async () => ({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                end_date: 'later maybe',
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('End date must be a valid datetime');
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('returns 400 when an in-person event omits location', async () => {
        const response = await POST({
            json: async () => ({
                title: 'Launch Week',
                event_type: 'conference',
                start_date: '2026-05-01T09:00:00Z',
                is_virtual: false,
            }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe('Location is required for in-person events');
        expect(mocks.insert).not.toHaveBeenCalled();
    });
});
