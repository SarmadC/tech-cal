import type { ImgHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/utils/test-utils';
import DiscoveryCard from './DiscoveryCard';
import { buildEvent } from '@/tests/factories/eventFactories';

const mocks = vi.hoisted(() => ({
    toggleBookmark: vi.fn(),
    isBookmarked: vi.fn(),
    getAttendanceStatus: vi.fn(),
    setAttendanceStatus: vi.fn(),
    showError: vi.fn(),
}));

vi.mock('next/image', () => ({
    __esModule: true,
    // eslint-disable-next-line @next/next/no-img-element
    default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}));

vi.mock('@/hooks/useEventEngagement', () => ({
    useEventEngagement: () => ({
        isBookmarked: mocks.isBookmarked,
        toggleBookmark: mocks.toggleBookmark,
        getAttendanceStatus: mocks.getAttendanceStatus,
        setAttendanceStatus: mocks.setAttendanceStatus,
    }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
    SnackbarProvider: ({ children }: { children: ReactNode }) => children,
    useSnackbar: () => ({
        showError: mocks.showError,
    }),
}));

vi.mock('@/hooks/useSwipeGestures', () => ({
    useSwipeGestures: () => ({
        swipeHandlers: {},
        swipeState: {
            isActive: false,
            deltaX: 0,
        },
    }),
}));

describe('Mobile DiscoveryCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.isBookmarked.mockReturnValue(false);
        mocks.getAttendanceStatus.mockReturnValue(null);
    });

    it('removes the recommendation bar and renders desktop-style metadata', () => {
        render(
            <DiscoveryCard
                event={buildEvent({
                    id: 'event-mobile-1',
                    title: 'Frontend Systems Meetup',
                    startTime: '2026-04-20T18:30:00.000Z',
                    eventFormat: 'Online',
                    location: 'Calgary',
                    priceMin: 0,
                    priceRange: 'Free',
                })}
            />
        );

        expect(screen.queryByText('Recommendation')).not.toBeInTheDocument();
        expect(screen.getByText('Frontend Systems Meetup')).toBeInTheDocument();
        expect(screen.getByText(/Apr 20/)).toBeInTheDocument();
        expect(screen.getByText(/\d{1,2}:\d{2} [AP]M/)).toBeInTheDocument();
        expect(screen.getByText('Calgary')).toBeInTheDocument();
        expect(screen.getByText('Remote')).toBeInTheDocument();
        expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('matches desktop price rules and falls back missing location to Location TBA', () => {
        render(
            <DiscoveryCard
                event={buildEvent({
                    id: 'event-mobile-2',
                    title: 'Engineering Leadership Summit',
                    startTime: '2026-05-11T17:00:00.000Z',
                    location: '',
                    eventFormat: 'Hybrid',
                    priceMin: 49,
                    priceRange: 'From $99',
                })}
            />
        );

        expect(screen.getByText('Hybrid')).toBeInTheDocument();
        expect(screen.getByText('$49')).toBeInTheDocument();
        expect(screen.getByText('Location TBA')).toBeInTheDocument();
    });

    it('opens the mobile action sheet with the existing overflow actions', async () => {
        const user = userEvent.setup();

        render(
            <DiscoveryCard
                event={buildEvent({
                    id: 'event-mobile-3',
                    title: 'API Reliability Forum',
                })}
            />
        );

        await user.click(screen.getByLabelText('Open actions'));

        expect(screen.getByRole('dialog', { name: 'Event actions' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Why this event' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to shortlist' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Less like this' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Not relevant' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Hide event' })).toBeInTheDocument();
    });
});
