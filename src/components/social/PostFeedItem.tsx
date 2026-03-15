'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent } from 'react';
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
    const resolvedPermalinkHref = permalinkHref || buildCirclePostPath(circleSlug, post.id);
    const [isPostExpanded, setIsPostExpanded] = useState(initialExpanded);
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [commentContent, setCommentContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCommentComposerExpanded, setIsCommentComposerExpanded] = useState(false);
    const commentComposerRef = useRef<HTMLFormElement>(null);

    // Edit/Delete State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isEditingSubmit, setIsEditingSubmit] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showSuccess, showError } = useSnackbar();

    // Optimistic Voting State for POST
    const [localScore, setLocalScore] = useState(post.score || 0);
    const [localVote, setLocalVote] = useState(post.userVote || 0);

    const comments = useMemo(() => post.comments ?? [], [post.comments]);
    const totalComments = useMemo(() => countComments(comments), [comments]);

    const visibleRootComments = isExpanded ? comments : comments.slice(0, MAX_VISIBLE_ROOT_COMMENTS);
    const hiddenRootCommentCount = Math.max(0, comments.length - visibleRootComments.length);
    const shouldShowExpandedCommentComposer = isCommentComposerExpanded || Boolean(commentContent.trim());

    const parsedPostContent = useMemo(() => parseCirclePostContent(post.content ?? ''), [post.content]);

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
            const result = await deleteCirclePost(post.id, circleSlug);
            if (result.success) {
                showSuccess('Post deleted');
                setShowDeleteConfirm(false);
                if (redirectOnDeleteHref) {
                    router.replace(redirectOnDeleteHref);
                    return;
                }
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

    return (
        <article id={`post-${post.id}`} className="group scroll-mt-28 md:scroll-mt-36">
            <div className="px-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                        <Avatar
                            name={post.author?.full_name}
                            avatarUrl={post.author?.avatar_url}
                            size="md"
                        />

                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 text-[13px]">
                                <span className="max-w-[220px] truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:max-w-none">
                                    {getDisplayName(post.author?.full_name)}
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                                <span className="whitespace-nowrap text-[13px] text-zinc-500 dark:text-zinc-400">
                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </span>
                                <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">&middot;</span>
                                <span className="hidden sm:inline whitespace-nowrap text-[13px] text-zinc-500 dark:text-zinc-400">
                                    {totalComments} comment{totalComments === 1 ? '' : 's'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAuthor && currentUser && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                                                variant="ghost"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                disabled={isDeleting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
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
                        {!disableCollapse && (
                            <button
                                type="button"
                                className="rounded p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors opacity-60 hover:opacity-100 focus:opacity-100"
                                onClick={() => setIsPostExpanded(!isPostExpanded)}
                                aria-label={isPostExpanded ? "Collapse post" : "Expand post"}
                            >
                                {isPostExpanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                            </button>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full rounded-t-lg bg-transparent px-3 py-3 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none border-0 focus:ring-0 resize-none min-h-[90px]"
                            disabled={isEditingSubmit}
                        />
                        <div className="flex items-center justify-end gap-2 border-t border-zinc-200/80 dark:border-zinc-700/80 px-3 py-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                                disabled={isEditingSubmit}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-7 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs"
                                onClick={handleEditSubmit}
                                disabled={!editContent.trim() || isEditingSubmit}
                            >
                                {isEditingSubmit ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4">
                        {parsedPostContent.title ? (
                            <>
                                <h3
                                    className={`text-[34px] leading-[1.2] font-semibold tracking-[-0.015em] text-zinc-900 dark:text-zinc-100 ${!isPostExpanded && !disableCollapse ? 'cursor-pointer' : ''}`}
                                    onClick={() => !isPostExpanded && !disableCollapse && setIsPostExpanded(true)}
                                >
                                    {parsedPostContent.title}
                                </h3>
                                <p
                                    className={`mt-2 whitespace-pre-wrap text-[18px] leading-[1.55] text-zinc-600 dark:text-zinc-300 max-w-[70ch] ${!isPostExpanded && !disableCollapse ? 'line-clamp-3 cursor-pointer' : ''}`}
                                    onClick={() => !isPostExpanded && !disableCollapse && setIsPostExpanded(true)}
                                >
                                    {parsedPostContent.body}
                                </p>
                            </>
                        ) : (
                            <p
                                className={`whitespace-pre-wrap text-[19px] font-medium leading-[1.5] text-zinc-800 dark:text-zinc-200 max-w-[70ch] ${!isPostExpanded && !disableCollapse ? 'line-clamp-3 cursor-pointer' : ''}`}
                                onClick={() => !isPostExpanded && !disableCollapse && setIsPostExpanded(true)}
                            >
                                {parsedPostContent.body}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-4 flex items-center gap-4 text-[14px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                    <VoteControls
                        score={localScore}
                        vote={localVote}
                        onVote={handleVote}
                    />

                    <button
                        type="button"
                        onClick={() => {
                            setIsPostExpanded(true);
                            setIsExpanded(true);
                            setIsCommentComposerExpanded(true);
                            setTimeout(() => {
                                document.getElementById(`reply-input-${post.id}`)?.focus();
                            }, 60);
                        }}
                        className="inline-flex items-center gap-1.5 leading-none hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                        <ChatCircle size={16} />
                        Reply
                    </button>

                    {showPermalink && (
                        <Link
                            href={resolvedPermalinkHref}
                            className="inline-flex items-center gap-1.5 leading-none hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            Open thread
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 leading-none hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                        <ShareNetwork size={16} />
                        Share
                    </button>
                </div>
            </div>

            {isPostExpanded && (
                <div className="mt-6 px-0">
                    <div className="flex w-full items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 py-3">
                        <span className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">
                            {totalComments} comment{totalComments === 1 ? '' : 's'}
                        </span>
                    </div>

                    {totalComments === 0 ? (
                        <p className="py-5 text-sm text-zinc-500 dark:text-zinc-400">
                            No comments yet. Start the thread.
                        </p>
                    ) : (
                        <div className="mt-5 space-y-5">
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
                            className="mt-4 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                        >
                            View {hiddenRootCommentCount} more top-level repl{hiddenRootCommentCount === 1 ? 'y' : 'ies'}
                        </button>
                    )}

                    {isJoined && currentUser && (
                        <form
                            ref={commentComposerRef}
                            onSubmit={handleCommentSubmit}
                            className="mt-6"
                        >
                            {shouldShowExpandedCommentComposer ? (
                                <textarea
                                    id={`reply-input-${post.id}`}
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    onFocus={() => setIsCommentComposerExpanded(true)}
                                    onBlur={handleCommentComposerBlur}
                                    placeholder="Add a comment..."
                                    className="w-full min-h-[72px] resize-none overflow-hidden rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-900/60 px-3 py-2.5 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-0 transition-all"
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
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCommentComposerExpanded(true);
                                        setTimeout(() => {
                                            document.getElementById(`reply-input-${post.id}`)?.focus();
                                        }, 0);
                                    }}
                                    className={`flex w-full items-center rounded-md bg-zinc-100/55 py-2.5 text-left text-[14px] text-zinc-500 transition-colors hover:bg-zinc-100/75 dark:bg-zinc-900/45 dark:text-zinc-400 dark:hover:bg-zinc-900/65 ${currentUser.avatarUrl ? 'gap-3' : 'gap-0'}`}
                                >
                                    {currentUser.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={currentUser.avatarUrl}
                                            alt="Your avatar"
                                            className="h-6 w-6 rounded-full object-cover border border-zinc-200/70 dark:border-zinc-700/80"
                                        />
                                    ) : null}
                                    <span>Add a comment...</span>
                                </button>
                            )}

                            {shouldShowExpandedCommentComposer && (
                                <div className="mt-2 flex items-center justify-between px-0.5">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Shift + Enter for newline
                                    </span>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-8 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs px-3"
                                        disabled={!commentContent.trim() || isSubmitting}
                                    >
                                        {isSubmitting ? 'Posting...' : 'Comment'}
                                    </Button>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            )}
        </article>
    );
}
