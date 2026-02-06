import BlogPostForm from '@/components/admin/BlogPostForm';
import { createPost } from '../actions';

export default function NewBlogPage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-6">
            <h1 className="text-2xl font-bold text-white mb-8">Write New Blog Post</h1>
            <BlogPostForm
                action={createPost}
                successMessage="Post created successfully!"
            />
        </div>
    );
}
