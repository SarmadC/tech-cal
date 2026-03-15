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
import Avatar, { getDisplayName } from './Avatar';
import VoteControls from './VoteControls';
import type { CircleDiscussionComment } from '@/types/circleDiscussions';

type CurrentUser = {
    id: string;
    avatarUrl?: string | null;
} | null;

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

    // Edit/Delete State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isEditingSubmit, setIsEditingSubmit] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showSuccess, showError } = useSnackbar();
    const router = useRouter();

    // Optimistic Voting State
    const [localScore, setLocalScore] = useState(comment.score || 0);
    const [localVote, setLocalVote] = useState(comment.userVote || 0);

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
        } catch (error) {
            showError('Failed to post reply');
            console.error(error);
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

    const isAuthor = Boolean(currentUser?.id && comment.author?.id && currentUser.id === comment.author.id);

    return (
        <article className="group/comment">
            <div className="flex items-start gap-3">
                <Avatar
                    name={comment.author?.full_name}
                    avatarUrl={comment.author?.avatar_url}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                            {getDisplayName(comment.author?.full_name)}
                        </span>

                        <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>

                        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>

                        {isAuthor && currentUser && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors opacity-0 group-hover/comment:opacity-100 focus:opacity-100"
                                            aria-label="Comment actions"
                                        >
                                            <DotsThree size={14} weight="bold" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-32">
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
                                                {isDeleting ? 'Deleting...' : 'Delete Comment'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full rounded-t-lg bg-transparent px-3 py-2 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none border-0 focus:ring-0 resize-none min-h-[70px]"
                                disabled={isEditingSubmit}
                                autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 border-t border-zinc-200/80 dark:border-zinc-700/80 px-3 py-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                                    disabled={isEditingSubmit}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleEditSubmit}
                                    disabled={!editContent.trim() || isEditingSubmit}
                                    className="h-7 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs"
                                >
                                    {isEditingSubmit ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.5] text-zinc-700 dark:text-zinc-300">
                            {comment.content}
                        </p>
                    )}

                    <div className="mt-2 flex items-center gap-4 text-[13px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                        <VoteControls
                            score={localScore}
                            vote={localVote}
                            onVote={handleVote}
                        />

                        {isJoined && (
                            <button
                                type="button"
                                onClick={() => setIsReplying(prev => !prev)}
                                className="inline-flex items-center leading-none hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                Reply
                            </button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center leading-none opacity-0 group-hover/comment:opacity-100 focus:opacity-100 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
                    </div>

                    {isReplying && isJoined && currentUser && (
                        <form
                            onSubmit={handleReplySubmit}
                            className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/60"
                        >
                            <textarea
                                autoFocus
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Reply..."
                                className="w-full rounded-t-lg bg-transparent px-3 py-2 text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none border-0 focus:ring-0 resize-none min-h-[68px]"
                                disabled={isSubmitting}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        const form = e.currentTarget.closest('form');
                                        form?.requestSubmit();
                                    }
                                }}
                            />
                            <div className="flex items-center justify-end gap-2 border-t border-zinc-200/80 dark:border-zinc-700/80 px-3 py-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsReplying(false);
                                        setReplyContent('');
                                    }}
                                    className="h-7 px-2.5 text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!replyContent.trim() || isSubmitting}
                                    size="sm"
                                    className="h-7 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs"
                                >
                                    {isSubmitting ? 'Replying...' : 'Reply'}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 ml-3 sm:ml-4 space-y-4">
                    {comment.replies.map(reply => (
                        <div
                            key={reply.id}
                            className="relative pl-4 sm:pl-5"
                        >
                            <span className="pointer-events-none absolute left-0 top-0 bottom-5 w-px bg-zinc-200/90 dark:bg-zinc-700/90" />
                            <CommentItem
                                comment={reply}
                                postId={postId}
                                circleSlug={circleSlug}
                                currentUser={currentUser}
                                isJoined={isJoined}
                                depth={depth + 1}
                            />
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}
