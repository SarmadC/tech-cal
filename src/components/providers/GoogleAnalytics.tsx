'use client';

import Script from 'next/script';
import React from 'react';

export default function GoogleAnalytics() {
    // Don't render anything if the GA ID is missing
    if (!process.env.NEXT_PUBLIC_GA_ID) {
        return null;
    }

    return (
        <>
            <Script
                strategy="lazyOnload"
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <Script
                id="google-analytics"
                strategy="lazyOnload"
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
