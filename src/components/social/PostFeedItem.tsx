'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { ChatCircle, CaretUp, CaretDown, DotsThree, Trash, PencilSimple, ShareNetwork } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
    createCircleComment,
    votePost,
    editCirclePost,
    deleteCirclePost,
} from '@/app/circle/[slug]/discussions/actions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import Avatar, { getDisplayName } from './Avatar';
import VoteControls from './VoteControls';
import CommentItem from './CommentItem';
import type { CircleDiscussionComment, CircleDiscussionPost } from '@/types/circleDiscussions';
import { buildCirclePostPath, parseCirclePostContent } from '@/utils/circlePosts';

interface PostFeedItemProps {
    post: CircleDiscussionPost;
    circleSlug: string;
    currentUser: {
        id: string;
        avatarUrl?: string | null;
    } | null;
    isJoined: boolean;
    initialExpanded?: boolean;
    disableCollapse?: boolean;
    permalinkHref?: string;
    redirectOnDeleteHref?: string;
    showPermalink?: boolean;
}

const MAX_VISIBLE_ROOT_COMMENTS = 2;
const actionLinkClasses = 'inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
const THREAD_PREVIEW_INTERACTIVE_SELECTOR = 'a,button,input,textarea,select,summary,[role="button"],[role="link"],[data-prevent-thread-open="true"]';

function countComments(comments: CircleDiscussionComment[]): number {
    return comments.reduce((total, comment) => {
        return total + 1 + countComments(comment.replies || []);
    }, 0);
}

