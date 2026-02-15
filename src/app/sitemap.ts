import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { categoryNameToSlug, cityNameToSlug } from '@/utils/categorySlugUtils'
import { SITE_URL } from '@/config/site'
import { Database } from '@/types/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SITE_URL

    // Static pages with their priorities and change frequencies
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/events`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/pricing`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
    ]

    // Dynamic blog posts from Supabase
    let blogPosts: MetadataRoute.Sitemap = []
    let eventPages: MetadataRoute.Sitemap = []
    
    try {
        // Use a direct client for sitemap generation to avoid cookie dependencies
        // which cause "Dynamic server usage" errors during static build
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // Fetch blog posts
        const { data: posts } = await supabase
            .from('posts')
            .select('slug, updated_at, published_at')
            .eq('status', 'published')
            .lte('published_at', new Date().toISOString())
            .order('published_at', { ascending: false })

        if (posts) {
            blogPosts = posts.map((post) => ({
                url: `${baseUrl}/blog/${post.slug}`,
                lastModified: new Date(post.updated_at || post.published_at || new Date().toISOString()),
                changeFrequency: 'monthly' as const,
                priority: 0.7,
            }))
        }

        // Fetch all confirmed events for SEO
        // Use type assertion since slug column was just added via migration
        const now = new Date().toISOString()
        const { data: events } = await supabase
            .from('events')
            .select('slug, updated_at, start_time' as never)  // Type assertion for new column
            .eq('status', 'confirmed')
            .not('slug', 'is', null)
            .order('start_time', { ascending: true })

        if (events) {
            const typedEvents = (
                events as unknown as Array<{
                    slug: string | null;
                    updated_at: string | null;
                    start_time: string | null;
                }>
            ).filter(
                (
                    event
                ): event is {
                    slug: string;
                    updated_at: string | null;
                    start_time: string | null;
                } => typeof event.slug === 'string' && event.slug.trim().length > 0
            )
            eventPages = typedEvents.map((event) => {
                const isUpcoming = event.start_time && event.start_time > now
                const startDate = event.start_time ? new Date(event.start_time) : new Date()
                const daysTillEvent = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                
                // Priority based on timing:
                // - Upcoming within 30 days: 0.9
                // - Upcoming within 90 days: 0.8
                // - Upcoming beyond 90 days: 0.7
                // - Past events: 0.5
                let priority = 0.5
                if (isUpcoming) {
                    if (daysTillEvent <= 30) priority = 0.9
                    else if (daysTillEvent <= 90) priority = 0.8
                    else priority = 0.7
                }

                return {
                    url: `${baseUrl}/events/${event.slug}`,
                    lastModified: new Date(event.updated_at || new Date().toISOString()),
                    changeFrequency: isUpcoming ? 'weekly' as const : 'monthly' as const,
                    priority,
                }
            })
        }
        // Fetch event types for category pages
        const { data: eventTypes } = await supabase
            .from('event_type')
            .select('name')
            .eq('is_active', true)

        if (eventTypes) {
            const categoryPages: MetadataRoute.Sitemap = eventTypes
                .filter((t): t is { name: string } => t.name !== null)
                .map((t) => ({
                    url: `${baseUrl}/events/category/${categoryNameToSlug(t.name)}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.7,
                }))
            blogPosts = [...blogPosts, ...categoryPages]
        }

        // Fetch distinct cities for city pages
        const { data: cityData } = await supabase
            .from('events')
            .select('location_city')
            .eq('status', 'confirmed')
            .not('location_city', 'is', null)
            .gte('start_time', now)

        if (cityData) {
            const uniqueCities = Array.from(
                new Set(
                    cityData
                        .map((r) => (r as { location_city: string | null }).location_city)
                        .filter((c): c is string => c !== null && c.trim() !== '')
                )
            )
            const cityPages: MetadataRoute.Sitemap = uniqueCities.map((city) => ({
                url: `${baseUrl}/events/cities/${cityNameToSlug(city)}`,
                lastModified: new Date(),
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }))
            blogPosts = [...blogPosts, ...cityPages]
        }
    } catch (error) {
        // If Supabase fetch fails, continue with static pages only
        console.error('Failed to fetch dynamic content for sitemap:', error)
    }

    // Static resource pages
    const resourcePages: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/resources/tech-events-calendar-2026`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/resources/cfp-calendar`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        },
    ]

    return [...staticPages, ...blogPosts, ...eventPages, ...resourcePages]
}
