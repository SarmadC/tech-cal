import React, { useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdaptiveCommunityPage from '@/components/social/AdaptiveCommunityPage';
import type { CommunityNetworkingHomeViewModel } from '@/components/social/community-page-shared';

const mockUseDeviceDetection = vi.fn();

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    return function DynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = useState<React.ComponentType<unknown> | null>(null);

      useEffect(() => {
        let isMounted = true;

        void loader().then((module) => {
          if (isMounted) {
            setComponent(() => module.default);
          }
        });

        return () => {
          isMounted = false;
        };
      }, []);

      return Component ? <Component {...props} /> : null;
    };
  },
}));

vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => mockUseDeviceDetection(),
}));

vi.mock('./DesktopCommunityHomePage', () => ({
  default: ({ viewModel }: { viewModel: CommunityNetworkingHomeViewModel }) => (
    <div>desktop:{viewModel.priorityEvents.length}</div>
  ),
}));

vi.mock('./mobile/MobileCommunityHomePage', () => ({
  default: ({ viewModel }: { viewModel: CommunityNetworkingHomeViewModel }) => (
    <div>mobile:{viewModel.priorityEvents.length}</div>
  ),
}));

const viewModel: CommunityNetworkingHomeViewModel = {
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
};

describe('AdaptiveCommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the desktop module on desktop viewports', async () => {
    mockUseDeviceDetection.mockReturnValue({ isReady: true, isMobile: false });

    render(<AdaptiveCommunityPage viewModel={viewModel} />);

    expect(await screen.findByText('desktop:0')).toBeInTheDocument();
  });

  it('renders the mobile module on mobile viewports', async () => {
    mockUseDeviceDetection.mockReturnValue({ isReady: true, isMobile: true });

    render(<AdaptiveCommunityPage viewModel={viewModel} />);

    expect(await screen.findByText('mobile:0')).toBeInTheDocument();
  });
});
