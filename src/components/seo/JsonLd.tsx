// src/components/seo/JsonLd.tsx
// Reusable JSON-LD structured data components for SEO

import React from 'react';
import { SITE_NAME, SITE_URL } from '@/config/site';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

interface JsonLdProps {
    data: Record<string, unknown>;
    nonce?: string;
}

/**
 * Safely stringify JSON-LD data preventing XSS attacks
 * Escapes < and > characters to prevent script injection
 */
const safeJsonLdStringify = (data: Record<string, unknown>): string => {
    return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
};

/**
 * Base component for rendering JSON-LD structured data
 */
function JsonLd({ data, nonce }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }} // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        />
    );
}

interface NoncedJsonLdProps {
    nonce?: string;
}

/**
 * Organization schema - Use in root layout for site-wide branding
 */
export function OrganizationJsonLd({ nonce }: NoncedJsonLdProps) {
    const sameAs = [
        'https://twitter.com/kure_cal',
        'https://linkedin.com/company/kure-cal',
    ].filter(Boolean);

    const data = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/logo.svg`,
        },
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        ...(sameAs.length > 0 && { sameAs }),
    };

    return <JsonLd data={data} nonce={nonce} />;
}

/**
 * WebSite schema with search action - Use in root layout
 */
export function WebsiteJsonLd({ nonce }: NoncedJsonLdProps) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
        publisher: {
            '@type': 'Organization',
            '@id': ORGANIZATION_ID,
        },
    };

    return <JsonLd data={data} nonce={nonce} />;
}

/**
 * FAQPage schema - Use on pricing page for FAQ section
 */
interface FAQ {
    question: string;
    answer: string;
}

interface FAQPageJsonLdProps {
    faqs: FAQ[];
    nonce?: string;
}

export function FAQPageJsonLd({ faqs, nonce }: FAQPageJsonLdProps) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };

    return <JsonLd data={data} nonce={nonce} />;
}

/**
 * Article/BlogPosting schema - Use on individual blog posts
 */
interface ArticleJsonLdProps {
    title: string;
    description: string;
    publishedAt: string;
    modifiedAt?: string;
    authorName: string;
    slug: string;
    imageUrl?: string;
    nonce: string;
}

export function ArticleJsonLd({
    title,
    description,
    publishedAt,
    modifiedAt,
    authorName,
    slug,
    imageUrl,
    nonce,
}: ArticleJsonLdProps) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description: description,
        datePublished: publishedAt,
        dateModified: modifiedAt || publishedAt,
        author: {
            '@type': 'Person',
            name: authorName,
        },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/logo.svg`,
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${SITE_URL}/blog/${slug}`,
        },
        ...(imageUrl && {
            image: imageUrl,
        }),
    };

    return <JsonLd data={data} nonce={nonce} />;
}

/**
 * Event schema - Use on event detail pages
 */
interface EventJsonLdProps {
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    location?: {
        name: string;
        address?: string;
    };
    url: string;
    imageUrl?: string;
    isOnline?: boolean;
    organizer?: {
        name: string;
        logo_url?: string;
    };
    offers?: {
        priceMin?: number | null;
        priceMax?: number | null;
        currency?: string | null;
    };
    nonce: string;
}

export function EventJsonLd({
    name,
    description,
    startDate,
    endDate,
    location,
    url,
    imageUrl,
    isOnline,
    organizer,
    offers,
    nonce,
}: EventJsonLdProps) {
    const fallbackImage = `${SITE_URL}/og-image.png`;
    const resolvedImage = imageUrl || fallbackImage;

    // Build offers schema only if we have pricing data
    const offersSchema =
        offers && (offers.priceMin !== null || offers.priceMax !== null)
            ? {
                '@type': 'AggregateOffer',
                offerCount: 1,
                ...(offers.priceMin !== null && { lowPrice: offers.priceMin }),
                ...(offers.priceMax !== null && { highPrice: offers.priceMax }),
                priceCurrency: offers.currency || 'USD',
                url: url,
            }
            : undefined;

    const data = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: name,
        description: description,
        startDate: startDate,
        ...(endDate && { endDate }),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: isOnline
            ? 'https://schema.org/OnlineEventAttendanceMode'
            : 'https://schema.org/OfflineEventAttendanceMode',
        location: isOnline
            ? {
                '@type': 'VirtualLocation',
                url: url,
            }
            : location
                ? {
                    '@type': 'Place',
                    name: location.name,
                    ...(location.address && {
                        address: {
                            '@type': 'PostalAddress',
                            streetAddress: location.address,
                        },
                    }),
                }
                : {
                    '@type': 'Place',
                    name: 'Location TBA',
                },
        url: url,
        image: [resolvedImage],
        // Only include organizer if provided, otherwise omit entirely (valid per Schema.org)
        ...(organizer && {
            organizer: {
                '@type': 'Organization',
                name: organizer.name,
                ...(organizer.logo_url && {
                    logo: {
                        '@type': 'ImageObject',
                        url: organizer.logo_url,
                    },
                }),
            },
        }),
        ...(offersSchema && { offers: offersSchema }),
    };

    return <JsonLd data={data} nonce={nonce} />;
}

/**
 * BreadcrumbList schema - Use on event pages for navigation context
 */
interface BreadcrumbItem {
    name: string;
    url?: string;
}

interface BreadcrumbJsonLdProps {
    items: BreadcrumbItem[];
    nonce: string;
}

export function BreadcrumbJsonLd({ items, nonce }: BreadcrumbJsonLdProps) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            ...(item.url && { item: { '@id': item.url } }),
        })),
    };

    return <JsonLd data={data} nonce={nonce} />;
}

export default JsonLd;
