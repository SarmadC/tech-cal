import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/utils/dateUtils';
import type { Metadata } from 'next';
import { ArticleJsonLd } from '@/components/seo';

// Revalidate every hour
export const revalidate = 3600;

type Post = {
    id: string;
    title: string;
    slug: string;
    content: string; // Assuming 'content' column exists
    excerpt: string | null;
    published_at: string | null;
    read_time_minutes: number | null;
    category: { name: string | null } | null;
    author: { full_name: string | null } | null;
};

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: post } = await supabase
        .from('posts')
        .select('title, excerpt')
        .eq('slug', slug)
        .single();

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    return {
        title: post.title,
        description: post.excerpt || 'Read the latest insights from the Kure-Cal blog on tech events, conferences, and developer growth.',
        openGraph: {
            title: post.title,
            description: post.excerpt || 'Read the latest insights from the Kure-Cal blog on tech events, conferences, and developer growth.',
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt || 'Read the latest insights from the Kure-Cal blog on tech events, conferences, and developer growth.',
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: post, error } = await supabase
        .from('posts')
        .select(`
            id,
            title,
            slug,
            content,
            excerpt,
            published_at,
            read_time_minutes,
            category: post_categories ( name ),
            author: profiles ( full_name )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (error || !post) {
        console.error('Error fetching post:', error);
        notFound();
    }

    return (
        <>
            <ArticleJsonLd
                title={post.title}
                description={post.excerpt || 'Read the latest insights from the Kure-Cal blog on tech events, conferences, and developer growth.'}
                publishedAt={post.published_at || new Date().toISOString()}
                authorName={post.author?.full_name || 'Kure-Cal Team'}
                slug={post.slug}
            />
            <main className="min-h-screen bg-[#090909] pt-24 pb-20">
                <article className="max-w-[800px] mx-auto px-6">
                    {/* Header */}
                    <div className="mb-12 text-center">
                        <div className="flex items-center justify-center gap-2 mb-6 text-sm">
                            <Link href="/blog" className="text-zinc-500 hover:text-white transition-colors">
                                Blog
                            </Link>
                            <span className="text-zinc-700">/</span>
                            <span className="text-zinc-300 font-medium">{post.category?.name}</span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-center space-x-4 text-sm text-zinc-400">
                            <span className="text-white">{post.author?.full_name}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span>{post.published_at ? formatDate(post.published_at) : ''}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span>{post.read_time_minutes} min read</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        className="prose prose-invert prose-zinc max-w-none 
                    prose-headings:font-semibold prose-headings:text-white 
                    prose-p:text-zinc-300 prose-p:leading-relaxed 
                    prose-a:text-white prose-a:underline hover:prose-a:text-zinc-200
                    prose-strong:text-white
                    prose-code:text-white prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-[#111] prose-pre:border prose-pre:border-white/10
                    prose-blockquote:border-l-4 prose-blockquote:border-zinc-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-400
                    prose-table:border-collapse prose-table:w-full
                    prose-th:border prose-th:border-zinc-700 prose-th:bg-zinc-800/50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                    prose-td:border prose-td:border-zinc-700 prose-td:px-4 prose-td:py-2
                    [&_mark]:bg-yellow-500/30 [&_mark]:text-yellow-200 [&_mark]:px-0.5 [&_mark]:rounded
                    [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-4"
                        dangerouslySetInnerHTML={{ __html: post.content || '' }}
                    />

                    {/* Back Link */}
                    <div className="mt-16 pt-8 border-t border-white/10 text-center">
                        <Link
                            href="/blog"
                            className="inline-flex items-center text-zinc-400 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Blog
                        </Link>
                    </div>
                </article>
            </main>
        </>
    );
}
