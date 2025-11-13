// next.config.ts (Modified with Security Headers)

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// 1. Define the security headers array. This makes the config cleaner.
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    // This value is for one year. You can adjust it, but this is a strong default.
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block' // Recommended for older browsers
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY' // Prevents the site from being rendered in an iframe (clickjacking protection)
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff' // Prevents the browser from MIME-sniffing a response away from the declared content-type
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin' // Aligns with modern browser defaults
  },
  {
    key: 'Content-Security-Policy',
    value: `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://js.sentry-cdn.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
        style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
        img-src 'self' data: blob: https: https://cdn.jsdelivr.net https://mddgtexrnnlctttbcpsy.supabase.co https://upload.wikimedia.org https://logo.clearbit.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
        font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:;
        connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
        `.replace(/\s+/g, ' ').trim()
  }
];


const nextConfig: NextConfig = {
  // 2. Add the async headers function to your Next.js config.
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // Configure external image domains
  images: {
    domains: [
      'mddgtexrnnlctttbcpsy.supabase.co', // Your Supabase storage domain
      'upload.wikimedia.org', // Wikipedia SVG logos (transparent)
      'cdn.freebiesupply.com', // High-quality transparent logos
      'logo.clearbit.com', // Clearbit logo API (fallback)
      'lh3.googleusercontent.com', // Google profile images
      'avatars.githubusercontent.com', // GitHub profile images
        ],
  },
  experimental: {
    // Optimize package imports to avoid compiling entire libraries
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@mui/material"
    ],
  },
  // Mark server-only packages as external to prevent client-side bundling
  serverComponentsExternalPackages: [
    'googleapis',
    '@mendable/firecrawl-js',
    'node-ical',
    'rss-parser',
    '@mozilla/readability',
    'jsdom'
  ],
  // ... you can add other Next.js config options here if needed in the future
};

// 3. Your Sentry configuration remains exactly the same.
// The `nextConfig` object, now with headers, is passed into the Sentry wrapper.
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "kure-cal",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
