import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/utils/dateUtils';
import type { Metadata } from 'next';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { EventService } from '@/services/eventServices';
import { EventAgendaTimeline } from '@/components/blog/EventAgendaTimeline';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { BlogShareButtons } from '@/components/blog/BlogShareButtons';
import {
    InteractiveBlogContent,
    type RoleFilter,
} from '@/components/blog/InteractiveBlogContent';
import type { AgendaItem } from '@/types/events';
import { SITE_URL } from '@/config/site';
import { sanitizeBlogHtml } from '@/lib/sanitizeHtml';
import * as cheerio from 'cheerio';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

export const revalidate = 3600;
export const dynamicParams = true;

const ROLE_FILTERS: RoleFilter[] = [
    { id: 'dev', label: 'Developer / Engineer', keywords: ['architecture', 'engineering', 'infrastructure', 'cloud', 'linux'] },
    { id: 'sec', label: 'Security / DevSecOps', keywords: ['cybersecurity', 'devsecops', 'threat', 'security'] },
    { id: 'ai', label: 'AI / Data', keywords: ['ai', 'generative', 'machine learning', 'pytorch', 'llm'] },
    { id: 'prod', label: 'Product / Experience', keywords: ['digital experience', 'product', 'marketing'] },
];

type PresentationMode = 'editorial' | 'event_guide';

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
    updated_at: string | null;
    read_time_minutes: number | null;
    category_id: string | null;
    category: { name: string | null } | null;
    author: { full_name: string | null } | null;
    cta_event?: CtaEvent | CtaEvent[] | null;
};

type RelatedPost = {
    id: string;
    title: string | null;
    slug: string | null;
    excerpt: string | null;
    featured_image_url: string | null;
    published_at: string | null;
    category: { name: string | null } | null;
    author: { full_name: string | null } | null;
};

type EventCardDescriptor = {
    eventId: string | null;
};

type ResolvedBlogEvent = {
    id: string;
    title: string;
    slug: string;
    start_time: string;
    location: string | null;
    event_image_url: string | null;
    organizer_logo_url: string | null;
    updated_at: string | null;
};

