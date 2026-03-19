import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/utils/test-utils';
import type { AgendaItem, Event, Speaker } from '@/types';
import { EventService } from '@/services/eventServices';
import MobileEventDetailPanel from './MobileEventDetailPanel';
import { buildAgendaItem, buildEvent, buildEventTag, buildEventType } from '@/tests/factories/eventFactories';

const mocks = vi.hoisted(() => ({
    handleShare: vi.fn(async () => {}),
    handleIcsDownload: vi.fn(),
    googleCalendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
    trackEvent: vi.fn(async () => {}),
    untrackEvent: vi.fn(async () => {}),
    trackedEventIds: new Set<string>(),
    getAttendanceStatus: vi.fn(),
    setAttendanceStatus: vi.fn(async () => {}),
    authUser: { id: 'user-1' } as { id: string } | null,
}));

vi.mock('@/services/eventServices', () => ({
    EventService: {
        getEventWithAgenda: vi.fn(async () => ({ agenda: [], speakerLineup: [] })),
    },
}));

vi.mock('@/utils/supabase/client', () => ({
    createClient: vi.fn(() => ({})),
}));

vi.mock('@/hooks/useEventActions', () => ({
    useEventActions: () => ({
        handleShare: mocks.handleShare,
        googleCalendarLink: mocks.googleCalendarLink,
        handleIcsDownload: mocks.handleIcsDownload,
    }),
}));

vi.mock('@/hooks/useTrackedEventsUnified', () => ({
    useTrackedEventsUnified: () => ({
        trackedEventIds: mocks.trackedEventIds,
        trackEvent: mocks.trackEvent,
        untrackEvent: mocks.untrackEvent,
        isLoading: false,
    }),
}));

vi.mock('@/hooks/useEventEngagement', () => ({
    useEventEngagement: () => ({
        getAttendanceStatus: mocks.getAttendanceStatus,
        setAttendanceStatus: mocks.setAttendanceStatus,
    }),
}));

vi.mock('@/contexts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/contexts')>();
    return {
        ...actual,
        useAuth: () => ({ user: mocks.authUser }),
    };
});

function createEvent(overrides: Partial<Event> = {}): Event {
    return buildEvent({
        id: 'event-1',
        title: 'PyCascades 2026',
        description: 'PyCascades is a regional Python conference for builders on the west coast.',
        location: 'Vancouver, Canada',
        startTime: '2026-03-21T09:00:00.000Z',
        endTime: '2026-03-21T11:00:00.000Z',
        sourceUrl: 'https://example.com/events/pycascades',
        eventTypeId: 'conference',
        eventFormat: 'In-person',
        tags: [
            buildEventTag({ id: 'tag-1', name: 'Python' }),
            buildEventTag({ id: 'tag-2', name: 'Data' }),
        ],
        organization: {
            id: 'org-1',
            name: 'PyCascades',
            logo: 'https://example.com/logo.png',
        },
        ...overrides,
    });
}

