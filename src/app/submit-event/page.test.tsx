import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubmitEventPage from './page';

const mocks = vi.hoisted(() => ({
    getUser: vi.fn(),
    profileSingle: vi.fn(),
    submitForm: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(async () => ({
        auth: {
            getUser: mocks.getUser,
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: mocks.profileSingle,
                })),
            })),
        })),
    })),
}));

vi.mock('./SubmitEventForm', () => ({
    default: (props: unknown) => {
        mocks.submitForm(props);
        return <div data-testid="submit-event-form" />;
    },
}));

describe('SubmitEventPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.profileSingle.mockResolvedValue({ data: { full_name: 'Kure Organizers' }, error: null });
    });

    it('shows a sign-in gate that preserves the submit-event redirect', async () => {
        mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

        render(await SubmitEventPage());

        expect(screen.getByRole('heading', { name: 'Sign in to submit your event' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute(
            'href',
            '/login?redirect=%2Fsubmit-event'
        );
        expect(screen.queryByTestId('submit-event-form')).not.toBeInTheDocument();
    });

    it('renders the form for signed-in users and prefills organizer name from profile data', async () => {
        mocks.getUser.mockResolvedValue({
            data: {
                user: {
                    id: 'user-1',
                    email: 'organizer@example.com',
                    user_metadata: {},
                },
            },
            error: null,
        });

        render(await SubmitEventPage());

        expect(screen.getByTestId('submit-event-form')).toBeInTheDocument();
        expect(mocks.submitForm).toHaveBeenCalledWith({ initialOrganizerName: 'Kure Organizers' });
    });
});
