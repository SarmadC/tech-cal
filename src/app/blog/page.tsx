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
        <div className="min-h-screen bg-background-main pt-20">
            <section className="py-16 px-4 bg-background-secondary border-b border-border-color">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">TechCalendar Blog</h1>
                    <p className="text-xl text-foreground-secondary max-w-3xl">Stay informed with insights, tutorials, and news from the tech world.</p>
                </div>
            </section>

            <section className="py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <BlogFilters categories={categories} />

                    {featuredPost && selectedCategory === 'All' && !searchTerm && (
                        <div className="mb-12">
                            <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-8 text-white">
                                <div className="flex items-center space-x-2 mb-4">
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Featured</span>
                                    <span className="text-sm opacity-80">{featuredPost.category?.name}</span>
                                </div>
                                <h2 className="text-3xl font-bold mb-4">{featuredPost.title}</h2>
                                <p className="text-lg opacity-90 mb-6 line-clamp-2">{featuredPost.excerpt}</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 text-sm">
                                        <span>{featuredPost.author?.full_name}</span>
                                        <span className="opacity-60">•</span>
                                        {/* 3. Use the imported function with options to match original format */}
                                        <span>{featuredPost.published_at ? formatDate(featuredPost.published_at) : 'Date not available'}</span>
                                        <span className="opacity-60">•</span>
                                        <span>{featuredPost.read_time_minutes} min read</span>
                                    </div>
                                    <Link href={`/blog/${featuredPost.slug}`} className="bg-white text-accent-primary hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg transition-all">
                                        Read More
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.length > 0 ? filteredPosts.map((post) => (
                            <article key={post.id} className="bg-background-secondary rounded-xl border border-border-color overflow-hidden hover:border-accent-primary/30 transition-all group">
                                <div className="aspect-video bg-gradient-to-br from-gray-800/30 to-gray-600/20 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-background-tertiary" />
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center space-x-2 mb-3">
                                        <span className="text-xs font-medium text-accent-primary">{post.category?.name}</span>
                                        <span className="text-xs text-foreground-tertiary">•</span>
                                        <span className="text-xs text-foreground-tertiary">{post.read_time_minutes} min read</span>
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground-primary mb-3 group-hover:text-accent-primary transition-colors">
                                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                                    </h3>
                                    <p className="text-foreground-secondary mb-4 line-clamp-3">{post.excerpt}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-accent-primary/10 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-semibold text-accent-primary">
                                                    {getAuthorInitials(post.author)}
                                                </span>
                                            </div>
                                            <div className="text-sm">
                                                <p className="font-medium text-foreground-primary">{post.author?.full_name}</p>
                                                {/* 3. Use the imported function with options to match original format */}
                                                <p className="text-xs text-foreground-tertiary">{post.published_at ? formatDate(post.published_at) : 'Date not available'}</p>
                                            </div>
                                        </div>
                                        <Link href={`/blog/${post.slug}`} className="text-accent-primary hover:text-accent-primary-hover transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        )) : (
                            <p className="col-span-full text-center text-foreground-secondary">No posts found matching your criteria.</p>
                        )}
                    </div>
                    <div className="mt-16 bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-8 text-center text-white">
                        <SubscribeForm />
                    </div>
                </div>
            </section>
        </div>
    );
}