describe('MobileEventDetailPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.authUser = { id: 'user-1' };
        mocks.trackedEventIds = new Set<string>();
        mocks.getAttendanceStatus.mockReturnValue(null);
        vi.mocked(EventService.getEventWithAgenda).mockResolvedValue({ agenda: [], speakerLineup: [] } as never);
    });

    it('renders category meta, dense rows, and removes the old inspector labels', async () => {
        render(
            <MobileEventDetailPanel
                event={createEvent()}
                onClose={vi.fn()}
                categories={[buildEventType({ id: 'conference', name: 'Conference' })]}
            />
        );

        expect(screen.getByText('Conference')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'PyCascades 2026' })).toBeInTheDocument();
        expect(screen.getByText('When')).toBeInTheDocument();
        expect(screen.getByText('Where')).toBeInTheDocument();
        expect(screen.getByText('Hosted by')).toBeInTheDocument();
        expect(screen.getByText('Topics')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.queryByText('DATE')).not.toBeInTheDocument();
        expect(screen.queryByText('LOCATION')).not.toBeInTheDocument();
        expect(screen.queryByText('HOST')).not.toBeInTheDocument();
        expect(screen.queryByText('TAGS')).not.toBeInTheDocument();
    });

    it('falls back to the normalized format label and supports overview expansion', async () => {
        const user = userEvent.setup();
        const longDescription = Array.from({ length: 16 }, (_, index) => `Paragraph ${index + 1} about the event.`).join(' ');

        render(
            <MobileEventDetailPanel
                event={createEvent({
                    description: longDescription,
                    eventTypeId: 'unknown',
                    eventFormat: 'Online',
                })}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(screen.getByText('Online')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Read more' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Read more' }));
        expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
    });

    it('hydrates agenda into collapsed day groups and deduplicated speakers with expand controls', async () => {
        const user = userEvent.setup();

        const duplicateSpeaker = {
            id: 'speaker-1',
            name: 'Ada Lovelace',
            title: 'Founder',
            company: 'Analytical Engines',
            linkedinUrl: 'https://linkedin.com/in/ada-lovelace',
        } satisfies Speaker;
        const fifthSpeaker = {
            id: 'speaker-5',
            name: 'Grace Hopper',
            title: 'Rear Admiral',
            company: 'US Navy',
        } satisfies Speaker;

        vi.mocked(EventService.getEventWithAgenda).mockResolvedValueOnce({
            ...createEvent(),
            agenda: [
                buildAgendaItem({
                    id: 'agenda-1',
                    title: 'Opening Keynote',
                    startTime: '2026-03-21T09:00:00.000Z',
                    endTime: '2026-03-21T10:00:00.000Z',
                    speakers: [duplicateSpeaker],
                    speaker: duplicateSpeaker,
                    dayNumber: 1,
                }),
                buildAgendaItem({
                    id: 'agenda-2',
                    title: 'Architecture Review',
                    startTime: '2026-03-21T11:00:00.000Z',
                    endTime: '2026-03-21T12:00:00.000Z',
                    dayNumber: 1,
                }),
                buildAgendaItem({
                    id: 'agenda-3',
                    title: 'Design Systems',
                    startTime: '2026-03-21T13:00:00.000Z',
                    endTime: '2026-03-21T14:00:00.000Z',
                    dayNumber: 1,
                }),
                buildAgendaItem({
                    id: 'agenda-4',
                    title: 'Staff Engineering Roundtable',
                    startTime: '2026-03-21T15:00:00.000Z',
                    endTime: '2026-03-21T16:00:00.000Z',
                    dayNumber: 1,
                }),
                buildAgendaItem({
                    id: 'agenda-5',
                    title: 'Closing Social',
                    startTime: '2026-03-22T18:00:00.000Z',
                    endTime: '2026-03-22T19:00:00.000Z',
                    dayNumber: 2,
                }),
            ],
            speakerLineup: [
                duplicateSpeaker,
                duplicateSpeaker,
                {
                    id: 'speaker-2',
                    name: 'Margaret Hamilton',
                    title: 'Director',
                    company: 'Apollo',
                },
                {
                    id: 'speaker-3',
                    name: 'Radia Perlman',
                    title: 'Engineer',
                    company: 'Sun Microsystems',
                },
                {
                    id: 'speaker-4',
                    name: 'Barbara Liskov',
                    title: 'Professor',
                    company: 'MIT',
                },
                fifthSpeaker,
            ],
        } as Event & { agenda?: AgendaItem[] });

        render(
            <MobileEventDetailPanel
                event={createEvent({ agenda: [], speakerLineup: [] })}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(await screen.findByText('Agenda')).toBeInTheDocument();
        expect(await screen.findByText('Speakers')).toBeInTheDocument();
        expect(screen.getByText('2 days')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Day 1/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Day 2/i })).toBeInTheDocument();
        expect(screen.queryByText('Opening Keynote')).not.toBeInTheDocument();
        expect(screen.queryByText('Closing Social')).not.toBeInTheDocument();
        expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();
        expect(screen.getAllByText('Ada Lovelace')).toHaveLength(1);

        await user.click(screen.getByRole('button', { name: /Day 1/i }));
        expect(screen.getByText('Opening Keynote')).toBeInTheDocument();
        expect(screen.queryByText(/Ada Lovelace, Ada Lovelace/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Day 2/i }));
        expect(screen.getByText('Closing Social')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Show all speakers' }));
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    });

    it('keeps overflow actions working and opens maps from the location row', async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        render(
            <MobileEventDetailPanel
                event={createEvent()}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        await user.click(screen.getByRole('button', { name: 'More actions' }));

        expect(screen.getByText('Share Event')).toBeInTheDocument();
        expect(screen.getByText('Add to Google Calendar')).toBeInTheDocument();
        expect(screen.getByText('Download ICS')).toBeInTheDocument();
        expect(screen.getByText('Visit Event Page')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Share Event' }));
        expect(mocks.handleShare).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'More actions' }));
        await user.click(screen.getByRole('button', { name: 'Download ICS' }));
        expect(mocks.handleIcsDownload).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('button', { name: 'Open location in maps' }));
        expect(openSpy).toHaveBeenCalledWith(
            'https://www.google.com/maps/search/?api=1&query=Vancouver%2C%20Canada',
            '_blank',
            'noopener,noreferrer'
        );

        openSpy.mockRestore();
    });

    it('keeps bookmark auth gating and degrades cleanly without optional sections', async () => {
        mocks.authUser = null;

        render(
            <MobileEventDetailPanel
                event={createEvent({
                    description: '',
                    sourceUrl: '',
                    registrationUrl: null,
                    location: '',
                    tags: [],
                    agenda: [],
                    speakerLineup: [],
                })}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(screen.getByRole('button', { name: 'Add to Calendar' })).toBeInTheDocument();
        expect(screen.getByText('Location TBA')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Bookmark event' })).toBeDisabled();
        expect(screen.queryByText('Topics')).not.toBeInTheDocument();
        expect(screen.queryByText('Overview')).not.toBeInTheDocument();
        expect(screen.queryByText('Agenda')).not.toBeInTheDocument();
        expect(screen.queryByText('Speakers')).not.toBeInTheDocument();
    });

    it('renders a fixed-width yellow bookmark button for saved events', async () => {
        mocks.trackedEventIds = new Set(['event-1']);

        render(
            <MobileEventDetailPanel
                event={createEvent()}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        const bookmarkButton = screen.getByRole('button', { name: 'Remove bookmark' });

        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
        expect(bookmarkButton).toHaveClass('w-[124px]');
        expect(bookmarkButton).toHaveClass('bg-[#f4c84c]');
        expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('fires the primary register action and marks attendance when registration exists', async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        render(
            <MobileEventDetailPanel
                event={createEvent({ registrationUrl: 'https://tickets.example.com/register' })}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Register' }));

        expect(openSpy).toHaveBeenCalledWith(
            'https://tickets.example.com/register',
            '_blank',
            'noopener,noreferrer'
        );
        await waitFor(() => {
            expect(mocks.setAttendanceStatus).toHaveBeenCalledWith('event-1', 'attending');
        });

        openSpy.mockRestore();
    });
});
