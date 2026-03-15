'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX_POST_LENGTH = 10_000;
const MAX_COMMENT_LENGTH = 5_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
    return UUID_REGEX.test(id);
}

export async function createCirclePost(circleId: string, content: string, circleSlug: string) {
    if (!isValidUUID(circleId)) {
        return { success: false, error: 'Invalid circle ID' };
    }
    if (!content.trim()) {
        return { success: false, error: 'Content cannot be empty' };
    }
    if (content.length > MAX_POST_LENGTH) {
        return { success: false, error: `Post must be under ${MAX_POST_LENGTH.toLocaleString()} characters.` };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to post' };
        }

        const { data, error } = await supabase
            .from('circle_posts')
            .insert({
                circle_id: circleId,
                author_id: user.id,
                content: content.trim()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating post:', error);
            // Check for RLS policy violation which means they aren't a member
            if (error.code === '42501') {
                return { success: false, error: 'You must join this circle to post' };
            }
            return { success: false, error: 'Failed to create post. Please try again.' };
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true, data };

    } catch (error) {
        console.error('Exception creating post:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function createCircleComment(postId: string, content: string, circleSlug: string, parentId?: string) {
    if (!isValidUUID(postId) || (parentId && !isValidUUID(parentId))) {
        return { success: false, error: 'Invalid ID' };
    }
    if (!content.trim()) {
        return { success: false, error: 'Comment cannot be empty' };
    }
    if (content.length > MAX_COMMENT_LENGTH) {
        return { success: false, error: `Comment must be under ${MAX_COMMENT_LENGTH.toLocaleString()} characters.` };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to comment' };
        }

        const { data, error } = await supabase
            .from('circle_comments')
            .insert({
                post_id: postId,
                author_id: user.id,
                content: content.trim(),
                ...(parentId ? { parent_id: parentId } : {})
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating comment:', error);
            if (error.code === '42501') {
                return { success: false, error: 'You must join this circle to comment' };
            }
            return { success: false, error: 'Failed to add comment. Please try again.' };
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true, data };

    } catch (error) {
        console.error('Exception creating comment:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function votePost(postId: string, voteType: 1 | -1 | 0, circleSlug: string) {
    if (!isValidUUID(postId)) {
        return { success: false, error: 'Invalid post ID' };
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to vote' };
        }

        if (voteType === 0) {
            // Remove vote
            const { error } = await supabase
                .from('circle_post_votes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);
            
            if (error) {
                console.error('Error removing vote on post:', error);
                return { success: false, error: 'Failed to remove vote' };
            }
        } else {
            // Upsert vote
            const { error } = await supabase
                .from('circle_post_votes')
                .upsert({
                    post_id: postId,
                    user_id: user.id,
                    vote_type: voteType
                }, { onConflict: 'user_id,post_id' });

            if (error) {
                console.error('Error voting on post:', error);
                if (error.code === '42501') {
                    return { success: false, error: 'You must join this circle to vote' };
                }
                return { success: false, error: 'Failed to record vote' };
            }
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true };

    } catch (error) {
        console.error('Exception voting on post:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function voteComment(commentId: string, voteType: 1 | -1 | 0, circleSlug: string) {
    if (!isValidUUID(commentId)) {
        return { success: false, error: 'Invalid comment ID' };
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to vote' };
        }

        if (voteType === 0) {
            // Remove vote
            const { error } = await supabase
                .from('circle_comment_votes')
                .delete()
                .eq('comment_id', commentId)
                .eq('user_id', user.id);
            
            if (error) {
                console.error('Error removing vote on comment:', error);
                return { success: false, error: 'Failed to remove vote' };
            }
        } else {
            // Upsert vote
            const { error } = await supabase
                .from('circle_comment_votes')
                .upsert({
                    comment_id: commentId,
                    user_id: user.id,
                    vote_type: voteType
                }, { onConflict: 'user_id,comment_id' });

            if (error) {
                console.error('Error voting on comment:', error);
                if (error.code === '42501') {
                    return { success: false, error: 'You must join this circle to vote' };
                }
                return { success: false, error: 'Failed to record vote' };
            }
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true };

    } catch (error) {
        console.error('Exception voting on comment:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function editCirclePost(postId: string, content: string, circleSlug: string) {
    if (!isValidUUID(postId)) {
        return { success: false, error: 'Invalid post ID' };
    }
    if (!content.trim()) {
        return { success: false, error: 'Content cannot be empty' };
    }
    if (content.length > MAX_POST_LENGTH) {
        return { success: false, error: `Post must be under ${MAX_POST_LENGTH.toLocaleString()} characters.` };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to edit' };
        }

        const { data, error } = await supabase
            .from('circle_posts')
            .update({ content: content.trim() })
            .eq('id', postId)
            .eq('author_id', user.id) // Extra safety, RLS handles this too
            .select()
            .single();

        if (error) {
            console.error('Error editing post:', error);
            return { success: false, error: 'Failed to edit post. You may not have permission.' };
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true, data };

    } catch (error) {
        console.error('Exception editing post:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function deleteCirclePost(postId: string, circleSlug: string) {
    if (!isValidUUID(postId)) {
        return { success: false, error: 'Invalid post ID' };
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to delete' };
        }

        const { error } = await supabase
            .from('circle_posts')
            .delete()
            .eq('id', postId)
            .eq('author_id', user.id); // Extra safety, RLS handles this too

        if (error) {
            console.error('Error deleting post:', error);
            return { success: false, error: 'Failed to delete post. You may not have permission.' };
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true };

    } catch (error) {
        console.error('Exception deleting post:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function editCircleComment(commentId: string, content: string, circleSlug: string) {
    if (!isValidUUID(commentId)) {
        return { success: false, error: 'Invalid comment ID' };
    }
    if (!content.trim()) {
        return { success: false, error: 'Content cannot be empty' };
    }
    if (content.length > MAX_COMMENT_LENGTH) {
        return { success: false, error: `Comment must be under ${MAX_COMMENT_LENGTH.toLocaleString()} characters.` };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to edit' };
        }

        const { data, error } = await supabase
            .from('circle_comments')
            .update({ content: content.trim() })
            .eq('id', commentId)
            .eq('author_id', user.id) // Extra safety, RLS handles this too
            .select()
            .single();

        if (error) {
            console.error('Error editing comment:', error);
            return { success: false, error: 'Failed to edit comment. You may not have permission.' };
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true, data };

    } catch (error) {
        console.error('Exception editing comment:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function deleteCircleComment(commentId: string, circleSlug: string) {
    if (!isValidUUID(commentId)) {
        return { success: false, error: 'Invalid comment ID' };
    }
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'You must be logged in to delete' };
        }

        const { error } = await supabase
            .from('circle_comments')
            .delete()
            .eq('id', commentId)
            .eq('author_id', user.id); // Extra safety, RLS handles this too

        if (error) {
            console.error('Error deleting comment:', error);
            return { success: false, error: 'Failed to delete comment. You may not have permission.' };
        }

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true };

    } catch (error) {
        console.error('Exception deleting comment:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
}
