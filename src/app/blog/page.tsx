// src/app/blog/page.tsx
// ISR for blog page - revalidate every hour for fresh content
export const revalidate = 3600; // 1 hour

import Link from 'next/link';
import BlogFilters from './BlogFilters';
import { createClient } from '@/utils/supabase/server';
import { sanitizeFtsQuery } from '@/lib/securityUtils';
import SubscribeForm from './SubscribeForm';
// 1. Import the new date utility function
import { formatDate } from '@/utils/dateUtils';

type PostWithDetails = {
    id: string;
    title: string | null;
    slug: string | null;
    excerpt: string | null;
    published_at: string | null;
    read_time_minutes: number | null;
    category: { name: string | null } | null;
    author: { full_name: string | null } | null;
};

function getAuthorInitials(author: { full_name: string | null } | null): string {
    const name = author?.full_name;
    if (!name) return '??';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
}

type BlogPageProps = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
    const resolvedSearchParams = await searchParams;

    const supabase = await createClient();
    const searchTerm = (resolvedSearchParams?.q as string) || '';
    const selectedCategory = (resolvedSearchParams?.category as string) || 'All';

    const { data: categoriesData, error: categoriesError } = await supabase
        .from('post_categories')
        .select('name')
        .order('name');

    if (categoriesError) {
        console.error("Error fetching categories:", categoriesError.message);
    }
    const categories = ['All', ...(categoriesData?.map(c => c.name) || [])];

    // Main Query
    const postQuery = supabase
        .from('posts')
        .select(`
            id,
            title,
            slug,
            excerpt,
            published_at,
            read_time_minutes,
            category: post_categories ( name ),
            author: profiles ( full_name )
        `)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false });

    if (selectedCategory !== 'All') {
        postQuery.eq('category.name', selectedCategory);
    }

    if (searchTerm) {
        const sanitizedSearchTerm = sanitizeFtsQuery(searchTerm, ' | ');
        if (sanitizedSearchTerm) {
            postQuery.textSearch('fts', sanitizedSearchTerm, { type: 'plain', config: 'english' });
        }
    }

    const { data, error: postsError } = await postQuery;
    const filteredPosts: PostWithDetails[] = data || [];

    if (postsError) {
        console.error("Error fetching posts:", postsError.message);
    }

    // Featured Post (only show if no filters/search active)
    const { data: featuredPostData, error: featuredError } = await supabase
        .from('posts')
        .select(`*, category:post_categories(name), author:profiles(full_name)`)
        .eq('featured', true)
        .eq('status', 'published')
        .limit(1)
        .single();

    const featuredPost: PostWithDetails | null = featuredPostData;

    if (featuredError && featuredError.code !== 'PGRST116') {
        console.error("Error fetching featured post:", featuredError.message);
    }

    return (
        <div className="min-h-screen bg-[#090909] pt-24 pb-20">
            {/* Header */}
            <section className="px-6 mb-16">
                <div className="max-w-[1200px] mx-auto text-center">
                    <div className="inline-flex items-center justify-center px-3 py-1 mb-6 border border-white/10 rounded-full bg-white/5 backdrop-blur-sm">
                        <span className="text-xs font-medium text-white/80 tracking-wide uppercase">KureCal Blog</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-semibold text-white tracking-tight mb-6">
                        Insights & Updates
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Stay informed with the latest insights, tutorials, and news from the world of tech events.
                    </p>
                </div>
            </section>

            <section className="px-6">
                <div className="max-w-[1200px] mx-auto">

                    <BlogFilters categories={categories} />

                    {/* Featured Post */}
                    {featuredPost && selectedCategory === 'All' && !searchTerm && (
                        <div className="mb-16">
                            <Link href={`/blog/${featuredPost.slug}`} className="group block">
                                <article className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-8 md:p-12 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
                                    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
                                        <div className="flex-1 space-y-6">
                                            <div className="flex items-center space-x-3 text-sm">
                                                <span className="text-zinc-500">{featuredPost.category?.name}</span>
                                                <span className="text-zinc-700">•</span>
                                                <span className="text-zinc-500">{featuredPost.read_time_minutes} min read</span>
                                            </div>

                                            <h2 className="text-3xl md:text-4xl font-semibold text-white group-hover:text-white/90 transition-colors leading-tight">
                                                {featuredPost.title}
                                            </h2>

                                            <p className="text-lg text-zinc-400 leading-relaxed line-clamp-3">
                                                {featuredPost.excerpt}
                                            </p>

                                            <div className="flex items-center pt-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-medium text-white ring-2 ring-black">
                                                    {getAuthorInitials(featuredPost.author)}
                                                </div>
                                                <div className="ml-3 text-sm">
                                                    <span className="text-white block">{featuredPost.author?.full_name}</span>
                                                    <span className="text-zinc-500">{featuredPost.published_at ? formatDate(featuredPost.published_at) : ''}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Optional: Add an image placeholder or gradient generic here if desired, 
                                            but for 'Linear' style, text-heavy or subtle visuals are preferred. 
                                            Keeping it text-focused for now as per previous design but cleaner. 
                                        */}
                                        <div className="w-full md:w-1/3 aspect-video rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                                            <div className="text-white/20 italic">Featured Image</div>
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        </div>
                    )}

                    {/* Post Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                            <Link href={`/blog/${post.slug}`} key={post.id} className="group flex">
                                <article className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-medium text-zinc-500 px-2 py-1 rounded-md bg-white/5 border border-white/5">
                                            {post.category?.name}
                                        </span>
                                        <span className="text-xs text-zinc-600">
                                            {post.read_time_minutes} min
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-medium text-white mb-3 group-hover:text-zinc-200 transition-colors leading-snug">
                                        {post.title}
                                    </h3>

                                    <p className="text-sm text-zinc-400 mb-6 line-clamp-3 leading-relaxed flex-1">
                                        {post.excerpt}
                                    </p>

                                    <div className="flex items-center justify-between text-xs pt-4 border-t border-white/5 mt-auto">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-zinc-300">{post.author?.full_name}</span>
                                        </div>
                                        <span className="text-zinc-600">
                                            {post.published_at ? formatDate(post.published_at) : ''}
                                        </span>
                                    </div>
                                </article>
                            </Link>
                        )) : (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-zinc-500 text-lg">No posts found matching your criteria.</p>
                                <Link
                                    href="/blog"
                                    className="mt-4 inline-block text-sm text-white hover:underline"
                                >
                                    Clear filters
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Subscribe Section */}
                    <div className="mt-24 border-t border-white/10 pt-16 pb-8">
                        <div className="max-w-xl mx-auto text-center">
                            <SubscribeForm />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}