import { render, screen, waitFor } from '@/utils/test-utils';
import userEvent from '@testing-library/user-event';
import ManagerJustificationModal from '../ManagerJustificationModal';
import { vi } from 'vitest';

const { mockCopyToClipboard } = vi.hoisted(() => ({
    mockCopyToClipboard: vi.fn(),
}));

vi.mock('@/utils/exportUtils', () => ({
    copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

const justificationPayload = {
    success: true,
    data: {
        event: {
            title: 'AI Leadership Summit',
            startTime: '2026-05-01T16:00:00Z',
            endTime: '2026-05-01T23:00:00Z',
            timezone: 'PT',
            location: 'San Francisco',
            eventFormat: 'In-person',
            organizer: 'Tech Guild',
            priceRange: '$499 - $899',
            priceMin: 499,
            registrationUrl: 'https://example.com/register',
            description: 'A practical conference for engineering leaders.',
            tags: ['AI', 'Leadership'],
            speakers: [{ name: 'Jane Doe', title: 'CTO', company: 'Acme' }],
            difficulty: 'intermediate',
            targetAudience: 'Engineering managers',
        },
        profile: {
            currentRole: 'Senior Software Engineer',
            seniority: 'senior',
            industry: 'Technology/Software',
            primarySkills: ['React'],
            skillsToLearn: ['Leadership', 'System Design'],
            careerGoals: ['leadership-growth', 'skill-development'],
        },
        impact: {
            overall: 87,
            confidence: 0.92,
            components: {
                skillRelevance: 82,
                careerStageMatch: 90,
                networkingValue: 88,
                industryRelevance: 86,
                timingBonus: 80,
            },
            topReasons: ['Strong leadership alignment', 'High networking opportunity'],
            matchedSkills: ['Leadership', 'System Design'],
            matchedGoals: ['leadership-growth', 'skill-development'],
        },
    },
};

const onClose = vi.fn();
let eventIdCounter = 0;

function nextEventId() {
    eventIdCounter += 1;
    return `event-${eventIdCounter}`;
}

function renderModal(isOpen: boolean, eventId = nextEventId()) {
    return render(
        <ManagerJustificationModal eventId={eventId} isOpen={isOpen} onClose={onClose} />
    );
}

describe('ManagerJustificationModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        mockCopyToClipboard.mockResolvedValue(true);
    });

    it('renders loading state on open', () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            () => new Promise(() => undefined)
        );

        renderModal(true);

        expect(screen.getByTestId('manager-justification-loading')).toBeInTheDocument();
        expect(screen.getByText('Generating approval brief...')).toBeInTheDocument();
    });

    it('displays justification data after fetch', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify(justificationPayload), { status: 200 })
        );

        renderModal(true);

        await waitFor(() => {
            expect(screen.getByText('Event Attendance Request')).toBeInTheDocument();
            expect(screen.getByText('AI Leadership Summit')).toBeInTheDocument();
            expect(screen.getByText('Summary Pitch (High Impact)')).toBeInTheDocument();
        });
    });

    it('handles 412 response with user-friendly message', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify({ success: false, error: 'Onboarding required' }), { status: 412 })
        );

        renderModal(true);

        await waitFor(() => {
            expect(
                screen.getByText('Please complete career onboarding to generate this justification.')
            ).toBeInTheDocument();
        });
    });

    it('handles 401 response with sign-in message', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify({ success: false, error: 'Authentication required' }), { status: 401 })
        );

        renderModal(true);

        await waitFor(() => {
            expect(
                screen.getByText('Please sign in to generate this manager justification.')
            ).toBeInTheDocument();
        });
    });

    it('handles 404 response with user-friendly message', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify({ success: false, error: 'Event not found' }), { status: 404 })
        );

        renderModal(true);

        await waitFor(() => {
            expect(screen.getByText('This event could not be found.')).toBeInTheDocument();
        });
    });

    it('handles 422 response with user-friendly message', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify({ success: false, error: 'Unable to score' }), { status: 422 })
        );

        renderModal(true);

        await waitFor(() => {
            expect(screen.getByText('Unable to score')).toBeInTheDocument();
        });
    });

    it('aborts in-flight request when modal closes during loading', async () => {
        let capturedSignal: AbortSignal | undefined;
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            (_input: unknown, init?: RequestInit) => {
                capturedSignal = init?.signal as AbortSignal;
                return new Promise(() => undefined);
            }
        );

        const eventId = nextEventId();
        const { rerender } = renderModal(true, eventId);
        rerender(<ManagerJustificationModal eventId={eventId} isOpen={false} onClose={onClose} />);

        await waitFor(() => {
            expect(capturedSignal?.aborted).toBe(true);
        });
    });

    it('removing a skill excludes it from clipboard output', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify(justificationPayload), { status: 200 })
        );

        renderModal(true);

        await screen.findByText('AI Leadership Summit');

        await userEvent.click(screen.getByRole('button', { name: 'Leadership' }));
        await userEvent.click(screen.getByRole('button', { name: 'Copy Brief' }));

        expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
        const copiedText = mockCopyToClipboard.mock.calls[0][0] as string;
        expect(copiedText).not.toContain('• Leadership');
        expect(copiedText).toContain('System Design');
    });

    it('copy to clipboard calls utility with generated justification text', async () => {
        (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
            new Response(JSON.stringify(justificationPayload), { status: 200 })
        );

        renderModal(true);

        await screen.findByText('AI Leadership Summit');
        await userEvent.click(screen.getByRole('button', { name: 'Copy Brief' }));

        expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
        const copiedText = mockCopyToClipboard.mock.calls[0][0] as string;
        expect(copiedText).toContain('Subject: Proposal to attend AI Leadership Summit');
        expect(copiedText).toContain('AI Leadership Summit is scheduled to take place on');
        expect(copiedText).toContain('Strong leadership alignment');
    });
});
