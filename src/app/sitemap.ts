// src/app/sitemap.ts
import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://kurecal.com'

    // Static pages with their priorities and change frequencies
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
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
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/signup`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]

    // Dynamic blog posts from Supabase
    let blogPosts: MetadataRoute.Sitemap = []
    let eventPages: MetadataRoute.Sitemap = []
    
    try {
        const supabase = await createClient()
        
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
            .order('start_time', { ascending: true })

        if (events) {
            const typedEvents = events as unknown as Array<{ slug: string; updated_at: string | null; start_time: string | null }>
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
    } catch (error) {
        // If Supabase fetch fails, continue with static pages only
        console.error('Failed to fetch dynamic content for sitemap:', error)
    }

    return [...staticPages, ...blogPosts, ...eventPages]
}
