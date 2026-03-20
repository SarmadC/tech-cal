'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { PaperPlaneRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { createCirclePost } from '@/app/circle/[slug]/discussions/actions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { cn } from '@/lib/utils';
import Avatar from './Avatar';

interface CreatePostProps {
    circleId: string;
    circleSlug: string;
    currentUser: {
        id: string;
        fullName?: string | null;
        avatarUrl?: string | null;
    };
}

export default function CreatePost({ circleId, circleSlug, currentUser }: CreatePostProps) {
    const [content, setContent] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { showSuccess, showError } = useSnackbar();

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.max(24, scrollHeight)}px`;
        }
    }, [content]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await createCirclePost(circleId, content, circleSlug);

            if (result.success) {
                setContent('');
                setIsFocused(false);
                if (textareaRef.current) textareaRef.current.blur();
                showSuccess('Post added successfully');
            } else {
                showError(result.error || 'Failed to create post');
            }
        } catch {
            showError('Failed to create post');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isExpanded = isFocused || Boolean(content.trim());

    return (
        <form onSubmit={handleSubmit} className="mb-6">
            <div
                className={cn(
                    'border border-zinc-200/80 bg-zinc-50/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-[border-radius,padding,background-color,border-color] duration-200 dark:border-zinc-800/80 dark:bg-zinc-950/35 dark:shadow-none',
                    isExpanded ? 'rounded-[22px] px-4 py-3.5 sm:px-5 sm:py-4' : 'rounded-full px-3 py-2.5'
                )}
            >
                {isExpanded && (
                    <div className="mb-2.5 flex items-center gap-2.5">
                        <Avatar
                            name={currentUser.fullName}
                            avatarUrl={currentUser.avatarUrl}
                            size="sm"
                        />
                        <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                            Start a thread
                        </p>
                    </div>
                )}

                <div className={cn('flex gap-2.5', isExpanded ? 'items-start' : 'items-center')}>
                    {!isExpanded && (
                        <Avatar
                            name={currentUser.fullName}
                            avatarUrl={currentUser.avatarUrl}
                            size="sm"
                        />
                    )}

                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                e.currentTarget.form?.requestSubmit();
                            }
                        }}
                        placeholder={isExpanded ? 'What do you want to discuss?' : 'What do you want to discuss?'}
                        className={cn(
                            'block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 shadow-none dark:text-zinc-100 dark:placeholder:text-zinc-500',
                            isExpanded
                                ? 'min-h-[92px] text-[15px] leading-7'
                                : 'h-6 flex-1 text-[14px] leading-6'
                        )}
                        disabled={isSubmitting}
                        rows={isExpanded ? 4 : 1}
                        style={{ minHeight: isExpanded ? '92px' : '24px', lineHeight: isExpanded ? '28px' : '24px' }}
                    />

                    {!isExpanded && (
                        <Button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            size="sm"
                            aria-label={isSubmitting ? 'Posting thread' : 'Post thread'}
                            className="h-7 rounded-full bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-40"
                        >
                            {isSubmitting ? 'Posting' : 'Post'}
                        </Button>
                    )}
                </div>

                {isExpanded && (
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-800/80 md:justify-between">
                        <span className="hidden text-[12px] text-zinc-500 dark:text-zinc-400 md:inline">
                            Cmd/Ctrl + Enter to post your thread
                        </span>

                        <Button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            size="sm"
                            aria-label={isSubmitting ? 'Posting thread' : 'Post thread'}
                            className="h-9 w-9 rounded-full bg-zinc-900 px-0 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50"
                        >
                            <PaperPlaneRight size={14} weight="fill" />
                            <span className="sr-only">
                                {isSubmitting ? 'Posting thread' : 'Post thread'}
                            </span>
                        </Button>
                    </div>
                )}
            </div>
        </form>
    );
}