function withVersionParam(url: string, version: string | null) {
    if (!version) {
        return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(version)}`;
}

function postCategoryName(post: {
    post_categories?: { name?: string | null } | { name?: string | null }[] | null;
}) {
    if (!post.post_categories) {
        return 'Tech Events';
    }

    if (Array.isArray(post.post_categories)) {
        return post.post_categories[0]?.name || 'Tech Events';
    }

    return post.post_categories.name || 'Tech Events';
}

function extractEventMetadata(markup?: string | null) {
    if (!markup) {
        return null;
    }

    const normalizedMarkup = markup
        .replace(/<(p|div|li)\b[^>]*>/gi, '\n')
        .replace(/<\/(p|div|li)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n');

    const normalizedText = cheerio
        .load(normalizedMarkup, null, false)
        .text()
        .replace(/\s*(Date:|Dates:|Location:|Primary focus:)\s*/gi, '\n$1 ')
        .replace(/\n+/g, '\n');

    const lines = normalizedText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    let date = '';
    let location = '';
    let focus = '';

    lines.forEach((line) => {
        if (line.startsWith('Date:') || line.startsWith('Dates:')) {
            date = line.replace(/Dates?:/, '').trim();
        } else if (line.startsWith('Location:')) {
            location = line.replace(/Location:/, '').trim();
        } else if (line.startsWith('Primary focus:')) {
            focus = line.replace(/Primary focus:/, '').trim();
        }
    });

    if (!date && !location && !focus) {
        return null;
    }

    return { date, location, focus };
}

function inferPresentationMode(html: string): PresentationMode {
    const $ = cheerio.load(html, null, false);
    let eventMarkers = 0;

    // Check for new structured cards
    eventMarkers += $('div[data-event-card="true"]').length;

    // Check for legacy h3 + p metadata blocks
    $('h3').each((_, element) => {
        const metadata = extractEventMetadata($(element).next('p').html());
        if (metadata) {
            eventMarkers += 1;
        }
    });

    return eventMarkers >= 2 ? 'event_guide' : 'editorial';
}

function buildInteractiveHtml(html: string, presentationMode: PresentationMode) {
    if (presentationMode === 'editorial') {
        return {
            interactiveHtml: html,
            eventCards: [] as EventCardDescriptor[],
        };
    }

    const $ = cheerio.load(html, null, false);
    const eventCards: EventCardDescriptor[] = [];

    // 1. Collect from existing structured cards (if already in database)
    $('div[data-event-card="true"]').each((_, element) => {
        const title = $(element).attr('data-title') || '';
        const eventId = $(element).attr('data-event-id') || null;
        if (title) {
            eventCards.push({ eventId });
        }
    });

    // 2. Clear legacy markers (TL;DR headings and tables)
    $('h2:contains("TL;DR"), h3:contains("TL;DR")').remove();
    $('table').each((_, element) => {
        const text = $(element).text();
        if (text.includes('Event Name') && text.includes('Location')) {
            $(element).parent('div.overflow-x-auto').remove();
            $(element).remove();
        }
    });

    // 3. Convert legacy h3 + p metadata blocks to interactive cards
    $('h3').each((_, element) => {
        const metadataParagraph = $(element).next('p');
        const metadata = extractEventMetadata(metadataParagraph.html());
        if (!metadata) {
            return;
        }

        const title = $(element).text().trim();
        const elementId = $(element).attr('id');
        const siblings = metadataParagraph.nextUntil('hr, h2, h3');
        const wrapper = $('<div data-event-card="true"></div>');

        wrapper.attr('data-title', title);
        if (metadata.date) wrapper.attr('data-date', metadata.date);
        if (metadata.location) wrapper.attr('data-location', metadata.location);
        if (metadata.focus) wrapper.attr('data-focus', metadata.focus);
        if (elementId) wrapper.attr('id', elementId);

        $(element).before(wrapper);
        wrapper.append(siblings);
        metadataParagraph.remove();
        $(element).remove();

        if (!eventCards.some((event) => event.eventId === null)) {
            eventCards.push({ eventId: null });
        }
    });

    return {
        interactiveHtml: $.html(),
        eventCards,
    };
}

function isLikelyLogoAsset(url: string | null | undefined) {
    if (!url) {
        return false;
    }

    const normalized = url.toLowerCase();

    if (
        normalized.includes('og') ||
        normalized.includes('open-graph') ||
        normalized.includes('banner') ||
        normalized.includes('hero') ||
        normalized.includes('cover')
    ) {
        return false;
    }

    return (
        normalized.endsWith('.svg') ||
        normalized.endsWith('.png') ||
        normalized.endsWith('.ico') ||
        normalized.includes('/logo')
    );
}

function attachResolvedEventData(html: string, resolvedEvents: Map<string, ResolvedBlogEvent>) {
    const $ = cheerio.load(html, null, false);

    $('div[data-event-card="true"]').each((_, element) => {
        const eventId = $(element).attr('data-event-id');
        if (!eventId) {
            $(element).removeAttr('data-event-slug');
            $(element).removeAttr('data-image');
            $(element).removeAttr('data-logo');
            return;
        }

        const resolved = resolvedEvents.get(eventId);
        if (!resolved) {
            $(element).removeAttr('data-event-slug');
            $(element).removeAttr('data-image');
            $(element).removeAttr('data-logo');
            return;
        }

        $(element).attr('data-event-slug', resolved.slug);

        if (resolved.event_image_url) {
            $(element).attr('data-image', withVersionParam(resolved.event_image_url, resolved.updated_at));
        } else {
            $(element).removeAttr('data-image');
        }

        if (isLikelyLogoAsset(resolved.organizer_logo_url) && !$(element).attr('data-logo')) {
            $(element).attr('data-logo', resolved.organizer_logo_url);
        }
    });

    return $.html();
}

function isMeaningfullyUpdated(publishedAt: string | null, updatedAt: string | null) {
    if (!publishedAt || !updatedAt) {
        return false;
    }

    return updatedAt.slice(0, 10) !== publishedAt.slice(0, 10);
}

function ShareLinks({ title, slug }: { title: string; slug: string }) {
    const url = `${SITE_URL}/blog/${slug}`;

    return (
        <section className="border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-zinc-300">
                Share
            </p>
            <BlogShareButtons title={title} url={url} />
        </section>
    );
}

function RelatedPostsModule({ posts }: { posts: RelatedPost[] }) {
    if (posts.length === 0) {
        return null;
    }

    return (
        <section className="border-t border-white/10 pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-zinc-300">
                        Related Posts
                    </p>
                </div>
                <Link href="/blog" className="text-sm text-zinc-300 transition-colors hover:text-white">
                    All posts
                </Link>
            </div>
            <div className="space-y-5">
                {posts.map((post) => (
                    <Link
                        href={`/blog/${post.slug}`}
                        key={post.id}
                        className="group flex gap-4"
                    >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[4px] bg-zinc-900 border border-white/5">
                            {post.featured_image_url ? (
                                <Image
                                    src={post.featured_image_url}
                                    alt={post.title || ''}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50">
                                    <span className="text-[10px] text-zinc-600 font-bold italic">TC</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-1 flex-col justify-center border-b border-white/[0.08] pb-5 transition-colors group-hover:border-white/[0.16] last:border-b-0 group-last:pb-0">
                            <h3 className="text-[15px] font-semibold leading-tight text-white/90 group-hover:text-white">
                                {post.title}
                            </h3>
                            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                {post.author?.full_name || 'Tech-Cal Team'}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function ExploreCalendarModule() {
    return (
        <section className="border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-zinc-300">
                Explore The Calendar
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
                Browse the live event calendar to find upcoming deadlines, launches, and community events.
            </p>
            <Link
                href="/calendar?view=month"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-100 transition-colors hover:text-white"
            >
                Browse calendar
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </Link>
        </section>
    );
}

function FeaturedEventModule({
    title,
    eventDate,
    href,
}: {
    title: string;
    eventDate: string | null;
    href: string;
}) {
    return (
        <section className="border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-zinc-300">
                Featured Event
            </p>
            <h3 className="mt-3 text-xl font-semibold text-zinc-100">
                {title}
            </h3>
            {eventDate && (
                <p className="mt-2 text-sm text-zinc-400">
                    {eventDate}
                </p>
            )}
            <Link
                href={href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-100 transition-colors hover:text-white"
            >
                View event details
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </Link>
        </section>
    );
}

function SupportRail({
    presentationMode,
    ctaEvent,
    eventDate,
    eventLink,
    eventAgenda,
    relatedPosts,
    shareTitle,
    shareSlug,
}: {
    presentationMode: PresentationMode;
    ctaEvent: CtaEvent | null;
    eventDate: string | null;
    eventLink: string;
    eventAgenda: AgendaItem[];
    relatedPosts: RelatedPost[];
    shareTitle: string;
    shareSlug: string;
}) {
    const showEventModules = presentationMode === 'event_guide' || Boolean(ctaEvent);

    return (
        <>
            {showEventModules && ctaEvent ? (
                <FeaturedEventModule title={ctaEvent.title} eventDate={eventDate} href={eventLink} />
            ) : (
                <ExploreCalendarModule />
            )}

            {showEventModules && ctaEvent?.slug && eventAgenda.length > 0 && (
                <div className="px-1">
                    <EventAgendaTimeline agenda={eventAgenda} eventSlug={ctaEvent.slug} maxItems={5} />
                </div>
            )}

            <RelatedPostsModule posts={relatedPosts} />
            <ShareLinks title={shareTitle} slug={shareSlug} />
        </>
    );
}

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
        .filter((post): post is { slug: string } => post.slug !== null)
        .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: post } = await supabase
        .from('posts')
        .select('title, excerpt, featured_image_url, published_at, updated_at, slug, post_categories(name)')
        .eq('slug', slug)
        .single();

    if (!post) {
        return { title: 'Post Not Found' };
    }

    const description = post.excerpt || 'Read the latest insights from the Tech-Cal blog covering tech events, developer conferences, meetups, and strategies for professional growth.';
    const ogImage = post.featured_image_url || '/og-image.png';

    return {
        title: post.title,
        description,
        keywords: [postCategoryName(post), 'Developer Conferences', 'Networking', 'Professional Growth'],
        alternates: {
            canonical: `${SITE_URL}/blog/${slug}`,
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
    const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? '';
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
        updated_at,
        read_time_minutes,
        category_id,
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
        updated_at,
        read_time_minutes,
        category_id,
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

    const rawContent = (post.content || '')
        .replace(/5 W&#39;s|5 W's/g, 'Property')
        .replace(/Details/g, 'Value');
    const safeContent = sanitizeBlogHtml(rawContent);
    const presentationMode = inferPresentationMode(safeContent);
    const {
        interactiveHtml: initialInteractiveHtml,
        eventCards,
    } = buildInteractiveHtml(safeContent, presentationMode);

    const ctaEventData = post.cta_event || null;
    const ctaEvent = Array.isArray(ctaEventData) ? ctaEventData[0] : ctaEventData;
    const eventDate = ctaEvent?.start_time ? formatDate(ctaEvent.start_time) : null;
    const eventLink = ctaEvent?.slug ? `/events/${ctaEvent.slug}` : '/events';
    const authorName = post.author?.full_name || 'Tech-Cal Team';
    const showUpdatedAt = isMeaningfullyUpdated(post.published_at, post.updated_at);

    const relatedPostsPromise = (async (): Promise<RelatedPost[]> => {
        const baseSelect = 'id, title, slug, excerpt, featured_image_url, published_at, category: post_categories ( name ), author: profiles ( full_name )';
        const relatedQuery = post.category_id
            ? supabase
                .from('posts')
                .select(baseSelect)
                .eq('status', 'published')
                .eq('category_id', post.category_id)
                .neq('id', post.id)
                .order('published_at', { ascending: false })
                .limit(3)
            : null;

        const fallbackQuery = supabase
            .from('posts')
            .select(baseSelect)
            .eq('status', 'published')
            .neq('id', post.id)
            .order('published_at', { ascending: false })
            .limit(6);

        const [relatedResult, fallbackResult] = await Promise.all([
            relatedQuery ?? Promise.resolve({ data: [] as RelatedPost[] }),
            fallbackQuery,
        ]);

        const categoryPosts = (relatedResult?.data || []) as RelatedPost[];
        const fallbackPosts = (fallbackResult.data || []) as RelatedPost[];
        const merged = [...categoryPosts];

        fallbackPosts.forEach((candidate) => {
            if (merged.length >= 3) {
                return;
            }

            if (!merged.some((existing) => existing.id === candidate.id)) {
                merged.push(candidate);
            }
        });

        return merged.filter((candidate) => candidate.slug).slice(0, 3);
    })();

    const matchedBlogEventsPromise = (async () => {
        const eventIds = Array.from(
            new Set(
                eventCards
                    .map((card) => card.eventId)
                    .filter((eventId): eventId is string => Boolean(eventId))
            )
        );

        if (eventIds.length === 0) {
            return new Map<string, ResolvedBlogEvent>();
        }

        const { data } = await supabase
            .from('events')
            .select(`
                id,
                title,
                slug,
                start_time,
                location,
                event_image_url,
                updated_at,
                organizer:organizers (
                    logo_url
                )
            `)
            .in('id', eventIds);

        const resolvedEvents = (data || [])
            .filter((event): event is {
                id: string;
                title: string;
                slug: string;
                start_time: string;
                location: string | null;
                event_image_url: string | null;
                updated_at: string | null;
                organizer: { logo_url: string | null } | null;
            } => Boolean(event?.id && event?.title && event?.slug && event?.start_time))
            .map((event) => ({
                id: event.id,
                title: event.title,
                slug: event.slug,
                start_time: event.start_time,
                location: event.location,
                event_image_url: event.event_image_url,
                organizer_logo_url: event.organizer?.logo_url || null,
                updated_at: event.updated_at,
            }));

        return new Map(resolvedEvents.map((event) => [event.id, event] as const));
    })();

    const eventAgendaPromise: Promise<AgendaItem[]> = ctaEvent?.id
        ? EventService.getEventWithAgenda(ctaEvent.id, supabase)
            .then((eventWithAgenda) => eventWithAgenda.agenda || [])
            .catch((error) => {
                console.warn('Failed to fetch event agenda:', error);
                return [];
            })
        : Promise.resolve([]);

    const [relatedPosts, matchedBlogEvents, eventAgenda] = await Promise.all([
        relatedPostsPromise,
        matchedBlogEventsPromise,
        eventAgendaPromise,
    ]);

    const interactiveHtml = attachResolvedEventData(initialInteractiveHtml, matchedBlogEvents);

    return (
        <>
            <ArticleJsonLd
                nonce={nonce}
                title={post.title}
                description={post.excerpt || 'Read the latest insights from the Tech-Cal blog on tech events, conferences, and developer growth.'}
                publishedAt={post.published_at || new Date().toISOString()}
                modifiedAt={post.updated_at || undefined}
                authorName={authorName}
                slug={post.slug}
                imageUrl={post.featured_image_url || undefined}
            />
            <BreadcrumbJsonLd
                nonce={nonce}
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Blog', url: `${SITE_URL}/blog` },
                    { name: post.title },
                ]}
            />

            <main id="main-content" className="relative min-h-screen overflow-x-clip bg-[#0B0C0E] pb-24 pt-24">
                <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[260px] opacity-20"
                    style={{
                        background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
                    }}
                />

                <div className="relative z-10 mx-auto max-w-[1480px] px-6 lg:px-8">
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[200px_minmax(0,820px)_260px] xl:grid-cols-[220px_minmax(0,840px)_280px]">
                        <aside className="hidden self-stretch lg:block">
                            <TableOfContents variant="desktop" />
                        </aside>

                        <article className="min-w-0">
                            <header className="pb-10">
                                <div className="mb-6 flex flex-wrap items-center gap-2 text-[13px] font-medium text-zinc-500">
                                    <Link href="/blog" className="transition-colors hover:text-zinc-300">Blog</Link>
                                    <span>/</span>
                                    <span>{post.category?.name || 'Guide'}</span>
                                </div>

                                <h1 className="max-w-[14ch] text-balance text-4xl font-semibold tracking-[-0.04em] text-[#F5F7FA] md:text-5xl lg:text-[4rem] lg:leading-[1.01]">
                                    {post.title}
                                </h1>

                                {post.excerpt && (
                                    <p className="mt-6 max-w-[58ch] text-lg leading-8 text-[#B9C2CC] md:text-xl">
                                        {post.excerpt}
                                    </p>
                                )}

                                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                                    <div className="text-zinc-200">
                                        {authorName}
                                    </div>
                                    {post.published_at && (
                                        <div>
                                            Published <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                                        </div>
                                    )}
                                    {showUpdatedAt && post.updated_at && (
                                        <div>
                                            Updated <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
                                        </div>
                                    )}
                                    {post.read_time_minutes && (
                                        <div>
                                            {post.read_time_minutes} min read
                                        </div>
                                    )}
                                </div>

                                {post.featured_image_url && (
                                    <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-[28px] bg-[#121315]">
                                        <Image
                                            src={post.featured_image_url}
                                            alt={post.title || 'Featured image'}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1400px) 820px, 980px"
                                            className="object-cover"
                                            priority
                                        />
                                    </div>
                                )}
                            </header>

                            <div className="mt-10">
                                <TableOfContents variant="mobile" />

                                <InteractiveBlogContent
                                    html={interactiveHtml}
                                    availableRoles={presentationMode === 'event_guide' ? ROLE_FILTERS : []}
                                    presentationMode={presentationMode}
                                />
                            </div>

                            <section className="mt-20 border-t border-white/10 pt-10">
                                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-300">
                                            Further Reading
                                        </p>
                                        <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
                                            Keep the momentum going.
                                        </h2>
                                        <p className="mt-2 max-w-[54ch] text-sm leading-6 text-zinc-400">
                                            Continue with adjacent articles or return to the full blog archive.
                                        </p>
                                    </div>
                                    <Link
                                        href="/blog"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
                                    >
                                        Browse all posts
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </Link>
                                </div>
                                {relatedPosts.length > 0 && (
                                    <div className="mt-8 grid gap-6 md:grid-cols-3">
                                        {relatedPosts.map((relatedPost) => (
                                            <Link
                                                href={`/blog/${relatedPost.slug}`}
                                                key={relatedPost.id}
                                                className="group block"
                                            >
                                                <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-lg bg-zinc-900 border border-white/5">
                                                    {relatedPost.featured_image_url ? (
                                                        <Image
                                                            src={relatedPost.featured_image_url}
                                                            alt={relatedPost.title || ''}
                                                            fill
                                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50">
                                                            <span className="text-xs text-zinc-600 font-bold italic">Tech-Cal</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="border-t border-white/[0.08] pt-4 transition-colors group-hover:border-white/[0.16]">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                        {relatedPost.category?.name || 'Article'}
                                                    </p>
                                                    <h3 className="mt-2 text-[15px] font-semibold leading-snug text-white/90 group-hover:text-white line-clamp-2">
                                                        {relatedPost.title}
                                                    </h3>
                                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500/80">
                                                        {relatedPost.author?.full_name || 'Tech-Cal Team'}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <div className="mt-12 space-y-6 lg:hidden">
                                <SupportRail
                                    presentationMode={presentationMode}
                                    ctaEvent={ctaEvent || null}
                                    eventDate={eventDate}
                                    eventLink={eventLink}
                                    eventAgenda={eventAgenda}
                                    relatedPosts={relatedPosts}
                                    shareTitle={post.title}
                                    shareSlug={post.slug}
                                />
                            </div>
                        </article>

                        <aside className="hidden lg:block">
                            <div className="sticky top-24 space-y-8">
                                <SupportRail
                                    presentationMode={presentationMode}
                                    ctaEvent={ctaEvent || null}
                                    eventDate={eventDate}
                                    eventLink={eventLink}
                                    eventAgenda={eventAgenda}
                                    relatedPosts={relatedPosts}
                                    shareTitle={post.title}
                                    shareSlug={post.slug}
                                />
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </>
    );
}
