import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { deletePost } from './actions';
import { MaterialIcon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export default async function AdminBlogListPage() {
    const supabase = await createClient();

    const { data: posts } = await supabase
        .from('posts')
        .select('id, title, slug, status, published_at')
        .order('published_at', { ascending: false });

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
                <Link
                    href="/admin/blog/new"
                    className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 font-medium py-2 px-4 rounded-md transition-colors"
                >
                    <MaterialIcon name="add" size={20} className="text-black" />
                    New Post
                </Link>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-950 text-zinc-200 font-medium">
                        <tr>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Published</th>

                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {posts?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                    No posts found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            posts?.map((post) => (
                                <tr key={post.id} className="hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{post.title}</div>
                                        <div className="text-xs text-zinc-500">/{post.slug}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${post.status === 'published'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                            }`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Link
                                                href={`/admin/blog/${post.id}`}
                                                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                                                title="Edit"
                                            >
                                                <MaterialIcon name="edit" size={18} />
                                            </Link>
                                            <form action={async () => {
                                                'use server';
                                                await deletePost(post.id, new FormData());
                                            }}>
                                                <button
                                                    type="submit"
                                                    className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <MaterialIcon name="delete" size={18} />
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
