import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FeedPostItem from '@/components/social/FeedPostItem';
import type { CommunityFeedPost } from '@/types/community';

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

function createPost(overrides: Partial<CommunityFeedPost> = {}): CommunityFeedPost {
  return {
    id: 'post-1',
    content: 'Forum hierarchy finally feels right\nWe reworked the thread layout to prioritize discussion flow.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    author: {
      id: 'author-1',
      fullName: 'Taylor',
      avatarUrl: null,
    },
    circle: {
      slug: 'design-systems',
      name: 'Design Systems',
    },
    commentCount: 3,
    isTrending: true,
    ...overrides,
  };
}

describe('FeedPostItem', () => {
  it('renders the featured preview as a lead discussion thread', () => {
    render(<FeedPostItem post={createPost()} variant="featured" />);

    expect(screen.getByText('Taylor')).toBeInTheDocument();
    expect(screen.getByText('Forum hierarchy finally feels right')).toBeInTheDocument();
    expect(screen.getByText('3 replies')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/circle/design-systems/posts/forum-hierarchy-finally-feels-right--post-1'
    );
  });

  it('renders the card variant with forum-style metadata and open-thread affordance', () => {
    render(<FeedPostItem post={createPost({ isTrending: false })} variant="card" />);

    expect(screen.getByText('Taylor')).toBeInTheDocument();
    expect(screen.getByText('Design Systems')).toBeInTheDocument();
    expect(screen.getByText('3 replies')).toBeInTheDocument();
    expect(screen.getByText('Open thread')).toBeInTheDocument();
  });

  it('renders the list variant as a compact discussion teaser', () => {
    render(<FeedPostItem post={createPost({ commentCount: 7 })} />);

    expect(screen.getByText('Forum hierarchy finally feels right')).toBeInTheDocument();
    expect(screen.getByText('7 replies')).toBeInTheDocument();
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });
});
