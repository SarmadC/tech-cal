import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubmitEventForm from './SubmitEventForm';

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mocks.push,
    }),
}));

describe('SubmitEventForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
    });

    it('shows lean required-field validation errors', async () => {
        render(<SubmitEventForm initialOrganizerName="" />);

        fireEvent.click(screen.getByRole('button', { name: 'Submit event for review' }));

        expect(await screen.findByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
        expect(screen.getByText('Start time is required')).toBeInTheDocument();
        expect(screen.getByText('Organizer name is required')).toBeInTheDocument();
    });

    it('submits a template-aligned payload and preserves native RSVP semantics when links are blank', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ id: 'submission-1', registration_mode: 'native' }),
        } as Response);

        render(<SubmitEventForm initialOrganizerName="Kure Team" />);

        fireEvent.change(screen.getByLabelText(/event title/i), { target: { value: 'Builders Night' } });
        fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-05-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '18:30' } });
        fireEvent.change(screen.getByLabelText(/full location/i), { target: { value: 'Startup Edmonton' } });
        fireEvent.click(screen.getByRole('button', { name: /template-aligned optional fields/i }));
        fireEvent.change(screen.getByLabelText(/timezone/i), { target: { value: 'America/Edmonton' } });
        fireEvent.change(screen.getByLabelText(/target audience/i), { target: { value: 'Founders and engineers' } });
        fireEvent.change(screen.getByLabelText(/speakers/i), { target: { value: 'Jane Doe\nAlex Kim' } });
        fireEvent.click(screen.getByLabelText(/captioning/i));

        fireEvent.click(screen.getByRole('button', { name: 'Submit event for review' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        const [, init] = fetchMock.mock.calls[0]!;
        const body = JSON.parse(String(init?.body));

        expect(body).toMatchObject({
            title: 'Builders Night',
            event_type: 'tech_event',
            organizer_name: 'Kure Team',
            start_date: '2026-05-01T18:30:00',
            end_date: null,
            timezone: 'America/Edmonton',
            event_format: 'In-person',
            is_virtual: false,
            location: 'Startup Edmonton',
            target_audience: 'Founders and engineers',
            source_url: null,
            registration_url: null,
            accessibility_features: {
                captioning: true,
                sign_language: false,
                translator: false,
            },
            speaker_lineup: [{ name: 'Jane Doe' }, { name: 'Alex Kim' }],
            organizer_details: {
                description: null,
                website_url: null,
                logo_url: null,
            },
            series_details: {
                name: null,
                description: null,
                website_url: null,
            },
            tags: [],
        });

        expect(await screen.findByText('Submission received')).toBeInTheDocument();
    });
});
