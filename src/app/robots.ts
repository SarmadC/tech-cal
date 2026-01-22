// src/app/robots.ts
import { MetadataRoute } from 'next'

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
                    '/sentry-example-page/',
                ],
            },
        ],
        sitemap: 'https://kure-cal.com/sitemap.xml',
    }
}
