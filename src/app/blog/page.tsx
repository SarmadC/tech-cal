// src/app/blog/page.tsx
// ISR for blog page - revalidate every hour for fresh content
export const revalidate = 3600; // 1 hour

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/config/site';

export const metadata: Metadata = {
    title: 'Tech Events Insights, Tutorials, and News',
    description: 'Stay informed with the Kure-Cal blog. Insights, tutorials, and news from the tech events world. Learn about conferences, developer meetups, and industry trends.',
    keywords: ['tech blog', 'developer news', 'conference insights', 'tech events blog', 'programming tutorials'],
    openGraph: {
        title: 'Tech Events Insights, Tutorials, and News | Kure-Cal',
        description: 'Stay informed with insights, tutorials, and news from the tech events world.',
        type: 'website',
        images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Tech Events Insights, Tutorials, and News | Kure-Cal',
        description: 'Stay informed with insights, tutorials, and news from the tech events world.',
        images: [`${SITE_URL}/og-image.png`],
    },
};
import Image from 'next/image';
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
    featured_image_url: string | null;
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
            featured_image_url,
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
        <main id="main-content" className="min-h-screen bg-[#0B0C0E] relative overflow-hidden pt-32 pb-24">
            {/* Top Glow Effect */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] opacity-30 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 0%, #7877C6 0%, transparent 60%)',
                    filter: 'blur(80px)',
                }}
            />
            <div className="max-w-[1240px] mx-auto px-6">

                {/* Header - Minimal and Clean */}
                <header className="mb-20">
                    <h1 className="text-4xl md:text-5xl font-medium text-[#EDEDEF] mb-4 tracking-tight">Writing</h1>
                    <p className="text-lg text-[#8A8F98] max-w-2xl leading-relaxed">
                        Thoughts, strategies, and insights on developer marketing, events, and community growth.
                    </p>
                </header>

                <BlogFilters categories={categories} />

                {/* Featured Post - Layout inspired by Linear's big featured cards */}
                {featuredPost && selectedCategory === 'All' && !searchTerm && (
                    <div className="mb-24">
                        <Link href={`/blog/${featuredPost.slug}`} className="group block">
                            <article className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                                {/* Image First on Mobile, Right on Desktop */}
                                <div className="order-2 md:order-last relative aspect-[16/10] md:aspect-auto md:h-[500px] w-full bg-[#0B0C0E] rounded-xl overflow-hidden border border-white/[0.08] group-hover:border-white/[0.16] transition-colors duration-300">
                                    <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    {featuredPost.featured_image_url ? (
                                        <Image
                                            src={featuredPost.featured_image_url}
                                            alt={featuredPost.title || 'Blog header image'}
                                            fill
                                            sizes="(min-width: 768px) 50vw, 100vw"
                                            className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                                            priority
                                        />
                                    ) : (
                                        <GeometricPattern variant="mixed" />
                                    )}
                                </div>

                                <div className="flex flex-col justify-center order-1 md:order-first">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                                            {featuredPost.category?.name || 'Insight'}
                                        </div>
                                        <span className="text-xs text-[#575B66]">
                                            {featuredPost.published_at ? formatDate(featuredPost.published_at) : ''}
                                        </span>
                                    </div>

                                    <h2 className="text-3xl md:text-5xl font-medium text-[#EDEDEF] mb-6 leading-[1.1] tracking-tight group-hover:text-white transition-colors">
                                        {featuredPost.title}
                                    </h2>

                                    <p className="text-lg text-[#8A8F98] leading-relaxed mb-8 line-clamp-3">
                                        {featuredPost.excerpt}
                                    </p>

                                    <div className="flex items-center text-sm font-medium text-[#EDEDEF] group-hover:text-white transition-colors">
                                        Read post
                                        <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    </div>
                )}

                {/* Post Grid */}
                <h2 className="sr-only">All Posts</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                        <Link href={`/blog/${post.slug}`} key={post.id} className="group block h-full">
                            <article className="flex flex-col h-full">
                                {/* Image Area */}
                                <div className="aspect-[16/10] w-full relative bg-[#0B0C0E] rounded-lg overflow-hidden border border-white/[0.08] mb-6 group-hover:border-white/[0.16] transition-colors duration-300">
                                    <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                    {post.featured_image_url ? (
                                        <Image
                                            src={post.featured_image_url}
                                            alt={post.title || 'Blog header image'}
                                            fill
                                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                            className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                                        />
                                    ) : (
                                        <GeometricPattern variant={getVariantForId(post.id)} />
                                    )}
                                </div>

                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-medium text-[#575B66] group-hover:text-[#8A8F98] transition-colors">
                                            {post.category?.name || 'Article'}
                                        </span>
                                        <span className="text-xs text-[#575B66]">
                                            {post.published_at ? formatDate(post.published_at) : ''}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-medium text-[#EDEDEF] mb-3 group-hover:text-white transition-colors leading-snug tracking-tight">
                                        {post.title}
                                    </h3>

                                    <p className="text-sm text-[#8A8F98] line-clamp-2 leading-relaxed">
                                        {post.excerpt}
                                    </p>
                                </div>
                            </article>
                        </Link>
                    )) : (
                        <div className="col-span-full py-32 text-center border-t border-white/[0.08]">
                            <p className="text-[#8A8F98]">No posts found matching your criteria.</p>
                            <Link
                                href="/blog"
                                className="mt-4 inline-block text-sm text-[#EDEDEF] hover:text-white hover:underline transition-colors"
                            >
                                Clear filters
                            </Link>
                        </div>
                    )}
                </div>

                {/* Subscribe Section - Clean footer style */}
                <div className="mt-32 pt-16 border-t border-white/[0.08]">
                    <SubscribeForm />
                </div>

            </div>
        </main>
    );
}
