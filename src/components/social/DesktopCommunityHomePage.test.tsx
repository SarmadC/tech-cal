import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DesktopCommunityHomePage from '@/components/social/DesktopCommunityHomePage';
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
      trackedUpcomingCount: 2,
      visibleOpportunityCount: 2,
      followUpCount: 1,
      attendanceVisibilityEnabled: true,
    },
    priorityEvents: [
      {
        id: 'event-1',
        slug: 'demo-night',
        title: 'Demo Night',
        startTime: '2026-04-10T18:00:00.000Z',
        location: 'Calgary',
        format: 'in_person',
        viewerContext: 'attending',
        totalAttendeeCount: 8,
        visibleAttendeeCount: 4,
        networkAttendingCount: 2,
        relationshipAttendeeCount: 1,
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
        sharedUpcomingEventCount: 2,
        soonestSharedEventStartTime: '2026-04-10T18:00:00.000Z',
        sharedEvents: [
          {
            id: 'event-1',
            slug: 'demo-night',
            title: 'Demo Night',
            startTime: '2026-04-10T18:00:00.000Z',
            location: 'Calgary',
            format: 'in_person',
            viewerContext: 'attending',
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

describe('DesktopCommunityHomePage', () => {
  it('renders the new event-networking community layout for signed-in users', () => {
    render(<DesktopCommunityHomePage viewModel={createViewModel()} />);

    expect(
      screen.getByRole('heading', {
        name: "Meet people through the events you're already tracking.",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Best Events to Meet People' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'People You Can Meet' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Follow Up After Events' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View event/i })).toHaveAttribute(
      'href',
      '/events/demo-night'
    );
    expect(screen.getAllByRole('link', { name: /View profile/i })[0]).toHaveAttribute(
      'href',
      '/u/ada'
    );
    expect(screen.getByText('follow:person-1')).toBeInTheDocument();
    expect(screen.queryByText('Circles')).not.toBeInTheDocument();
    expect(
      screen.queryByText('See what the community is discussing right now.')
    ).not.toBeInTheDocument();
  });

  it('shows sign-in and networking empty states for signed-out users', () => {
    render(
      <DesktopCommunityHomePage
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

    expect(
      screen.getByText('Turn Community into your event networking desk.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Log in' })[0]).toHaveAttribute(
      'href',
      '/login?redirect=%2Fcommunity'
    );
    expect(
      screen.getByText('Sign in to see which events are best for meeting people.')
    ).toBeInTheDocument();
    expect(screen.getByText('No public attendee matches yet.')).toBeInTheDocument();
  });

  it('prompts signed-in users to enable attendance visibility when it is off', () => {
    render(
      <DesktopCommunityHomePage
        viewModel={createViewModel({
          summary: {
            trackedUpcomingCount: 2,
            visibleOpportunityCount: 2,
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
