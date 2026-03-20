import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
    authGetUser: vi.fn(),
    insert: vi.fn(),
}));

const insertBuilder = {
    insert: (...args: unknown[]) => mocks.insert(...args),
};

const userScopedSupabase = {
    auth: {
        getUser: (...args: unknown[]) => mocks.authGetUser(...args),
    },
    from: vi.fn(() => insertBuilder),
};

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(async () => userScopedSupabase),
}));

describe('POST /api/events/submit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.authGetUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
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
});
