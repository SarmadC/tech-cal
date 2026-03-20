'use client';

import dynamic from 'next/dynamic';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import type { CommunityFeedPageViewModel } from '@/components/social/community-page-shared';

const DesktopCommunityHomePage = dynamic(
  () => import('./DesktopCommunityHomePage'),
  {
    loading: () => <CommunityFeedSkeleton />,
  }
);

const MobileCommunityHomePage = dynamic(
  () => import('./mobile/MobileCommunityHomePage'),
  {
    loading: () => <CommunityFeedSkeleton />,
  }
);

interface AdaptiveCommunityPageProps {
  viewModel: CommunityFeedPageViewModel;
}

function CommunityFeedSkeleton() {
  return (
    <main className="min-h-screen bg-[var(--background-main)]">
      <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-3 w-28 rounded-full bg-[var(--background-secondary)]" />
          <div className="h-12 w-full max-w-2xl rounded-full bg-[var(--background-secondary)]" />
          <div className="h-5 w-full max-w-3xl rounded-full bg-[var(--background-secondary)]" />
          <div className="flex gap-3 overflow-hidden">
            <div className="h-10 w-44 rounded-full bg-[var(--background-secondary)]" />
            <div className="h-10 w-40 rounded-full bg-[var(--background-secondary)]" />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_320px]">
          <div className="space-y-5">
            <div className="h-72 rounded-[32px] bg-[var(--background-secondary)]/80 animate-pulse" />
            <div className="h-32 rounded-[28px] bg-[var(--background-secondary)]/70 animate-pulse" />
            <div className="h-80 rounded-[32px] bg-[var(--background-secondary)]/75 animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="h-36 rounded-[28px] bg-[var(--background-secondary)]/75 animate-pulse" />
            <div className="h-52 rounded-[28px] bg-[var(--background-secondary)]/75 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdaptiveCommunityPage({
  viewModel,
}: AdaptiveCommunityPageProps) {
  const { isReady, isMobile } = useDeviceDetection();

  if (!isReady) {
    return <CommunityFeedSkeleton />;
  }

  return isMobile ? (
    <MobileCommunityHomePage viewModel={viewModel} />
  ) : (
    <DesktopCommunityHomePage viewModel={viewModel} />
  );
}
