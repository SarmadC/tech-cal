import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostFeedItem from '@/components/social/PostFeedItem';
import type { CircleDiscussionPost } from '@/types/circleDiscussions';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  createCircleComment: vi.fn(),
  votePost: vi.fn(),
  editCirclePost: vi.fn(),
  deleteCirclePost: vi.fn(),
}));

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
  useRouter: () => ({
    refresh: mocks.refresh,
    replace: mocks.replace,
    push: mocks.push,
  }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({
    showSuccess: mocks.showSuccess,
    showError: mocks.showError,
  }),
}));

vi.mock('@/app/circle/[slug]/discussions/actions', () => ({
  createCircleComment: (...args: unknown[]) => mocks.createCircleComment(...args),
  votePost: (...args: unknown[]) => mocks.votePost(...args),
  editCirclePost: (...args: unknown[]) => mocks.editCirclePost(...args),
  deleteCirclePost: (...args: unknown[]) => mocks.deleteCirclePost(...args),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/social/CommentItem', () => ({
  default: ({ comment }: { comment: { id: string } }) => <div>{`mock-comment:${comment.id}`}</div>,
}));

function createPost(): CircleDiscussionPost {
  return {
    id: 'post-1',
    content: 'Thread title\nThe supporting post body explains the problem and asks for feedback.',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    author: {
      id: 'author-1',
      full_name: 'Taylor',
      avatar_url: null,
    },
    comments: [
      {
        id: 'comment-1',
        parent_id: null,
        content: 'First reply',
        created_at: new Date().toISOString(),
        author: {
          id: 'commenter-1',
          full_name: 'Morgan',
          avatar_url: null,
        },
        replies: [],
        score: 2,
        userVote: 0,
      },
      {
        id: 'comment-2',
        parent_id: null,
        content: 'Second reply',
        created_at: new Date().toISOString(),
        author: {
          id: 'commenter-2',
          full_name: 'Avery',
          avatar_url: null,
        },
        replies: [],
        score: 1,
        userVote: 0,
      },
      {
        id: 'comment-3',
        parent_id: null,
        content: 'Third reply',
        created_at: new Date().toISOString(),
        author: {
          id: 'commenter-3',
          full_name: 'Jordan',
          avatar_url: null,
        },
        replies: [],
        score: 0,
        userVote: 0,
      },
    ],
    score: 14,
    userVote: 1,
  };
}

describe('PostFeedItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCircleComment.mockResolvedValue({ success: true });
    mocks.votePost.mockResolvedValue({ success: true });
    mocks.editCirclePost.mockResolvedValue({ success: true });
    mocks.deleteCirclePost.mockResolvedValue({ success: true });
  });

  it('renders forum actions and expands into the discussion view', async () => {
    const user = userEvent.setup();

    render(
      <PostFeedItem
        post={createPost()}
        circleSlug="design-systems"
        currentUser={{ id: 'viewer-1', avatarUrl: null }}
        isJoined={true}
        showPermalink={true}
      />
    );

    expect(screen.getByText('Taylor')).toBeInTheDocument();
    expect(screen.getByText('Thread title')).toBeInTheDocument();
    expect(screen.getByText('3 replies')).toBeInTheDocument();
    expect(screen.getByText('Reply')).toBeInTheDocument();
    expect(screen.queryByText('Open thread')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(screen.queryByText('Discussion')).not.toBeInTheDocument();
    expect(screen.queryByText('Original post')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Open thread: Thread title/i }));

    expect(mocks.push).toHaveBeenCalledWith(
      '/circle/design-systems/posts/thread-title--post-1'
    );

    await user.click(screen.getByRole('button', { name: /Expand post/i }));

    expect(screen.getAllByText('3 replies').length).toBeGreaterThan(0);
    expect(screen.getByText('mock-comment:comment-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View 1 more top-level reply/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reply' }));

    expect(screen.getByPlaceholderText('Add your reply...')).toBeInTheDocument();
  });

  it('redirects back to the circle after deleting from the thread view', async () => {
    const user = userEvent.setup();
    mocks.deleteCirclePost.mockResolvedValue({ success: true });

    render(
      <PostFeedItem
        post={createPost()}
        circleSlug="product"
        currentUser={{ id: 'author-1', avatarUrl: null }}
        isJoined={true}
        initialExpanded={true}
        disableCollapse={true}
        redirectOnDeleteHref="/circle/product"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Post' }));

    expect(mocks.deleteCirclePost).toHaveBeenCalledWith('post-1', 'product', '/circle/product');
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('refreshes in place after deleting from the circle discussion list', async () => {
    const user = userEvent.setup();

    render(
      <PostFeedItem
        post={createPost()}
        circleSlug="product"
        currentUser={{ id: 'author-1', avatarUrl: null }}
        isJoined={true}
        initialExpanded={true}
        disableCollapse={true}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Post' }));

    expect(mocks.deleteCirclePost).toHaveBeenCalledWith('post-1', 'product', undefined);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('shows a clear error when replying without circle membership', async () => {
    const user = userEvent.setup();

    render(
      <PostFeedItem
        post={createPost()}
        circleSlug="product"
        currentUser={{ id: 'viewer-1', avatarUrl: null }}
        isJoined={false}
        initialExpanded={true}
        disableCollapse={true}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Reply' }));

    expect(mocks.showError).toHaveBeenCalledWith('You must join the circle to reply.');
    expect(screen.queryByPlaceholderText('Add your reply...')).not.toBeInTheDocument();
  });
});
