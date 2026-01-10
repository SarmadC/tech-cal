// src/app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/(protected)/',
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
