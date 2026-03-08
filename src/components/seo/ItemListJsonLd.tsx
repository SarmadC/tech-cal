// src/components/seo/ItemListJsonLd.tsx
// Reusable ItemList JSON-LD structured data component

import React from 'react';

interface ItemListEvent {
    title: string;
    startDate: string;
    endDate?: string | null;
    location?: string | null;
    isOnline?: boolean;
    description?: string | null;
    url: string;
    organizerName?: string | null;
}

interface ItemListJsonLdProps {
    items: ItemListEvent[];
    nonce: string;
}

/**
 * Renders an ItemList JSON-LD schema with Event items.
 * Used on listing pages (categories, cities, resources) for rich search results.
 */
export function ItemListJsonLd({ items, nonce }: ItemListJsonLdProps) {
    if (items.length === 0) return null;

    const data = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@type': 'Event',
                name: item.title,
                startDate: item.startDate,
                ...(item.endDate ? { endDate: item.endDate } : {}),
                ...(item.location
                    ? {
                          location: item.isOnline
                              ? { '@type': 'VirtualLocation', url: item.url }
                              : { '@type': 'Place', name: item.location },
                      }
                    : {}),
                ...(item.description
                    ? { description: item.description.slice(0, 200) }
                    : {}),
                url: item.url,
                ...(item.organizerName
                    ? {
                          organizer: {
                              '@type': 'Organization',
                              name: item.organizerName,
                          },
                      }
                    : {}),
            },
        })),
    };

    const safeJson = JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e');

    return (
        <script
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: safeJson }} // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        />
    );
}
