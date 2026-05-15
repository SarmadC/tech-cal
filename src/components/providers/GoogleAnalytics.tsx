'use client';

import Script from 'next/script';
import React from 'react';

interface GoogleAnalyticsProps {
    nonce?: string;
}

export default function GoogleAnalytics({ nonce }: GoogleAnalyticsProps) {
    // Don't render anything if the GA ID is missing
    if (!process.env.NEXT_PUBLIC_GA_ID) {
        return null;
    }

    return (
        <>
            <Script
                strategy="lazyOnload"
                nonce={nonce}
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <Script
                id="google-analytics"
                strategy="lazyOnload"
                nonce={nonce}
                dangerouslySetInnerHTML={{
                    __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                page_path: window.location.pathname,
            });
          `,
                }}
            />
        </>
    );
}
