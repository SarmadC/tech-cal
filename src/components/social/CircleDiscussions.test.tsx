import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CircleDiscussions from '@/components/social/CircleDiscussions';
import type { CircleDiscussionPost } from '@/types/circleDiscussions';

vi.mock('@/components/social/CreatePost', () => ({
  default: () => <div>create-post-surface</div>,
}));

vi.mock('@/components/social/PostFeedItem', () => ({
  default: ({ post }: { post: { id: string; content: string } }) => (
    <div>{`post-feed:${post.id}:${post.content}`}</div>
  ),
}));

function createPosts(): CircleDiscussionPost[] {
  return [
    {
      id: 'post-1',
      title: 'Alpha thread',
      content: 'Alpha thread',
      created_at: '2026-03-19T12:00:00.000Z',
      author: {
        id: 'author-1',
        full_name: 'Taylor',
        avatar_url: null,
      },
      comments: [],
      score: 3,
      userVote: 0,
    },
    {
      id: 'post-2',
      title: 'Beta update',
      content: 'Beta update',
      created_at: '2026-03-18T12:00:00.000Z',
      author: {
        id: 'author-2',
        full_name: 'Morgan',
        avatar_url: null,
      },
      comments: [],
      score: 10,
      userVote: 0,
    },
  ];
}

describe('CircleDiscussions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the discussion utility bar, composer, and search filtering flow', async () => {
    const user = userEvent.setup();

    render(
      <CircleDiscussions
        circleId="circle-1"
        circleSlug="design-systems"
        isJoined={true}
        currentUser={{
          id: 'viewer-1',
          fullName: 'Taylor',
          avatarUrl: null,
        }}
        posts={createPosts()}
      />
    );

    expect(screen.getByText('create-post-surface')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort: Newest' })).toBeInTheDocument();
    expect(screen.getByText('post-feed:post-1:Alpha thread')).toBeInTheDocument();
    expect(screen.getByText('post-feed:post-2:Beta update')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sort: Newest' }));
    await user.click(screen.getByText('Top'));

    expect(screen.getByRole('button', { name: 'Sort: Top' })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search threads or replies'), 'Morgan');

    expect(screen.queryByText('post-feed:post-1:Alpha thread')).not.toBeInTheDocument();
    expect(screen.getByText('post-feed:post-2:Beta update')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 result for "Morgan".')).toBeInTheDocument();
  });
});
