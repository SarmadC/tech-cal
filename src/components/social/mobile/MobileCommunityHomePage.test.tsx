import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobileCommunityHomePage from '@/components/social/mobile/MobileCommunityHomePage';
import type { CommunityNetworkingHomeViewModel } from '@/components/social/community-page-shared';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/social/FollowButton', () => ({
  default: ({ userId }: { userId: string }) => <button>{`follow:${userId}`}</button>,
}));

function createViewModel(
  overrides: Partial<CommunityNetworkingHomeViewModel> = {}
): CommunityNetworkingHomeViewModel {
  return {
    isSignedIn: true,
    summary: {
      trackedUpcomingCount: 1,
      visibleOpportunityCount: 1,
      followUpCount: 1,
      attendanceVisibilityEnabled: true,
    },
    priorityEvents: [
      {
        id: 'event-1',
        slug: 'ios-week',
        title: 'iOS Week',
        startTime: '2026-04-01T18:00:00.000Z',
        location: 'San Francisco',
        format: 'in_person',
        viewerContext: 'saved',
        totalAttendeeCount: 6,
        visibleAttendeeCount: 3,
        networkAttendingCount: 1,
        relationshipAttendeeCount: 0,
        attendeePreview: [
          {
            id: 'person-1',
            fullName: 'Ada Lovelace',
            username: 'ada',
            avatarUrl: null,
            isInNetwork: true,
            followsViewer: false,
            isMutualFollow: false,
          },
        ],
      },
    ],
    meetPeople: [
      {
        id: 'person-1',
        fullName: 'Ada Lovelace',
        username: 'ada',
        avatarUrl: null,
        headline: 'Staff Engineer',
        location: 'San Francisco, CA',
        currentRole: 'Staff Engineer',
        industry: 'Developer tools',
        companySize: 'medium',
        mutualConnectionsCount: 12,
        isInNetwork: true,
        followsViewer: false,
        isMutualFollow: false,
        sharedUpcomingEventCount: 1,
        soonestSharedEventStartTime: '2026-04-01T18:00:00.000Z',
        sharedEvents: [
          {
            id: 'event-1',
            slug: 'ios-week',
            title: 'iOS Week',
            startTime: '2026-04-01T18:00:00.000Z',
            location: 'San Francisco',
            format: 'in_person',
            viewerContext: 'saved',
          },
        ],
      },
    ],
    followUps: [
      {
        id: 'person-2',
        fullName: 'Grace Hopper',
        username: 'grace',
        avatarUrl: null,
        headline: 'Platform Lead',
        location: 'Edmonton, AB',
        currentRole: 'Platform Lead',
        industry: 'Infrastructure',
        companySize: 'large',
        mutualConnectionsCount: 4,
        isInNetwork: false,
        followsViewer: true,
        isMutualFollow: false,
        sharedPastEventCount: 1,
        mostRecentSharedEventStartTime: '2026-03-23T18:00:00.000Z',
        sharedEvents: [
          {
            id: 'event-2',
            slug: 'spring-summit',
            title: 'Spring Summit',
            startTime: '2026-03-23T18:00:00.000Z',
            location: 'Edmonton',
            format: 'in_person',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('MobileCommunityHomePage', () => {
  it('renders the mobile event-networking home with sections in order', () => {
    render(<MobileCommunityHomePage viewModel={createViewModel()} />);

    expect(screen.getByTestId('mobile-community-home-header')).toBeInTheDocument();
    expect(screen.getByText('Best Events to Meet People')).toBeInTheDocument();
    expect(screen.getByText('People You Can Meet')).toBeInTheDocument();
    expect(screen.getByText('Follow Up After Events')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View event/i })).toHaveAttribute(
      'href',
      '/events/ios-week'
    );
    expect(screen.getAllByRole('link', { name: /View profile/i })[0]).toHaveAttribute(
      'href',
      '/u/ada'
    );
    expect(screen.getByText('follow:person-1')).toBeInTheDocument();
    expect(screen.queryByText('Circles')).not.toBeInTheDocument();
  });

  it('shows signed-out empty states without the old social feed copy', () => {
    render(
      <MobileCommunityHomePage
        viewModel={createViewModel({
          isSignedIn: false,
          summary: {
            trackedUpcomingCount: 0,
            visibleOpportunityCount: 0,
            followUpCount: 0,
            attendanceVisibilityEnabled: false,
          },
          priorityEvents: [],
          meetPeople: [],
          followUps: [],
        })}
      />
    );

    expect(screen.getByText('Sign in to unlock event networking.')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to rank your best networking events.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Log in' })[0]).toHaveAttribute(
      'href',
      '/login?redirect=%2Fcommunity'
    );
    expect(screen.queryByText('No discussions yet.')).not.toBeInTheDocument();
  });

  it('shows the attendance visibility prompt for signed-in users who have it disabled', () => {
    render(
      <MobileCommunityHomePage
        viewModel={createViewModel({
          summary: {
            trackedUpcomingCount: 1,
            visibleOpportunityCount: 1,
            followUpCount: 1,
            attendanceVisibilityEnabled: false,
          },
        })}
      />
    );

    expect(screen.getByText('Turn on attendance visibility.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open settings/i })).toHaveAttribute(
      'href',
      '/dashboard/settings'
    );
  });
});
