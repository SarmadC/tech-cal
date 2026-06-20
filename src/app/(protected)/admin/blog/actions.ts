'use server';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { requireAdmin } from '@/lib/adminAuth';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { imageExtFromMimeType } from '@/lib/storagePathUtils';

export type CreatePostState = {
    message?: string;
    error?: string;
    success?: boolean;
};

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeCtaEventId(rawValue: FormDataEntryValue | null): string | null {
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!value) return null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
        throw new Error('CTA Event ID must be a valid UUID.');
    }

    return value;
}

const BLOG_IMAGE_BUCKET = 'blog-images';
const BLOG_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const BLOG_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
]);

function normalizeImageUrl(rawValue: FormDataEntryValue | null): string | null {
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!value) return null;

    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Only http/https image URLs are allowed.');
        }
        return url.toString();
    } catch {
        throw new Error('Header image URL must be a valid absolute URL.');
    }
}

async function uploadHeaderImage(
    file: File,
    postId: string,
    adminClient: ReturnType<typeof createServiceClient>
): Promise<string> {
    if (!BLOG_IMAGE_MIME_TYPES.has(file.type)) {
        throw new Error('Invalid header image type. Allowed: JPEG, PNG.');
    }

    if (file.size > BLOG_IMAGE_MAX_SIZE) {
        throw new Error('Header image file size exceeds 5MB.');
    }

    const fileExt = imageExtFromMimeType(file.type);
    const fileName = `blog/${postId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await adminClient.storage
        .from(BLOG_IMAGE_BUCKET)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Failed to upload header image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminClient.storage
        .from(BLOG_IMAGE_BUCKET)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}

export async function createPost(prevState: CreatePostState, formData: FormData): Promise<CreatePostState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    try {
        await requireAdmin(user.id, supabase);
    } catch {
        return { error: 'Unauthorized: Admin access required' };
    }

    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const excerpt = formData.get('excerpt') as string;
    const content = formData.get('content') as string;
    const categoryName = formData.get('category') as string;
    const readTime = formData.get('readTime');
    const headerImageFile = formData.get('headerImageFile');

    if (!title || !slug || !content || !categoryName) {
        return { error: 'Missing required fields' };
    }

    try {
        // 1. Get or Create Category
        // Use service role client to bypass RLS for category creation
        const adminClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const postId = randomUUID();

        let categoryId;
        const { data: category } = await adminClient
            .from('post_categories')
            .select('id')
            .eq('name', categoryName)
            .single();

        if (category) {
            categoryId = category.id;
        } else {
            const { data: newCategory, error: catError } = await adminClient
                .from('post_categories')
                .insert({ 
                    name: categoryName, 
                    slug: categoryName.toLowerCase().replace(/ /g, '-') 
                })
                .select('id')
                .single();
            
            if (catError) throw new Error('Failed to create category: ' + catError.message);
            categoryId = newCategory.id;
        }

        let featuredImageUrl = normalizeImageUrl(formData.get('featuredImageUrl'));
        if (headerImageFile instanceof File && headerImageFile.size > 0) {
            featuredImageUrl = await uploadHeaderImage(headerImageFile, postId, adminClient);
        }
        const ctaEventId = normalizeCtaEventId(formData.get('ctaEventId'));

        if (ctaEventId) {
            const { data: linkedEvent, error: linkedEventError } = await adminClient
                .from('events')
                .select('id')
                .eq('id', ctaEventId)
                .single();

            if (linkedEventError || !linkedEvent) {
                throw new Error('Linked CTA event was not found.');
            }
        }

        // 2. Insert Post
        const { error: postError } = await supabase
            .from('posts')
            .insert({
                id: postId,
                title,
                slug,
                excerpt,
                content,
                status: 'published',
                author_id: user.id,
                category_id: categoryId,
                read_time_minutes: readTime ? parseInt(readTime as string) : 5,
                featured_image_url: featuredImageUrl,
                cta_event_id: ctaEventId,
                published_at: new Date().toISOString(),
            });

        if (postError) {
            console.error('Insert Error:', postError);
            throw new Error('Failed to create post: ' + postError.message);
        }

    } catch (error) {
        return { error: getErrorMessage(error) };
    }

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    return { success: true, message: 'Post created successfully!' };
}

export async function updatePost(id: string, prevState: CreatePostState, formData: FormData): Promise<CreatePostState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    try {
        await requireAdmin(user.id, supabase);
    } catch {
        return { error: 'Unauthorized: Admin access required' };
    }

    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const excerpt = formData.get('excerpt') as string || ''; // Optional now? We removed the field, but maybe backend still has column? It's fine to pass empty string.
    const content = formData.get('content') as string;
    const categoryName = formData.get('category') as string;
    const readTime = formData.get('readTime');
    const headerImageFile = formData.get('headerImageFile');

    if (!title || !slug || !content || !categoryName) {
        return { error: 'Missing required fields' };
    }

    try {
        const adminClient = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        // 1. Get or Create Category
        let categoryId;
        const { data: category } = await supabase
            .from('post_categories')
            .select('id')
            .eq('name', categoryName)
            .single();

        if (category) {
            categoryId = category.id;
        } else {
            const { data: newCategory, error: catError } = await supabase
                .from('post_categories')
                .insert({ 
                    name: categoryName, 
                    slug: categoryName.toLowerCase().replace(/ /g, '-') 
                })
                .select('id')
                .single();
            
            if (catError) throw new Error('Failed to create category: ' + catError.message);
            categoryId = newCategory.id;
        }

        let featuredImageUrl = normalizeImageUrl(formData.get('featuredImageUrl'));
        if (headerImageFile instanceof File && headerImageFile.size > 0) {
            featuredImageUrl = await uploadHeaderImage(headerImageFile, id, adminClient);
        }
        const ctaEventId = normalizeCtaEventId(formData.get('ctaEventId'));

        if (ctaEventId) {
            const { data: linkedEvent, error: linkedEventError } = await adminClient
                .from('events')
                .select('id')
                .eq('id', ctaEventId)
                .single();

            if (linkedEventError || !linkedEvent) {
                throw new Error('Linked CTA event was not found.');
            }
        }

        // 2. Update Post
        const { error: postError } = await supabase
            .from('posts')
            .update({
                title,
                slug,
                excerpt, // keeping it, might be emtpy string
                content,
                category_id: categoryId,
                read_time_minutes: readTime ? parseInt(readTime as string) : 5,
                featured_image_url: featuredImageUrl,
                cta_event_id: ctaEventId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (postError) {
            console.error('Update Error:', postError);
            throw new Error('Failed to update post: ' + postError.message);
        }

    } catch (error) {
        return { error: getErrorMessage(error) };
    }

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    revalidatePath(`/admin/blog/${id}`);
    return { success: true, message: 'Post updated successfully!' };
}

export async function deletePost(id: string, _formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Not authenticated' };
    try {
        await requireAdmin(user.id, supabase);
    } catch {
        return { error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

    if (error) return { error: error.message };
    
    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    return { success: true };
}
