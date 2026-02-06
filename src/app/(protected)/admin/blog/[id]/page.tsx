import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import BlogPostForm from '@/components/admin/BlogPostForm';
import { updatePost } from '../actions';

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: post, error } = await supabase
        .from('posts')
        .select(`
            id,
            title,
            slug,
            content,
            read_time_minutes,
            post_categories (
                name
            )
        `)
        .eq('id', id)
        .single();

    if (error || !post) {
        notFound();
    }

    const initialData = {
        title: post.title,
        slug: post.slug,
        content: post.content || '',
        read_time_minutes: post.read_time_minutes || 5,
        // @ts-ignore
        category_name: post.post_categories?.name || ''
    };

    const updateAction = updatePost.bind(null, id);

    return (
        <div className="max-w-4xl mx-auto py-8 px-6">
            <h1 className="text-2xl font-bold text-white mb-8">Edit Blog Post</h1>
            <BlogPostForm
                action={updateAction}
                initialData={initialData}
                successMessage="Post updated successfully!"
            />
        </div>
    );
}
