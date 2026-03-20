import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommentItem from '@/components/social/CommentItem';
import type { CircleDiscussionComment } from '@/types/circleDiscussions';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  createCircleComment: vi.fn(),
  voteComment: vi.fn(),
  editCircleComment: vi.fn(),
  deleteCircleComment: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
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
  voteComment: (...args: unknown[]) => mocks.voteComment(...args),
  editCircleComment: (...args: unknown[]) => mocks.editCircleComment(...args),
  deleteCircleComment: (...args: unknown[]) => mocks.deleteCircleComment(...args),
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

function createCommentTree(): CircleDiscussionComment {
  return {
    id: 'root-comment',
    parent_id: null,
    content: 'Root comment',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    author: {
      id: 'viewer-1',
      full_name: 'Taylor',
      avatar_url: null,
    },
    score: 5,
    userVote: 1,
    replies: [
      {
        id: 'reply-1',
        parent_id: 'root-comment',
        content: 'Nested reply',
        created_at: new Date().toISOString(),
        author: {
          id: 'commenter-2',
          full_name: 'Morgan',
          avatar_url: null,
        },
        score: 2,
        userVote: 0,
        replies: [
          {
            id: 'reply-2',
            parent_id: 'reply-1',
            content: 'Deeper reply',
            created_at: new Date().toISOString(),
            author: {
              id: 'commenter-3',
              full_name: 'Avery',
              avatar_url: null,
            },
            score: 1,
            userVote: 0,
            replies: [
              {
                id: 'reply-3',
                parent_id: 'reply-2',
                content: 'Depth-capped reply',
                created_at: new Date().toISOString(),
                author: {
                  id: 'commenter-4',
                  full_name: 'Jordan',
                  avatar_url: null,
                },
                score: 0,
                userVote: 0,
                replies: [],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('CommentItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCircleComment.mockResolvedValue({ success: true });
    mocks.voteComment.mockResolvedValue({ success: true });
    mocks.editCircleComment.mockResolvedValue({ success: true });
    mocks.deleteCircleComment.mockResolvedValue({ success: true });
  });

  it('renders nested discussion replies and tapers indentation for deep branches', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CommentItem
        comment={createCommentTree()}
        postId="post-1"
        circleSlug="design-systems"
        currentUser={{ id: 'viewer-1', avatarUrl: null }}
        isJoined={true}
      />
    );

    expect(screen.getByText('Root comment')).toBeInTheDocument();
    expect(screen.getByText('Nested reply')).toBeInTheDocument();
    expect(screen.getByText('Deeper reply')).toBeInTheDocument();
    expect(screen.getByText('Depth-capped reply')).toBeInTheDocument();
    expect(screen.getByLabelText('Comment actions')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]);

    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();

    const depthThreeBranch = container.querySelector('[data-thread-depth="3"] > div');
    expect(depthThreeBranch).toHaveStyle({ marginLeft: '10px' });
  });
});
