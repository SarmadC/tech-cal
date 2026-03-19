import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/utils/test-utils';
import MobileDiscoveryView from './MobileDiscoveryView';
import { buildEvent, buildEventType } from '@/tests/factories/eventFactories';
import { createDefaultUnifiedFilters } from '@/hooks/useUnifiedServerFiltering';

const mocks = vi.hoisted(() => ({
    trackImpressions: vi.fn(),
    trackFilterChange: vi.fn(),
    trackRankingChange: vi.fn(),
    trackCardClick: vi.fn(),
    trackFeedbackAction: vi.fn(),
    trackSave: vi.fn(),
    trackAttendanceToggle: vi.fn(),
    trackShortlistAction: vi.fn(),
    getAttendanceStatus: vi.fn(),
    setAttendanceStatus: vi.fn(),
    showInfo: vi.fn(),
    showError: vi.fn(),
}));

vi.mock('@/hooks/useDiscoveryUxMetrics', () => ({
    useDiscoveryUxMetrics: () => ({
        trackImpressions: mocks.trackImpressions,
        trackFilterChange: mocks.trackFilterChange,
        trackRankingChange: mocks.trackRankingChange,
        trackCardClick: mocks.trackCardClick,
        trackFeedbackAction: mocks.trackFeedbackAction,
        trackSave: mocks.trackSave,
        trackAttendanceToggle: mocks.trackAttendanceToggle,
        trackShortlistAction: mocks.trackShortlistAction,
    }),
}));

vi.mock('@/hooks/useEventEngagement', () => ({
    useEventEngagement: () => ({
        getAttendanceStatus: mocks.getAttendanceStatus,
        setAttendanceStatus: mocks.setAttendanceStatus,
    }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
    SnackbarProvider: ({ children }: { children: ReactNode }) => children,
    useSnackbar: () => ({
        showInfo: mocks.showInfo,
        showError: mocks.showError,
    }),
}));

vi.mock('@/components/discovery/DiscoverySidebar', () => ({
    default: () => <div data-testid="mock-discovery-sidebar">sidebar</div>,
}));

vi.mock('@/components/discovery/ShortlistCompareTray', () => ({
    default: ({ events }: { events: Array<{ id: string }> }) => (
        <div data-testid="mock-shortlist-tray">{events.length}</div>
    ),
}));

vi.mock('./DiscoveryCard', () => ({
    default: ({ event, className }: { event: { title: string }; className?: string }) => (
        <article data-testid="mock-discovery-card" className={className}>
            {event.title}
        </article>
    ),
}));

const defaultEvents = [
    buildEvent({
        id: 'event-1',
        title: 'Design Systems Deep Dive for Mobile Product Teams',
        location: 'Calgary',
        eventFormat: 'Online',
    }),
    buildEvent({
        id: 'event-2',
        title: 'Platform Engineering Summit',
        location: 'Edmonton',
        eventFormat: 'Hybrid',
    }),
];

const defaultProps = {
    events: defaultEvents,
    categories: [buildEventType()],
    profile: null,
    onEventSelect: vi.fn(),
    filters: createDefaultUnifiedFilters({
        sortBy: 'career-impact',
        sortDirection: 'desc',
    }),
    onUpdateFilter: vi.fn(),
    onSearch: vi.fn(),
    totalCount: 24,
    onResetFilters: vi.fn(),
    activeFilterCount: 0,
    countsFromServer: null,
    onNearMeClick: vi.fn(),
    isDetectingLocation: false,
    isSearching: false,
};

describe('MobileDiscoveryView', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mocks.getAttendanceStatus.mockReturnValue(null);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('opens and closes the mobile filter sheet from the shell controls', async () => {
        const user = userEvent.setup();

        render(<MobileDiscoveryView {...defaultProps} activeFilterCount={2} />);

        await user.click(screen.getByLabelText('Open filters'));

        expect(screen.getByRole('dialog', { name: 'Refine your feed' })).toBeInTheDocument();
        expect(screen.getByTestId('mock-discovery-sidebar')).toBeInTheDocument();
        expect(screen.queryByText('Keep discovery focused without losing momentum.')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Select date range' })).toHaveTextContent('Any date');
        expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('End date')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'Refine your feed' })).not.toBeInTheDocument();
        });
    });

    it('collapses the premium header when the mobile scroll parent moves', async () => {
        render(
            <div data-testid="scroll-host" style={{ height: '844px', overflowY: 'auto' }}>
                <MobileDiscoveryView {...defaultProps} />
            </div>
        );

        const header = screen.getByTestId('mobile-discovery-header');
        const scrollHost = screen.getByTestId('scroll-host');

        expect(header).toHaveAttribute('data-compact', 'false');

        Object.defineProperty(scrollHost, 'scrollTop', {
            configurable: true,
            value: 96,
            writable: true,
        });

        fireEvent.scroll(scrollHost);

        await waitFor(() => {
            expect(header).toHaveAttribute('data-compact', 'true');
        });
    });

    it('restores shortlist mode from local storage and renders the saved state shell', async () => {
        localStorage.setItem('mobile-discovery-shortlist-mode', JSON.stringify(true));
        localStorage.setItem('mobile-discovery-shortlist-ids', JSON.stringify(['event-1']));

        render(
            <div style={{ width: '430px', height: '932px', overflowY: 'auto' }}>
                <MobileDiscoveryView {...defaultProps} />
            </div>
        );

        expect(screen.queryByText('Saved for compare')).not.toBeInTheDocument();
        expect(screen.getByText('Return')).toBeInTheDocument();
        expect(screen.getByText('Only your saved comparisons')).toBeInTheDocument();
        expect(screen.getByText('Design Systems Deep Dive for Mobile Product Teams')).toBeInTheDocument();
    });
});
