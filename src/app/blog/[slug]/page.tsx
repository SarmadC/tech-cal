import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/utils/dateUtils';
import type { Metadata } from 'next';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { EventService } from '@/services/eventServices';
import { EventAgendaTimeline } from '@/components/blog/EventAgendaTimeline';
import type { AgendaItem } from '@/types/events';

// Revalidate every hour
export const revalidate = 3600;

// Enable dynamic params with ISR - pages generated on-demand and cached
export const dynamicParams = true;

// Pre-render recent published posts at build time for faster TTFB
export async function generateStaticParams(): Promise<{ slug: string }[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return [];
    }

    const supabase = createServiceClient(supabaseUrl, serviceKey);

    const { data: posts } = await supabase
        .from('posts')
        .select('slug')
        .eq('status', 'published')
        .not('slug', 'is', null)
        .order('published_at', { ascending: false })
        .limit(30);

    return (posts || [])
        .filter((p): p is { slug: string } => p.slug !== null)
        .map((p) => ({ slug: p.slug }));
}

type Props = {
    params: Promise<{ slug: string }>;
};

type CtaEvent = {
    id: string;
    title: string;
    slug: string | null;
    start_time: string | null;
    registration_url: string | null;
    location: string | null;
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
        .select('title, excerpt, featured_image_url, published_at, updated_at, slug')
        .eq('slug', slug)
        .single();

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    const description = post.excerpt || 'Read the latest insights from the Kure-Cal blog covering tech events, developer conferences, meetups, and strategies for professional growth.';
    const ogImage = post.featured_image_url || '/og-image.png';

    return {
        title: post.title,
        description,
        alternates: {
            canonical: `https://kure-cal.com/blog/${slug}`,
        },
        openGraph: {
            title: post.title,
            description,
            type: 'article',
            images: [ogImage],
            ...(post.published_at && { publishedTime: post.published_at }),
            ...(post.updated_at && { modifiedTime: post.updated_at }),
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description,
            images: [ogImage],
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
            registration_url,
            location
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

    // Sidebar Content Logic
    const hasEvent = !!ctaEvent;
    const eventDate = ctaEvent?.start_time ? formatDate(ctaEvent.start_time) : null;
    const eventLink = ctaEvent?.slug ? `/events/${ctaEvent.slug}` : '/events';

    // Fetch agenda for CTA event if available
    let eventAgenda: AgendaItem[] = [];
    if (ctaEvent?.id) {
        try {
            const eventWithAgenda = await EventService.getEventWithAgenda(
                ctaEvent.id,
                supabase
            );
            eventAgenda = eventWithAgenda.agenda || [];
        } catch (error) {
            console.warn('Failed to fetch event agenda:', error);
        }
    }

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
            <BreadcrumbJsonLd items={[
                { name: 'Home', url: 'https://kure-cal.com' },
                { name: 'Blog', url: 'https://kure-cal.com/blog' },
                { name: post.title },
            ]} />
            <main id="main-content" className="min-h-screen bg-[#0B0C0E] relative overflow-hidden pt-32 pb-24">


                <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 xl:gap-24">

                        {/* Left Column: Article Content */}
                        <article className="max-w-3xl">
                            {/* Header */}
                            <div className="mb-12">
                                <div className="flex items-center gap-3 mb-8">
                                    <Link href="/blog" aria-label="Back to blog" className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7.25h8.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" clipRule="evenodd" />
                                        </svg>
                                    </Link>
                                    <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A8F98]">
                                        <span>Blog</span>
                                        <span className="text-zinc-700">/</span>
                                        <span className="px-2 py-0.5 rounded-full border border-white/[0.08] text-[#EDEDEF]">
                                            {post.category?.name}
                                        </span>
                                    </div>
                                </div>

                                <h1 className="text-4xl md:text-6xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-8 leading-[1.1] tracking-tighter pb-1">
                                    {post.title}
                                </h1>

                                <div className="flex items-center space-x-4 text-xs font-mono text-[#8A8F98]/90">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10" />
                                        <span className="text-zinc-400 font-medium">{post.author?.full_name}</span>
                                    </div>
                                    <span className="text-zinc-700">|</span>
                                    <span className="text-zinc-400">{post.published_at ? formatDate(post.published_at) : ''}</span>
                                    {post.read_time_minutes && (
                                        <>
                                            <span className="text-zinc-700">|</span>
                                            <span className="text-zinc-400">{post.read_time_minutes} min read</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {post.featured_image_url && (
                                <div className="mb-12 relative aspect-[16/9] rounded-lg overflow-hidden bg-[#0B0C0E] shadow-2xl shadow-black/50">
                                    <Image
                                        src={post.featured_image_url}
                                        alt={post.title || 'Blog header image'}
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div
                                className="prose prose-invert prose-zinc max-w-none 
                            prose-headings:font-semibold prose-headings:text-[#EDEDEF] prose-headings:tracking-tight
                            prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-white/[0.08] prose-h2:pb-3
                            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:font-medium
                            prose-p:text-[#B4B8C0] prose-p:leading-8 prose-p:mb-6 prose-p:text-[17px]
                            prose-a:text-[#EDEDEF] prose-a:underline hover:prose-a:text-white prose-a:decoration-white/30 prose-a:underline-offset-2
                            prose-strong:text-[#EDEDEF] prose-strong:font-medium
                            prose-code:text-[#EDEDEF] prose-code:bg-white/[0.04] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[14px] prose-code:border prose-code:border-white/[0.08]
                            prose-pre:bg-[#0F1012] prose-pre:border prose-pre:border-white/[0.08] prose-pre:rounded-lg
                            prose-blockquote:border-l-2 prose-blockquote:border-white/20 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[#8A8F98]
                            prose-ul:text-[#B4B8C0] prose-ol:text-[#B4B8C0]
                            prose-li:marker:text-zinc-600
                            prose-img:rounded-lg prose-img:border prose-img:border-white/[0.08]
                            [&_table]:w-full [&_table]:border-collapse [&_table]:my-8 [&_table]:text-sm [&_table]:table-fixed
                            [&_col:first-child]:!w-[180px] [&_col:first-child]:!min-w-[180px] [&_col:first-child]:!max-w-[180px]
                            [&_thead]:border-b [&_thead]:border-white/[0.08]
                            [&_th]:text-left [&_th]:py-3 [&_th]:px-4 [&_th]:text-[13px] [&_th]:font-medium [&_th]:text-[#8A8F98] [&_th]:bg-transparent [&_th]:border-0 [&_th]:align-top first:[&_th]:!w-[180px] first:[&_th]:!min-w-[180px] first:[&_th]:!max-w-[180px]
                            [&_td]:py-3 [&_td]:px-4 [&_td]:border-b [&_td]:border-white/[0.04] [&_td]:text-[#EDEDEF] [&_td]:bg-transparent [&_td]:align-top first:[&_td]:text-[#9CA3AF] first:[&_td]:font-normal first:[&_td]:!w-[180px] first:[&_td]:!min-w-[180px] first:[&_td]:!max-w-[180px] first:[&_td]:border-0 [&_td:last-child]:border-0
                            [&_tr]:border-b [&_tr]:border-white/[0.04] last:[&_tr]:border-0
                            [&_tr:hover]:bg-transparent
                            [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-8
                            [&_h2]:!pl-0 [&_h2]:!ml-0"
                                dangerouslySetInnerHTML={{
                                    __html: (post.content || '')
                                        .replace(/5 W&#39;s|5 W's/g, 'Property')
                                        .replace(/Details/g, 'Value')
                                }}
                            />
                        </article>

                        {/* Right Sidebar */}
                        <aside className="hidden lg:block pt-[180px]">
                            <div className="sticky top-32 flex flex-col">

                                {/* Event Card (if available) */}
                                {hasEvent && (
                                    <div className="pb-6 border-b border-white/[0.08]">
                                        <p className="text-[13px] text-[#8A8F98] font-medium mb-2">
                                            Featured event
                                        </p>
                                        <h3 className="text-[15px] font-medium text-[#EDEDEF] mb-1.5 leading-snug">
                                            {ctaEvent.title}
                                        </h3>
                                        {eventDate && (
                                            <div className="flex items-center gap-2 text-[13px] text-[#8A8F98] mb-4">
                                                {eventDate}
                                            </div>
                                        )}
                                        <Link
                                            href={eventLink}
                                            className="block w-full text-center py-2 px-3 rounded-md bg-white/[0.04] border border-white/[0.08] text-[#EDEDEF] text-[13px] font-medium hover:bg-white/[0.08] transition-colors shadow-sm"
                                        >
                                            View event details
                                        </Link>
                                    </div>
                                )}

                                {/* Event Agenda Timeline (if event has agenda) */}
                                {hasEvent && eventAgenda.length > 0 && ctaEvent.slug && (
                                    <EventAgendaTimeline
                                        agenda={eventAgenda}
                                        eventSlug={ctaEvent.slug}
                                        maxItems={5}
                                    />
                                )}

                                {/* Generic Callout if no event */}
                                {!hasEvent && (
                                    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/30 overflow-hidden backdrop-blur-sm p-5">
                                        <h3 className="text-base font-medium text-white mb-2">
                                            Discover More Events
                                        </h3>
                                        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                                            Find the best tech conferences and meetups curated for you.
                                        </p>
                                        <Link
                                            href="/events"
                                            className="block w-full text-center py-2.5 px-4 rounded-lg border border-white/[0.1] text-white text-sm font-medium hover:bg-white/[0.05] transition-colors"
                                        >
                                            Browse All Events
                                        </Link>
                                    </div>
                                )}

                                {/* Newsletter / Table of Contents placeholder could go here */}
                                <div className="pt-6">
                                    <p className="text-[13px] text-[#8A8F98] font-medium mb-2">
                                        Share this post
                                    </p>
                                    <div className="flex gap-2">
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://kure-cal.com/blog/${post.slug}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Share on X (Twitter)"
                                            className="p-2 rounded-md bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM16.482 19.333h1.833L7.084 4.126H5.117z"></path>
                                            </svg>
                                        </a>
                                        <a
                                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://kure-cal.com/blog/${post.slug}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Share on LinkedIn"
                                            className="p-2 rounded-md bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 22.227.792 23 1.771 23h20.451C23.2 23 24 22.227 24 21.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </>
    );
}
