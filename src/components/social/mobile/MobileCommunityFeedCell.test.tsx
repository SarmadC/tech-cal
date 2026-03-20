import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobileCommunityFeedCell from '@/components/social/mobile/MobileCommunityFeedCell';

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

describe('MobileCommunityFeedCell', () => {
  it('renders author, circle, replies, and trending state in the mobile feed format', () => {
    render(
      <MobileCommunityFeedCell
        variant="lead"
        post={{
          id: 'post-1',
          content: 'Shipping the next community layer\nWe finally have enough signal to make this useful.',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          author: {
            id: 'author-1',
            fullName: 'Taylor',
            avatarUrl: null,
          },
          circle: {
            slug: 'design-systems',
            name: 'Design Systems',
          },
          commentCount: 12,
          isTrending: true,
        }}
      />
    );

    expect(screen.getByText('Taylor')).toBeInTheDocument();
    expect(screen.getAllByText('Design Systems').length).toBeGreaterThan(0);
    expect(screen.getByText('Shipping the next community layer')).toBeInTheDocument();
    expect(screen.getByText('12 replies')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/circle/design-systems/posts/shipping-the-next-community-layer--post-1'
    );
  });
});
