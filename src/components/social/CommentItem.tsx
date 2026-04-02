'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { DotsThree, Trash, PencilSimple } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
    createCircleComment,
    voteComment,
    editCircleComment,
    deleteCircleComment
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
import type { CircleDiscussionComment } from '@/types/circleDiscussions';

type CurrentUser = {
    id: string;
    avatarUrl?: string | null;
} | null;

const actionLinkClasses = 'inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

function getIndentIncrement(depth: number): number {
    if (depth === 0) return 0;
    return depth <= 2 ? 18 : 10;
}

export default function CommentItem({
    comment,
    postId,
    circleSlug,
    currentUser,
    isJoined,
    depth = 0
}: {
    comment: CircleDiscussionComment;
    postId: string;
    circleSlug: string;
    currentUser: CurrentUser;
    isJoined: boolean;
    depth?: number;
}) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isEditingSubmit, setIsEditingSubmit] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showSuccess, showError } = useSnackbar();
    const router = useRouter();

    const [localScore, setLocalScore] = useState(comment.score || 0);
    const [localVote, setLocalVote] = useState(comment.userVote || 0);

    const indentIncrement = getIndentIncrement(depth);
    const replies = comment.replies ?? [];
    const isRemoved = Boolean(comment.isRemoved);

    const handleReplySubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await createCircleComment(postId, replyContent, circleSlug, comment.id);

            if (result.success) {
                setReplyContent('');
                setIsReplying(false);
                showSuccess('Reply added');
                router.refresh();
            } else {
                showError(result.error || 'Failed to post reply');
            }
        } catch {
            showError('Failed to post reply');
        } finally {
            setIsSubmitting(false);
        }
    };

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
            const result = await voteComment(comment.id, nextVote, circleSlug);
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

    const handleEditSubmit = async () => {
        if (!editContent.trim()) return;
        setIsEditingSubmit(true);
        try {
            const result = await editCircleComment(comment.id, editContent, circleSlug);
            if (result.success) {
                setIsEditing(false);
                showSuccess('Comment updated');
                router.refresh();
            } else {
                showError(result.error || 'Failed to update comment');
            }
        } catch {
            showError('Failed to update comment');
        } finally {
            setIsEditingSubmit(false);
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteCircleComment(comment.id, circleSlug);
            if (result.success) {
                showSuccess('Comment deleted');
                setShowDeleteConfirm(false);
                router.refresh();
            } else {
                showError(result.error || 'Failed to delete comment');
            }
        } catch {
            showError('Failed to delete comment');
        } finally {
            setIsDeleting(false);
        }
    };

    const isAuthor = Boolean(
        !isRemoved && currentUser?.id && comment.author?.id && currentUser.id === comment.author.id
    );

    return (
        <article className="group/comment" data-thread-depth={depth}>
            <div
                className="relative"
                style={indentIncrement > 0 ? { marginLeft: `${indentIncrement}px` } : undefined}
            >
                <div
                    className={cn(
                        'border-b border-zinc-200/80 pb-4 pt-4 dark:border-zinc-800/80',
                        depth > 0 && 'ml-5 border-l border-zinc-200/80 pl-4 dark:border-zinc-800/80'
                    )}
                >
                    <div className="flex items-start gap-3">
                        <Avatar
                            name={comment.author?.full_name}
                            avatarUrl={comment.author?.avatar_url}
                            size={depth === 0 ? 'md' : 'sm'}
                        />

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="text-[13px] font-semibold text-zinc-950 dark:text-zinc-50">
                                            {getDisplayName(comment.author?.full_name)}
                                        </span>
                                        <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>
                                        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                        {depth > 0 && (
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                                Reply
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isAuthor && currentUser && (
                                    <>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-200 sm:opacity-0 sm:group-hover/comment:opacity-100 sm:focus:opacity-100"
                                                    aria-label="Comment actions"
                                                >
                                                    <DotsThree size={14} weight="bold" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-32">
                                                <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(comment.content); }} className="gap-2 cursor-pointer">
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
                                                    <DialogTitle>Delete Comment</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to delete this comment? This action cannot be undone.
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
                                                        {isDeleting ? 'Deleting...' : 'Delete Comment'}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="mt-3 overflow-hidden border border-zinc-200/80 dark:border-zinc-800">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="min-h-[88px] w-full resize-none border-0 bg-transparent px-3.5 py-3 text-[14px] leading-6 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-0 dark:text-zinc-100"
                                        disabled={isEditingSubmit}
                                        autoFocus
                                    />
                                    <div className="flex items-center justify-between border-t border-zinc-200/80 px-3.5 py-2.5 dark:border-zinc-800/80">
                                        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                                            Update your reply and save when you are ready.
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                                                disabled={isEditingSubmit}
                                                className="h-8 px-3 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleEditSubmit}
                                                disabled={!editContent.trim() || isEditingSubmit}
                                                className="h-8 bg-zinc-950 px-3.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                                            >
                                                {isEditingSubmit ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-zinc-700 dark:text-zinc-300">
                                    {comment.content}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                {!isRemoved ? (
                                    <>
                                        <VoteControls
                                            score={localScore}
                                            vote={localVote}
                                            onVote={handleVote}
                                            density="sm"
                                        />

                                        {isJoined && (
                                            <button
                                                type="button"
                                                onClick={() => setIsReplying(prev => !prev)}
                                                className={actionLinkClasses}
                                            >
                                                Reply
                                            </button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={actionLinkClasses}
                                                    aria-label="More comment actions"
                                                >
                                                    <DotsThree size={14} weight="bold" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-28">
                                                <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                                                    Share
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                                                    Report
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                ) : (
                                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                        Moderation hold
                                    </span>
                                )}
                            </div>

                            {!isRemoved && isReplying && isJoined && currentUser && (
                                <form
                                    onSubmit={handleReplySubmit}
                                    className="mt-3 overflow-hidden border border-zinc-200/80 dark:border-zinc-800"
                                >
                                    <textarea
                                        autoFocus
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="min-h-[84px] w-full resize-none border-0 bg-transparent px-3.5 py-3 text-[14px] leading-6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                        disabled={isSubmitting}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                const form = e.currentTarget.closest('form');
                                                form?.requestSubmit();
                                            }
                                        }}
                                    />
                                    <div className="flex items-center justify-between border-t border-zinc-200/80 px-3.5 py-2.5 dark:border-zinc-800/80">
                                        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                                            Press Enter to reply, Shift + Enter for newline.
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setIsReplying(false);
                                                    setReplyContent('');
                                                }}
                                                className="h-8 px-3 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={!replyContent.trim() || isSubmitting}
                                                size="sm"
                                                className="h-8 bg-zinc-950 px-3.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                                            >
                                                {isSubmitting ? 'Replying...' : 'Reply'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {replies.length > 0 && (
                <div className="space-y-0">
                    {replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            postId={postId}
                            circleSlug={circleSlug}
                            currentUser={currentUser}
                            isJoined={isJoined}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}
