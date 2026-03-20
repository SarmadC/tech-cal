import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MobileCommunityHomePage from '@/components/social/mobile/MobileCommunityHomePage';
import type { CommunityFeedPageViewModel } from '@/components/social/community-page-shared';

const mockRefresh = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

vi.mock('@/components/social/mobile/MobileCommunityFeedCell', () => ({
  default: ({ post, variant }: { post: { id: string }; variant?: string }) => (
    <div>{`mobile-feed:${post.id}:${variant || 'list'}`}</div>
  ),
}));

vi.mock('@/components/social/mobile/MobileCommunityCircleCell', () => ({
  default: ({
    circle,
    variant,
  }: {
    circle: { name: string };
    variant: string;
  }) => <div>{`circle-cell:${circle.name}:${variant}`}</div>,
}));

vi.mock('@/components/ui/Icon', () => ({
  MaterialIcon: ({ name }: { name: string }) => <span>{`icon:${name}`}</span>,
}));

function createViewModel(
  overrides: Partial<CommunityFeedPageViewModel> = {}
): CommunityFeedPageViewModel {
  return {
    isSignedIn: true,
    feed: [
      {
        id: 'post-1',
        content: 'Hello world',
        createdAt: '2026-03-18T12:00:00.000Z',
        author: { id: 'author-1', fullName: 'Ada', avatarUrl: null },
        circle: { slug: 'design', name: 'Design Systems' },
        commentCount: 5,
        isTrending: true,
      },
      {
        id: 'post-2',
        content: 'Another post',
        createdAt: '2026-03-18T13:00:00.000Z',
        author: { id: 'author-2', fullName: 'Taylor', avatarUrl: null },
        circle: { slug: 'mobile', name: 'Mobile Builders' },
        commentCount: 2,
        isTrending: false,
      },
    ],
    circles: [
      {
        id: 'circle-1',
        name: 'Mobile Builders',
        description: 'People building mobile products.',
        href: '/circle/mobile-builders',
        isJoined: true,
        memberCount: 42,
      },
      {
        id: 'circle-2',
        name: 'AI Circle',
        description: 'Applied ML teams.',
        href: '/circle/ai',
        isJoined: false,
        memberCount: 11,
      },
    ],
    upcomingEvents: [
      {
        id: 'event-1',
        slug: 'ios-week',
        title: 'iOS Week',
        startTime: '2026-04-01T18:00:00.000Z',
        location: 'San Francisco',
        format: 'in_person',
      },
    ],
    ...overrides,
  };
}

describe('MobileCommunityHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the flattened mobile home with feed, circles, and events inline', () => {
    render(<MobileCommunityHomePage viewModel={createViewModel()} />);

    expect(screen.getByTestId('mobile-community-home-header')).toBeInTheDocument();
    expect(screen.getByText('mobile-feed:post-1:list')).toBeInTheDocument();
    expect(screen.getByText('mobile-feed:post-2:list')).toBeInTheDocument();
    expect(screen.getByText('Circles')).toBeInTheDocument();
    expect(screen.getByText('circle-cell:Mobile Builders:joined')).toBeInTheDocument();
    expect(screen.getByText('circle-cell:AI Circle:discover')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(document.querySelector('a[href="/community/circles"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('hides discover circles whose canonical name matches a joined circle', () => {
    render(
      <MobileCommunityHomePage
        viewModel={createViewModel({
          circles: [
            {
              id: 'circle-1',
              name: 'AI Circle',
              description: 'Applied ML teams.',
              href: '/circle/ai',
              isJoined: true,
              memberCount: 11,
            },
            {
              id: 'circle-2',
              name: 'AI Builders',
              description: 'Applied ML leads, founders, and platform teams.',
              href: '/circle/ai-builders',
              isJoined: false,
              memberCount: 433,
            },
          ],
        })}
      />
    );

    expect(screen.getByText('circle-cell:AI Circle:joined')).toBeInTheDocument();
    expect(screen.queryByText('circle-cell:AI Builders:discover')).not.toBeInTheDocument();
  });

  it('collapses overlapping product circle variants into one inline row', () => {
    render(
      <MobileCommunityHomePage
        viewModel={createViewModel({
          circles: [
            {
              id: 'circle-1',
              name: 'Product Systems',
              description: 'For product-minded engineers and designers.',
              href: '/circle/product-systems',
              isJoined: false,
              memberCount: 319,
            },
            {
              id: 'circle-2',
              name: 'Product Circle',
              description: 'For PMs, designers, and growth folks.',
              href: '/circle/product',
              isJoined: false,
              memberCount: 10,
            },
          ],
        })}
      />
    );

    expect(screen.getByText('circle-cell:Product Systems:discover')).toBeInTheDocument();
    expect(screen.queryByText('circle-cell:Product Circle:discover')).not.toBeInTheDocument();
  });

  it('keeps circles hidden on signed-out mobile feed previews', () => {
    render(
      <MobileCommunityHomePage
        viewModel={createViewModel({
          isSignedIn: false,
          upcomingEvents: [],
        })}
      />
    );

    expect(screen.getByText('Sign in to join circles and reply.')).toBeInTheDocument();
    expect(screen.queryByText('Circles')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
  });
});
