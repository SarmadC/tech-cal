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
            <main className="min-h-screen bg-[#0B0C0E] relative overflow-hidden pt-32 pb-24">
                {/* Top Glow Effect */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] opacity-30 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at 50% 0%, #7877C6 0%, transparent 60%)',
                        filter: 'blur(80px)',
                    }}
                />
                <article className="max-w-[680px] mx-auto px-6">
                    {/* Header - Left aligned, focused document style */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-8">
                            <Link href="/blog" className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7.25h8.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" clipRule="evenodd" />
                                </svg>
                            </Link>
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium text-[#8A8F98]">
                                <span>Blog</span>
                                <span className="text-zinc-700">/</span>
                                <span className="px-2 py-0.5 rounded-full border border-white/[0.08] text-[#EDEDEF]">
                                    {post.category?.name}
                                </span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-8 leading-[1.1] tracking-tighter pb-1">
                            {post.title}
                        </h1>

                        <div className="flex items-center space-x-4 text-xs font-mono text-[#8A8F98]/90">
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10" />
                                <span className="text-zinc-400 font-medium">{post.author?.full_name}</span>
                            </div>
                            <span className="text-zinc-700">|</span>
                            <span className="text-zinc-400">{post.published_at ? formatDate(post.published_at) : ''}</span>
                        </div>
                    </div>

                    {post.featured_image_url && (
                        <div className="mb-12 relative aspect-[16/9] rounded-lg overflow-hidden bg-[#0B0C0E] border border-white/[0.1] shadow-2xl shadow-black/50">
                            <Image
                                src={post.featured_image_url}
                                alt={post.title || 'Blog header image'}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div
                        className="prose prose-invert prose-zinc max-w-none 
                    prose-headings:font-semibold prose-headings:text-[#EDEDEF] prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/[0.08] prose-h2:pb-2
                    prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-h3:font-medium
                    prose-p:text-[#B4B8C0] prose-p:leading-7 prose-p:mb-5 prose-p:text-[15px]
                    prose-a:text-[#EDEDEF] prose-a:underline hover:prose-a:text-white prose-a:decoration-white/30 prose-a:underline-offset-2
                    prose-strong:text-[#EDEDEF] prose-strong:font-medium
                    prose-code:text-[#EDEDEF] prose-code:bg-white/[0.04] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[13px] prose-code:border prose-code:border-white/[0.08]
                    prose-pre:bg-[#0F1012] prose-pre:border prose-pre:border-white/[0.08] prose-pre:rounded-lg
                    prose-blockquote:border-l-2 prose-blockquote:border-white/20 prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-[#8A8F98]
                    prose-ul:text-[#B4B8C0] prose-ol:text-[#B4B8C0]
                    prose-li:marker:text-zinc-600
                    prose-img:rounded-lg prose-img:border prose-img:border-white/[0.08]
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-8 [&_table]:text-sm [&_table]:table-fixed
                    [&_col:first-child]:!w-[180px] [&_col:first-child]:!min-w-[180px] [&_col:first-child]:!max-w-[180px]
                    [&_thead]:border-b [&_thead]:border-white/[0.08]
                    [&_th]:text-left [&_th]:py-3 [&_th]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:font-medium [&_th]:text-[#8A8F98] [&_th]:bg-transparent [&_th]:border-0 [&_th]:align-top first:[&_th]:!w-[180px] first:[&_th]:!min-w-[180px] first:[&_th]:!max-w-[180px]
                    [&_td]:py-3 [&_td]:px-4 [&_td]:border-b [&_td]:border-white/[0.04] [&_td]:text-[#EDEDEF] [&_td]:bg-transparent [&_td]:align-top first:[&_td]:text-[#9CA3AF] first:[&_td]:font-normal first:[&_td]:!w-[180px] first:[&_td]:!min-w-[180px] first:[&_td]:!max-w-[180px] first:[&_td]:border-0 [&_td:last-child]:border-0
                    [&_tr]:border-b [&_tr]:border-white/[0.04] last:[&_tr]:border-0
                    [&_tr:hover]:bg-transparent
                    [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-8"
                        dangerouslySetInnerHTML={{
                            __html: (post.content || '')
                                .replace(/5 W&#39;s|5 W's/g, 'Property')
                                .replace(/Details/g, 'Value')
                        }}
                    />

                    {/* CTA Section - Card Style */}
                    <div className="mt-20 pt-8 border-t border-white/5">
                        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-8 hover:border-white/10 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2">{ctaEyebrow}</p>
                                    <h3 className="text-xl font-medium text-white mb-2">{ctaTitle}</h3>
                                    <p className="text-sm text-zinc-400 max-w-sm">{ctaSubtitle}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <Link
                                        href={ctaPrimaryHref}
                                        className="h-10 px-4 inline-flex items-center justify-center rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                                    >
                                        {ctaPrimaryLabel}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Back Link */}
                    <div className="mt-16 text-center">
                        <Link
                            href="/blog"
                            className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to all posts
                        </Link>
                    </div>
                </article>
            </main>
        </>
    );
}
