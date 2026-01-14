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
            // nosemgrep: javascript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
            dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }}
        />
    );
}

/**
 * Organization schema - Use in root layout for site-wide branding
 */
export function OrganizationJsonLd() {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Kure-Cal',
        url: 'https://kure-cal.com',
        logo: 'https://kure-cal.com/logo.svg',
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        sameAs: [
            // Add social media URLs when available
            // 'https://twitter.com/kurecal',
            // 'https://linkedin.com/company/kurecal',
        ],
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
        name: 'Kure-Cal',
        url: 'https://kure-cal.com',
        description: 'All your tech events in one calendar. Conferences, meetups, launches, and livestreams—organized without the information overload.',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://kure-cal.com/discover?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
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
            logo: {
                '@type': 'ImageObject',
                url: 'https://kure-cal.com/logo.svg',
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://kure-cal.com/blog/${slug}`,
        },
        ...(imageUrl && {
            image: {
                '@type': 'ImageObject',
                url: imageUrl,
            },
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
}: EventJsonLdProps) {
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
                : undefined,
        url: url,
        ...(imageUrl && {
            image: imageUrl,
        }),
        organizer: {
            '@type': 'Organization',
            name: 'Kure-Cal',
            url: 'https://kure-cal.com',
        },
    };

    return <JsonLd data={data} />;
}

export default JsonLd;
