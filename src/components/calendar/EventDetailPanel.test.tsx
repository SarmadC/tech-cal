import type { ReactNode } from 'react';
import { screen } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@/utils/test-utils';
import type { Event } from '@/types';
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
    default: () => <div>mock-attendance-controls</div>,
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
        mocks.isBookmarked.mockReturnValue(false);
        mocks.getAttendanceStatus.mockReturnValue(null);
    });

    it('renders the action section with attendance controls and keeps bookmark chrome', async () => {
        render(
            <EventDetailPanel
                event={createEvent()}
                onClose={vi.fn()}
                categories={[]}
            />
        );

        expect(await screen.findByText('Action')).toBeInTheDocument();
        expect(screen.getByText('mock-attendance-controls')).toBeInTheDocument();
        expect(screen.getByTitle('Bookmark')).toBeInTheDocument();
    });
});
