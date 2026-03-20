import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesktopCommunityHomePage from '@/components/social/DesktopCommunityHomePage';
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

vi.mock('@/components/social/FeedPostItem', () => ({
  default: ({ post, variant }: { post: { id: string }; variant?: string }) => (
    <div>{`feed-post:${post.id}:${variant || 'list'}`}</div>
  ),
}));

vi.mock('@/components/ui/Icon', () => ({
  MaterialIcon: ({ name }: { name: string }) => <span>{`icon:${name}`}</span>,
}));

function createViewModel(
  overrides: Partial<CommunityFeedPageViewModel> = {}
): CommunityFeedPageViewModel {
  return {
    isSignedIn: false,
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
    circles: [],
    upcomingEvents: [],
    ...overrides,
  };
}

describe('DesktopCommunityHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders a signed-out feed preview without circles links', () => {
    render(<DesktopCommunityHomePage viewModel={createViewModel()} />);

    expect(
      screen.getByRole('heading', {
        name: 'See what the community is discussing right now.',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('feed-post:post-1:featured')).toBeInTheDocument();
    expect(screen.getByText('feed-post:post-2:list')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to personalize the feed and join the replies.')
    ).toBeInTheDocument();
    expect(document.querySelector('a[href="/community/circles"]')).not.toBeInTheDocument();
    expect(screen.queryByText('Your circles')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('renders joined and discover circles inline and uses the join api', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response);

    render(
      <DesktopCommunityHomePage
        viewModel={createViewModel({
          isSignedIn: true,
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
              name: 'Product Circle',
              description: 'Product operators.',
              href: '/circle/product',
              isJoined: false,
              memberCount: 10,
            },
          ],
        })}
      />
    );

    expect(screen.getByText('Your circles')).toBeInTheDocument();
    expect(screen.getByText('Discover circles')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI/i })).toHaveAttribute('href', '/circle/ai');

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/community/circles/circle-2/join', {
        method: 'POST',
      });
    });

    expect(mockShowSuccess).toHaveBeenCalledWith('Joined circle!');
    expect(mockRefresh).toHaveBeenCalled();
    expect(document.querySelector('a[href="/community/circles"]')).not.toBeInTheDocument();
  });
});