export default function PostFeedItem({
    post,
    circleSlug,
    currentUser,
    isJoined,
    initialExpanded = false,
    disableCollapse = false,
    permalinkHref,
    redirectOnDeleteHref,
    showPermalink = false,
}: PostFeedItemProps) {
    const router = useRouter();
    const resolvedPermalinkHref =
        permalinkHref || buildCirclePostPath(circleSlug, post.id, post.content);
    const [isPostExpanded, setIsPostExpanded] = useState(initialExpanded);
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [commentContent, setCommentContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommentComposerExpanded, setIsCommentComposerExpanded] = useState(false);
    const commentComposerRef = useRef<HTMLFormElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isEditingSubmit, setIsEditingSubmit] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showSuccess, showError } = useSnackbar();

    const [localScore, setLocalScore] = useState(post.score || 0);
    const [localVote, setLocalVote] = useState(post.userVote || 0);

    const comments = useMemo(() => post.comments ?? [], [post.comments]);
    const totalComments = useMemo(() => countComments(comments), [comments]);

    const visibleRootComments = isExpanded ? comments : comments.slice(0, MAX_VISIBLE_ROOT_COMMENTS);
    const hiddenRootCommentCount = Math.max(0, comments.length - visibleRootComments.length);
    const shouldShowExpandedCommentComposer = isCommentComposerExpanded || Boolean(commentContent.trim());

    const parsedPostContent = useMemo(() => parseCirclePostContent(post.content ?? ''), [post.content]);
    const authorName = getDisplayName(post.author?.full_name);
    const replyLabel = `${totalComments} ${totalComments === 1 ? 'reply' : 'replies'}`;
    const hasSeparateBody = Boolean(parsedPostContent.title && parsedPostContent.body.trim());
    const isCollapsedPreview = !isPostExpanded && !disableCollapse;
    const previewNavigationLabel = parsedPostContent.title || parsedPostContent.body || 'Open thread';
    const isThreadNavigationEnabled = Boolean(showPermalink && !disableCollapse && !isPostExpanded && !isEditing);

    const handleVote = async (voteValue: 1 | -1) => {
        if (!currentUser) {
            showError("You must be logged in to vote.");
            return;
        }
        if (!isJoined) {
            showError("You must join the circle to vote.");
            return;
        }

        const previousVote = localVote;
        const previousScore = localScore;
        const nextVote = previousVote === voteValue ? 0 : voteValue;
        const scoreDiff = nextVote - previousVote;

        setLocalVote(nextVote);
        setLocalScore(previousScore + scoreDiff);

        try {
            const result = await votePost(post.id, nextVote, circleSlug);
            if (!result.success) {
                setLocalVote(previousVote);
                setLocalScore(previousScore);
                showError(result.error || "Failed to vote.");
            }
        } catch {
            setLocalVote(previousVote);
            setLocalScore(previousScore);
            showError("An unexpected error occurred.");
        }
    };

    const handleCommentSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!commentContent.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await createCircleComment(post.id, commentContent, circleSlug);

            if (result.success) {
                setCommentContent('');
                setIsCommentComposerExpanded(false);
                showSuccess('Comment added');
                router.refresh();
            } else {
                showError(result.error || 'Failed to post comment');
            }
        } catch {
            showError('Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async () => {
        if (!editContent.trim()) return;
        setIsEditingSubmit(true);
        try {
            const result = await editCirclePost(post.id, editContent, circleSlug);
            if (result.success) {
                setIsEditing(false);
                showSuccess('Post updated');
                router.refresh();
            } else {
                showError(result.error || 'Failed to update post');
            }
        } catch {
            showError('Failed to update post');
        } finally {
            setIsEditingSubmit(false);
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteCirclePost(post.id, circleSlug, redirectOnDeleteHref);
            if (result.success) {
                showSuccess('Post deleted');
                setShowDeleteConfirm(false);
                router.refresh();
            } else {
                showError(result.error || 'Failed to delete post');
            }
        } catch {
            showError('Failed to delete post');
        } finally {
            setIsDeleting(false);
        }
    };

    const isAuthor = Boolean(currentUser?.id && post.author?.id && currentUser.id === post.author.id);

    const handleCommentComposerBlur = () => {
        setTimeout(() => {
            const activeElement = document.activeElement;
            const isFocusInsideComposer = commentComposerRef.current?.contains(activeElement);
            if (!isFocusInsideComposer && !commentContent.trim()) {
                setIsCommentComposerExpanded(false);
            }
        }, 0);
    };

    const handleShare = async () => {
        const url = `${window.location.origin}${resolvedPermalinkHref}`;

        try {
            if (navigator.share) {
                await navigator.share({ url });
                return;
            }
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
        }

        try {
            await navigator.clipboard.writeText(url);
            showSuccess('Link copied to clipboard');
        } catch {
            showError('Failed to copy link');
        }
    };

    const handleReplyClick = () => {
        if (!currentUser) {
            showError('You must be logged in to reply.');
            return;
        }

        if (!isJoined) {
            showError('You must join the circle to reply.');
            return;
        }

        setIsPostExpanded(true);
        setIsExpanded(true);
        setIsCommentComposerExpanded(true);
        setTimeout(() => {
            document.getElementById(`reply-input-${post.id}`)?.focus();
        }, 60);
    };

    const handleOpenThread = () => {
        if (!isThreadNavigationEnabled) {
            return;
        }

        router.push(resolvedPermalinkHref);
    };

    const handleArticleClick = (event: MouseEvent<HTMLElement>) => {
        if (!isThreadNavigationEnabled) {
            return;
        }

        if (event.target instanceof HTMLElement) {
            const interactiveAncestor = event.target.closest(THREAD_PREVIEW_INTERACTIVE_SELECTOR);

            if (interactiveAncestor && interactiveAncestor !== event.currentTarget) {
                return;
            }
        }

        handleOpenThread();
    };

    const handleArticleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (!isThreadNavigationEnabled) {
            return;
        }

        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        handleOpenThread();
    };

    return (
        <article
            id={`post-${post.id}`}
            role={isThreadNavigationEnabled ? 'link' : undefined}
            tabIndex={isThreadNavigationEnabled ? 0 : undefined}
            aria-label={isThreadNavigationEnabled ? `Open thread: ${previewNavigationLabel}` : undefined}
            onClick={handleArticleClick}
            onKeyDown={handleArticleKeyDown}
            className={cn(
                'group -mx-3 rounded-[20px] px-3 py-6 transition-colors duration-150 hover:bg-zinc-50/80 md:scroll-mt-36 md:py-6 dark:hover:bg-zinc-950/35',
                isThreadNavigationEnabled && 'cursor-pointer'
            )}
        >
            <div className="flex flex-col gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                        <Avatar
                            name={post.author?.full_name}
                            avatarUrl={post.author?.avatar_url}
                            size="md"
                        />

                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 text-[13px] text-zinc-500 dark:text-zinc-400">
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                        {authorName}
                                    </span>
                                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">&middot;</span>
                                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">&middot;</span>
                                    <span>{replyLabel}</span>
                                </p>

                                <div className="flex items-center gap-3">
                                    {isAuthor && currentUser && (
                                        <>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                                                        aria-label="Post actions"
                                                    >
                                                        <DotsThree size={16} weight="bold" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-36">
                                                    <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(post.content); }} className="gap-2 cursor-pointer">
                                                        <PencilSimple size={14} /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} className="text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:bg-red-950/50 gap-2 cursor-pointer">
                                                        <Trash size={14} /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                                                <DialogContent className="sm:max-w-[400px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Delete Post</DialogTitle>
                                                        <DialogDescription>
                                                            Are you sure you want to delete this post? This action cannot be undone.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter className="gap-2 sm:gap-0">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={() => setShowDeleteConfirm(false)}
                                                            disabled={isDeleting}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            onClick={handleConfirmDelete}
                                                            disabled={isDeleting}
                                                        >
                                                            {isDeleting ? 'Deleting...' : 'Delete Post'}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                    </>
                                )}
                                </div>
                            </div>

                            {isEditing ? (
                                <div className="mt-3 overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="min-h-[140px] w-full resize-none border-0 bg-transparent px-4 py-4 text-[14px] leading-6 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-0 dark:text-zinc-100"
                                        disabled={isEditingSubmit}
                                    />
                                    <div className="flex items-center justify-between border-t border-zinc-200/80 px-4 py-3 dark:border-zinc-800/80">
                                        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                                            The first line stays the headline when the post is rendered.
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                                                disabled={isEditingSubmit}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 bg-zinc-950 px-3.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                                                onClick={handleEditSubmit}
                                                disabled={!editContent.trim() || isEditingSubmit}
                                            >
                                                {isEditingSubmit ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                isCollapsedPreview ? (
                                    <div
                                        className="group/content mt-3 block w-full max-w-[72ch] rounded-2xl px-0.5 py-0.5 text-left transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                                    >
                                        {parsedPostContent.title ? (
                                            <>
                                                <h3 className="text-[clamp(1.18rem,1.95vw,1.58rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-zinc-950 transition-colors group-hover/content:text-zinc-700 dark:text-zinc-50 dark:group-hover/content:text-zinc-200">
                                                    {parsedPostContent.title}
                                                </h3>
                                                {hasSeparateBody && (
                                                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-zinc-600 transition-colors line-clamp-4 group-hover/content:text-zinc-700 dark:text-zinc-300 dark:group-hover/content:text-zinc-200">
                                                        {parsedPostContent.body}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800 transition-colors line-clamp-4 group-hover/content:text-zinc-900 dark:text-zinc-200 dark:group-hover/content:text-zinc-100">
                                                {parsedPostContent.body}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-3 max-w-[72ch]">
                                        {parsedPostContent.title ? (
                                            <>
                                                <h3 className="text-[clamp(1.18rem,1.95vw,1.58rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                                                    {parsedPostContent.title}
                                                </h3>
                                                {hasSeparateBody && (
                                                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
                                                        {parsedPostContent.body}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="whitespace-pre-wrap text-[16px] leading-7 text-zinc-800 dark:text-zinc-200">
                                                {parsedPostContent.body}
                                            </p>
                                        )}
                                    </div>
                                )
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
                                <VoteControls
                                    score={localScore}
                                    vote={localVote}
                                    onVote={handleVote}
                                    density="sm"
                                    className="shrink-0"
                                />

                                <button
                                    type="button"
                                    onClick={handleReplyClick}
                                    className={actionLinkClasses}
                                >
                                    <ChatCircle size={16} />
                                    Reply
                                </button>

                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className={actionLinkClasses}
                                >
                                    <ShareNetwork size={16} />
                                    Share
                                </button>

                                {!disableCollapse && (
                                    <button
                                        type="button"
                                        className={cn(actionLinkClasses, 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200')}
                                        onClick={() => setIsPostExpanded(!isPostExpanded)}
                                        aria-label={isPostExpanded ? "Collapse post" : "Expand post"}
                                    >
                                        {isPostExpanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                                        <span>{isPostExpanded ? 'Collapse' : 'Expand'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {isPostExpanded && (
                        <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-zinc-800/80">
                            {totalComments === 0 ? (
                                <div className="mt-4 border-b border-dashed border-zinc-200/80 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                    No comments yet. Start the thread.
                                </div>
                            ) : (
                                <div className="mt-2">
                                    {visibleRootComments.map(comment => (
                                        <CommentItem
                                            key={comment.id}
                                            comment={comment}
                                            postId={post.id}
                                            circleSlug={circleSlug}
                                            currentUser={currentUser}
                                            isJoined={isJoined}
                                            depth={0}
                                        />
                                    ))}
                                </div>
                            )}

                            {hiddenRootCommentCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(true)}
                                    className="mt-4 inline-flex items-center text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                >
                                    View {hiddenRootCommentCount} more top-level repl{hiddenRootCommentCount === 1 ? 'y' : 'ies'}
                                </button>
                            )}

                            {isJoined && currentUser && (
                                <form
                                    ref={commentComposerRef}
                                    onSubmit={handleCommentSubmit}
                                    className="mt-5"
                                >
                                    {shouldShowExpandedCommentComposer ? (
                                        <div className="overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
                                            <textarea
                                                id={`reply-input-${post.id}`}
                                                value={commentContent}
                                                onChange={(e) => setCommentContent(e.target.value)}
                                                onFocus={() => setIsCommentComposerExpanded(true)}
                                                onBlur={handleCommentComposerBlur}
                                                placeholder="Add your reply..."
                                                className="min-h-[96px] w-full resize-none border-0 bg-transparent px-4 py-3.5 text-[14px] leading-6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                                disabled={isSubmitting}
                                                rows={1}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                        e.preventDefault();
                                                        const form = e.currentTarget.closest('form');
                                                        form?.requestSubmit();
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center justify-between border-t border-zinc-200/80 px-4 py-3 dark:border-zinc-800/80">
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    Shift + Enter for newline
                                                </span>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="h-9 bg-zinc-950 px-4 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                                                    disabled={!commentContent.trim() || isSubmitting}
                                                >
                                                    {isSubmitting ? 'Posting...' : 'Post reply'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCommentComposerExpanded(true);
                                                setTimeout(() => {
                                                    document.getElementById(`reply-input-${post.id}`)?.focus();
                                                }, 0);
                                            }}
                                            className="flex w-full items-center gap-3 border-t border-dashed border-zinc-200/80 pt-4 text-left transition-colors hover:text-zinc-900 dark:border-zinc-800 dark:hover:text-zinc-100"
                                        >
                                            <Avatar
                                                name="You"
                                                avatarUrl={currentUser.avatarUrl}
                                                size="md"
                                            />
                                            <div className="min-w-0">
                                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Join the discussion
                                                </span>
                                                <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                                                    Add your reply to this thread.
                                                </p>
                                            </div>
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
