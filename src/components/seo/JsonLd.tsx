// src/components/seo/JsonLd.tsx
// Reusable JSON-LD structured data components for SEO

import React from 'react';

interface JsonLdProps {
    data: Record<string, unknown>;
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
function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }} // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        />
    );
}

/**
 * Organization schema - Use in root layout for site-wide branding
 */
export function OrganizationJsonLd() {
    const sameAs = [
        'https://twitter.com/kure_cal',
        'https://linkedin.com/company/kure-cal',
    ].filter(Boolean);

    const data = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': 'https://kure-cal.com/#organization',
        name: 'Kure-Cal',
        url: 'https://kure-cal.com',
        logo: 'https://kure-cal.com/logo.svg',
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        ...(sameAs.length > 0 && { sameAs }),
    };

    return <JsonLd data={data} />;
}

/**
 * WebSite schema with search action - Use in root layout
 */
export function WebsiteJsonLd() {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': 'https://kure-cal.com/#website',
        name: 'Kure-Cal',
        url: 'https://kure-cal.com',
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://kure-cal.com/events?q={search_term_string}',
            'query-input': 'required name=search_term_string',
        },
        publisher: {
            '@type': 'Organization',
            '@id': 'https://kure-cal.com/#organization',
        },
    };

    return <JsonLd data={data} />;
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
}

export function FAQPageJsonLd({ faqs }: FAQPageJsonLdProps) {
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

    return <JsonLd data={data} />;
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
}

export function ArticleJsonLd({
    title,
    description,
    publishedAt,
    modifiedAt,
    authorName,
    slug,
    imageUrl,
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
            name: 'Kure-Cal',
            logo: 'https://kure-cal.com/logo.svg',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://kure-cal.com/blog/${slug}`,
        },
        ...(imageUrl && {
            image: imageUrl,
        }),
    };

    return <JsonLd data={data} />;
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
}: EventJsonLdProps) {
    const fallbackImage = 'https://kure-cal.com/og-image.png';
    const resolvedImage = imageUrl || fallbackImage;

    // Build offers schema only if we have pricing data
    const offersSchema =
        offers && (offers.priceMin !== null || offers.priceMax !== null)
            ? {
                '@type': 'AggregateOffer',
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

    return <JsonLd data={data} />;
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
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            ...(item.url && { item: item.url }),
        })),
    };

    return <JsonLd data={data} />;
}

export default JsonLd;
