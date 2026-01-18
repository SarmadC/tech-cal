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
import GeometricPattern from '@/components/blog/GeometricPattern';

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

type BlogPageProps = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Helper to reliably get a variant based on string hash
function getVariantForId(id: string): 'blue' | 'orange' | 'green' | 'purple' | 'mixed' {
    const variants = ['blue', 'orange', 'green', 'purple', 'mixed'] as const;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return variants[Math.abs(hash) % variants.length];
}

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
        <div className="min-h-screen bg-black pt-24 pb-20">

            {/* Header - Simpler and cleaner */}
            <section className="px-6 mb-12 hidden"> {/* Hidden as per design ref which starts immediately with content often, but keeping context if needed. Actually let's hide to match the 'clean' look or keep very minimal. */}
                <div className="max-w-[1240px] mx-auto">
                    <h1 className="text-4xl font-semibold text-white mb-2">Blog</h1>
                </div>
            </section>

            <section className="px-6">
                <div className="max-w-[1240px] mx-auto">

                    {/* Featured Post */}
                    {featuredPost && selectedCategory === 'All' && !searchTerm && (
                        <div className="mb-20">
                            <Link href={`/blog/${featuredPost.slug}`} className="group block">
                                <article className="relative bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300">
                                    <div className="grid md:grid-cols-12 min-h-[460px]">
                                        {/* Content Side */}
                                        <div className="md:col-span-5 p-8 md:p-14 flex flex-col justify-between relative z-10 bg-zinc-900">
                                            <div className="space-y-6">
                                                <span className="text-sm font-medium text-zinc-400 block">Insight</span>

                                                <h2 className="text-3xl md:text-5xl font-medium text-white group-hover:text-zinc-200 transition-colors leading-[1.1] tracking-tight">
                                                    {featuredPost.title}
                                                </h2>

                                                <p className="text-lg text-zinc-400 leading-relaxed line-clamp-3">
                                                    {featuredPost.excerpt}
                                                </p>
                                            </div>

                                            <div className="pt-8 mt-auto">
                                                <span className="text-zinc-500 text-sm">
                                                    {featuredPost.published_at ? formatDate(featuredPost.published_at) : ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Image/Pattern Side */}
                                        <div className="md:col-span-7 h-full relative min-h-[300px] md:min-h-full bg-zinc-800">
                                            <GeometricPattern variant="mixed" />
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        </div>
                    )}

                    {/* Subscribe Section - Now between Featured and Grid */}
                    <div className="mb-24 pt-8 pb-12 border-b border-white/5">
                        <SubscribeForm />
                    </div>

                    <BlogFilters categories={categories} />

                    {/* Post Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                        {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                            <Link href={`/blog/${post.slug}`} key={post.id} className="group block">
                                <article className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:bg-zinc-800/50 hover:border-white/10 transition-all duration-300 h-full flex flex-col">
                                    {/* Image Area */}
                                    <div className="aspect-[4/3] w-full relative bg-zinc-800 border-b border-white/5">
                                        <GeometricPattern variant={getVariantForId(post.id)} />
                                    </div>

                                    <div className="p-8 flex flex-col flex-1">
                                        <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-4">
                                            <span>Insight</span>
                                            <span>•</span>
                                            <span>{post.published_at ? formatDate(post.published_at) : ''}</span>
                                        </div>

                                        <h3 className="text-2xl font-medium text-white mb-4 group-hover:text-zinc-200 transition-colors leading-snug">
                                            {post.title}
                                        </h3>

                                        <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed mb-6">
                                            {post.excerpt}
                                        </p>
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

                </div>
            </section>
        </div>
    );
}