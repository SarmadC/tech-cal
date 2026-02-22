// src/app/robots.ts
import { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'

export default function robots(): MetadataRoute.Robots {
    // Block all crawling on non-production environments (staging/preview)
    if (process.env.VERCEL_ENV !== 'production') {
        return {
            rules: [{ userAgent: '*', disallow: ['/'] }],
        }
    }

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/onboarding/',
                    '/dashboard/',
                    '/calendar/',
                    '/discover/',
                    '/hackathons/',
                    '/settings/',
                    '/sentry-example-page/',
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
