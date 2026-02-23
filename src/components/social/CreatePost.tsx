'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { createCirclePost } from '@/app/circle/[slug]/discussions/actions';
import { useSnackbar } from '@/contexts/SnackbarContext';

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

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '24px'; // Reset to min height
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
        <form onSubmit={handleSubmit} className="mb-8">
            <div
                className={`
                    transition-all duration-150
                    ${isExpanded
                        ? 'rounded-lg bg-zinc-50/85 dark:bg-zinc-900/60 ring-1 ring-zinc-200/70 dark:ring-zinc-700/80'
                        : 'rounded-lg bg-zinc-100/60 dark:bg-zinc-900/45'
                    }
                `}
            >
                <div
                    className={`
                        flex gap-3
                        ${isExpanded ? 'items-start px-3.5 pt-3' : 'items-center px-3 py-2'}
                    `}
                >
                    {currentUser.avatarUrl ? (
                        <div className="mt-0.5 flex-shrink-0">
                            <img
                                src={currentUser.avatarUrl}
                                alt={currentUser.fullName || 'User'}
                                className="h-7 w-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700/80"
                            />
                        </div>
                    ) : null}

                    <div className="flex-1 min-w-0">
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
                            placeholder="Start a discussion..."
                            className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-[1.55] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 shadow-none"
                            disabled={isSubmitting}
                            rows={1}
                            style={{ minHeight: isExpanded ? '28px' : '24px', lineHeight: '22px' }}
                        />
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-2 flex items-center justify-between px-3.5 pb-3">
                        <span className="hidden sm:inline text-[12px] text-zinc-500 dark:text-zinc-400">
                            Cmd/Ctrl + Enter to post
                        </span>

                        <Button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            size="sm"
                            className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-50"
                        >
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </Button>
                    </div>
                )}
            </div>
        </form>
    );
}
