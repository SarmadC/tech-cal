'use server';

import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type CreatePostState = {
    message?: string;
    error?: string;
    success?: boolean;
};

export async function createPost(prevState: CreatePostState, formData: FormData): Promise<CreatePostState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    try {
        await requireAdmin(user.id, supabase);
    } catch (error) {
        return { error: 'Unauthorized: Admin access required' };
    }

    const title = formData.get('title') as string;
    const slug = formData.get('slug') as string;
    const excerpt = formData.get('excerpt') as string;
    const content = formData.get('content') as string;
    const categoryName = formData.get('category') as string;
    const readTime = formData.get('readTime');

    if (!title || !slug || !content || !categoryName) {
        return { error: 'Missing required fields' };
    }

    try {
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

        // 2. Insert Post
        const { error: postError } = await supabase
            .from('posts')
            .insert({
                title,
                slug,
                excerpt,
                content,
                status: 'published',
                author_id: user.id,
                category_id: categoryId,
                read_time_minutes: readTime ? parseInt(readTime as string) : 5,
                published_at: new Date().toISOString(),
            });

        if (postError) {
            console.error('Insert Error:', postError);
            throw new Error('Failed to create post: ' + postError.message);
        }

    } catch (e: any) {
        return { error: e.message };
    }

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    return { success: true, message: 'Post created successfully!' };
}
