import type { ReactNode } from 'react';
import { screen } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@/utils/test-utils';
import type { Event, Speaker } from '@/types';
import { EventService } from '@/services/eventServices';
import EventDetailPanel from './EventDetailPanel';

const mocks = vi.hoisted(() => ({
    toggleBookmark: vi.fn(),
    isBookmarked: vi.fn(),
    getAttendanceStatus: vi.fn(),
}));

vi.mock('@/services/eventServices', () => ({
    EventService: {
        getEventWithAgenda: vi.fn(async () => ({ agenda: [] })),
    },
}));

vi.mock('@/utils/supabase/client', () => ({
    createClient: vi.fn(() => ({})),
}));

vi.mock('./EventInfo', () => ({
    default: () => <div>mock-event-info</div>,
}));

vi.mock('./EventTracking', () => ({
    default: ({ variant }: { variant?: 'full' | 'compact' }) => <div>{`mock-attendance-controls-${variant ?? 'full'}`}</div>,
}));

vi.mock('./AdaptiveTimeline', () => ({
    default: () => <div>mock-timeline</div>,
}));

vi.mock('./TrackAgendaView', () => ({
    __esModule: true,
    default: () => <div>mock-track-view</div>,
    groupAgendaByTrack: () => [],
}));

vi.mock('@/components/events/EventFeedbackForm', () => ({
    EventFeedbackForm: () => <div>mock-feedback-form</div>,
}));

vi.mock('@/contexts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/contexts')>();
    return {
        ...actual,
        useAuth: () => ({ user: { id: 'user-1' } }),
    };
});

vi.mock('@/hooks/useEventEngagement', () => ({
    useEventEngagement: () => ({
        isBookmarked: mocks.isBookmarked,
        toggleBookmark: mocks.toggleBookmark,
        getAttendanceStatus: mocks.getAttendanceStatus,
        isLoading: false,
    }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
    SnackbarProvider: ({ children }: { children: ReactNode }) => children,
    useSnackbar: () => ({
        showError: vi.fn(),
    }),
}));

function createEvent(overrides: Partial<Event> = {}): Event {
    return {
        id: 'event-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        title: 'Sample Event',
        description: 'Sample description',
        organizer: 'Tech Calendar',
        location: 'Online',
        status: 'published',
        startTime: '2026-03-10T18:00:00.000Z',
        endTime: '2026-03-10T20:00:00.000Z',
        sourceUrl: 'https://example.com/event',
        livestreamUrl: null,
        eventTypeId: 'conference',
        ...overrides,
    };
}

describe('EventDetailPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(EventService.getEventWithAgenda).mockResolvedValue({ agenda: [] } as never);
        mocks.isBookmarked.mockReturnValue(false);
        mocks.getAttendanceStatus.mockReturnValue(null);
    });

    it('renders compact attendance controls in the header and keeps bookmark chrome', async () => {
        render(
            <EventDetailPanel
                event={createEvent()}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(await screen.findByText('Agenda')).toBeInTheDocument();
        const bookmarkButton = screen.getByTitle('Bookmark');
        const attendanceControl = screen.getByText('mock-attendance-controls-compact');
        const openLink = screen.getByTitle('Open full event page');
        const closeButton = screen.getByLabelText('Close event details');

        expect(attendanceControl).toBeInTheDocument();
        expect(screen.queryByText('Action')).not.toBeInTheDocument();
        expect(bookmarkButton.compareDocumentPosition(attendanceControl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(attendanceControl.compareDocumentPosition(openLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(openLink.compareDocumentPosition(closeButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('renders an empty agenda state when no agenda data is available', async () => {
        render(
            <EventDetailPanel
                event={createEvent()}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(await screen.findByText('Agenda not published yet')).toBeInTheDocument();
        expect(screen.getByText("We'll show session timing here as soon as the organizer shares it.")).toBeInTheDocument();
    });

    it('hydrates fetched agenda and speakers into the detail panel', async () => {
        vi.mocked(EventService.getEventWithAgenda).mockResolvedValueOnce({
            ...createEvent(),
            agenda: [
                {
                    id: 'agenda-1',
                    title: 'SQLBits Kickoff',
                    startTime: '2026-04-22T20:00:00+00:00',
                    endTime: '2026-04-22T21:00:00+00:00',
                    type: 'session',
                },
            ],
            speakerLineup: [
                {
                    name: 'Benni De Jagere',
                    title: 'Principal Program Manager',
                    company: 'Microsoft',
                    photoUrl: 'https://sessionize.com/image/example.png',
                } as Speaker,
            ],
        } as Event & { agenda?: AgendaItem[] });

        render(
            <EventDetailPanel
                event={createEvent({
                    title: 'SQLBits 2026',
                    agenda: [],
                    speakerLineup: [],
                })}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(await screen.findByText('Benni De Jagere')).toBeInTheDocument();
        expect(await screen.findByText('mock-timeline')).toBeInTheDocument();
        expect(screen.queryByText('Agenda not published yet')).not.toBeInTheDocument();
    });

    it('renders speaker lineups without key warnings when speaker ids are missing', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <EventDetailPanel
                event={createEvent({
                    speakerLineup: [
                        {
                            name: 'Jane Doe',
                            title: 'Staff Engineer',
                            company: 'Acme',
                            linkedinUrl: 'https://linkedin.com/in/jane-doe',
                        } as unknown as Speaker,
                        {
                            name: 'Jane Doe',
                            title: 'Staff Engineer',
                            company: 'Acme',
                            linkedinUrl: 'https://linkedin.com/in/jane-doe',
                        } as unknown as Speaker,
                        {
                            name: 'John Roe',
                            title: 'CTO',
                            company: 'Beta',
                        } as unknown as Speaker,
                    ],
                })}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(await screen.findByText('Speakers')).toBeInTheDocument();
        expect(screen.getAllByText('Jane Doe')).toHaveLength(1);
        expect(screen.getByText('John Roe')).toBeInTheDocument();
        expect(screen.getByAltText('Jane Doe')).toHaveAttribute(
            'src',
            '/_next/image?url=https%3A%2F%2Funavatar.io%2Fhttps%253A%252F%252Flinkedin.com%252Fin%252Fjane-doe&w=96&q=75'
        );

        const keyWarningLogged = consoleErrorSpy.mock.calls.some((call) =>
            call.some((arg) =>
                typeof arg === 'string' && arg.includes('Each child in a list should have a unique "key" prop')
            )
        );

        expect(keyWarningLogged).toBe(false);
        consoleErrorSpy.mockRestore();
    });
});
