import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/utils/dateUtils';
import type { Metadata } from 'next';
import { ArticleJsonLd } from '@/components/seo';

// Revalidate every hour
export const revalidate = 3600;

type Props = {
    params: Promise<{ slug: string }>;
};

type CtaEvent = {
    id: string;
    title: string;
    slug: string | null;
    start_time: string | null;
    registration_url: string | null;
};

type BlogPostData = {
    id: string;
    title: string;
    slug: string;
    content: string | null;
    excerpt: string | null;
    featured_image_url: string | null;
    published_at: string | null;
    read_time_minutes: number | null;
    category: { name: string | null } | null;
    author: { full_name: string | null } | null;
    cta_event?: CtaEvent | CtaEvent[] | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: post } = await supabase
        .from('posts')
        .select('title, excerpt, featured_image_url')
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
            images: post.featured_image_url ? [post.featured_image_url] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt || 'Read the latest insights from the Kure-Cal blog on tech events, conferences, and developer growth.',
            images: post.featured_image_url ? [post.featured_image_url] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    const fullSelect = `
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image_url,
        cta_event_id,
        published_at,
        read_time_minutes,
        category: post_categories ( name ),
        author: profiles ( full_name ),
        cta_event: events!posts_cta_event_id_fkey (
            id,
            title,
            slug,
            start_time,
            registration_url
        )
    `;

    const legacySelect = `
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image_url,
        published_at,
        read_time_minutes,
        category: post_categories ( name ),
        author: profiles ( full_name )
    `;

    const fullResult = await supabase
        .from('posts')
        .select(fullSelect)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    const isCtaSchemaError = (message: string) =>
        message.includes('cta_event_id') || message.includes('posts_cta_event_id_fkey');

    let post: BlogPostData | null = fullResult.data as BlogPostData | null;
    let postError = fullResult.error;

    if (postError && isCtaSchemaError(postError.message || '')) {
        const legacyResult = await supabase
            .from('posts')
            .select(legacySelect)
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        post = legacyResult.data as BlogPostData | null;
        postError = legacyResult.error;
    }

    if (postError || !post) {
        notFound();
    }

    const ctaEventData = post.cta_event || null;
    const ctaEvent = Array.isArray(ctaEventData) ? ctaEventData[0] : ctaEventData;
    const ctaEyebrow = ctaEvent ? 'Recommended Event' : 'Next Step';
    const ctaTitle = ctaEvent ? ctaEvent.title : 'Discover events tailored to your career goals';
    const ctaSubtitle = ctaEvent?.start_time
        ? formatDate(ctaEvent.start_time)
        : 'Track the best conferences, meetups, and workshops in one place.';
    const ctaPrimaryHref = ctaEvent?.slug ? `/events/${ctaEvent.slug}` : '/events';
    const ctaPrimaryLabel = ctaEvent ? 'View Event Details' : 'Explore Events';

    return (
        <>
            <ArticleJsonLd
                title={post.title}
                description={post.excerpt || 'Read the latest insights from the Kure-Cal blog on tech events, conferences, and developer growth.'}
                publishedAt={post.published_at || new Date().toISOString()}
                authorName={post.author?.full_name || 'Kure-Cal Team'}
                slug={post.slug}
                imageUrl={post.featured_image_url || undefined}
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

                    {post.featured_image_url && (
                        <div className="mb-10 overflow-hidden rounded-2xl border border-white/10">
                            <Image
                                src={post.featured_image_url}
                                alt={post.title || 'Blog header image'}
                                width={1200}
                                height={630}
                                className="h-auto w-full object-cover"
                            />
                        </div>
                    )}

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

                    <section className="mt-12 rounded-2xl border border-white/10 bg-zinc-900/80 p-6">
                        <p className="text-xs uppercase tracking-wide text-zinc-400">{ctaEyebrow}</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">{ctaTitle}</h2>
                        <p className="mt-2 text-sm text-zinc-400">{ctaSubtitle}</p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <Link
                                href={ctaPrimaryHref}
                                className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
                            >
                                {ctaPrimaryLabel}
                            </Link>
                            {ctaEvent?.registration_url ? (
                                <a
                                    href={ctaEvent.registration_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                                >
                                    Register Now
                                </a>
                            ) : (
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                                >
                                    Create Free Account
                                </Link>
                            )}
                        </div>
                    </section>

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
