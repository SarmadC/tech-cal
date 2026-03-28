'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { CommunityModerationService } from '@/services/communityModerationService';

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

        const data = await CommunityMutationsService.createPost(
            user.id,
            {
                circleId,
                circleSlug,
                content: content.trim(),
            },
            supabase
        );

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true, data };

    } catch (error) {
        console.error('Exception creating post:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
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

        const data = await CommunityMutationsService.createComment(
            user.id,
            {
                postId,
                circleSlug,
                content: content.trim(),
                ...(parentId ? { parentId } : {}),
            },
            supabase
        );

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true, data };

    } catch (error) {
        console.error('Exception creating comment:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
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

        await CommunityMutationsService.submitVote(
            user.id,
            {
                entityType: 'post',
                entityId: postId,
                circleSlug,
                voteType,
            },
            supabase
        );

        revalidatePath(`/circle/${circleSlug}`);
        return { success: true };

    } catch (error) {
        console.error('Exception voting on post:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
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

        await CommunityMutationsService.submitVote(
            user.id,
            {
                entityType: 'comment',
                entityId: commentId,
                circleSlug,
                voteType,
            },
            supabase
        );

        revalidatePath(`/circle/${circleSlug}`, 'layout');
        return { success: true };

    } catch (error) {
        console.error('Exception voting on comment:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
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

        await CommunityModerationService.assertUserCanParticipate(user.id, supabase);

        const { data, error } = await supabase
            .from('circle_posts')
            .update({ content: content.trim() })
            .eq('id', postId)
            .eq('moderation_status', 'active')
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
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
    }
}

export async function deleteCirclePost(postId: string, circleSlug: string, redirectTo?: string) {
    if (!isValidUUID(postId)) {
        return { success: false, error: 'Invalid post ID' };
    }

    let didDelete = false;
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

        revalidatePath(`/circle/${circleSlug}`);
        didDelete = true;

    } catch (error) {
        console.error('Exception deleting post:', error);
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
    }

    if (didDelete && redirectTo) {
        redirect(redirectTo);
    }

    return { success: true };
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

        await CommunityModerationService.assertUserCanParticipate(user.id, supabase);

        const { data, error } = await supabase
            .from('circle_comments')
            .update({ content: content.trim() })
            .eq('id', commentId)
            .eq('moderation_status', 'active')
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
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
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
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' };
    }
}
