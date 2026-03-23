// next.config.ts (Modified with Security Headers)

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Shared security headers for all routes
const commonSecurityHeaders = [
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
    key: 'X-Content-Type-Options',
    value: 'nosniff' // Prevents the browser from MIME-sniffing a response away from the declared content-type
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin' // Aligns with modern browser defaults
  }
];

// Default app/pages: block framing.
const securityHeaders = [
  ...commonSecurityHeaders,
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  }
];

// Embed pages: explicitly allow framing by external sites.
const embedHeaders = [
  ...commonSecurityHeaders,
];


const nextConfig: NextConfig = {
  // Set the workspace root to silence the multiple lockfiles warning
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // These packages are server-only but get pulled into the client bundle
      // transitively via eventServices -> careerImpactEnrichmentService -> @vercel/kv.
      // Setting them to false tells webpack to resolve them as empty modules in the browser.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@vercel/kv': false,
        '@upstash/redis': false,
        '@upstash/ratelimit': false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'kure-cal.com' }],
        destination: 'https://www.kure-cal.com/:path*',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/legal/privacy',
        permanent: true,
      },
    ];
  },
  // 2. Add the async headers function to your Next.js config.
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: embedHeaders,
      },
      {
        // Apply strict framing headers to all non-embed routes.
        source: '/((?!embed(?:/|$)).*)',
        headers: securityHeaders,
      },
    ];
  },
  // Configure external image domains - migrated to remotePatterns for Next.js 16
  images: {
    remotePatterns: [
      {
        // Event images, blog posts, and user avatars stored in Supabase Storage
        protocol: 'https',
        hostname: 'mddgtexrnnlctttbcpsy.supabase.co',
      },
      {
        // Wildcard required: 400+ unique domains from ingested event organizer logos,
        // speaker photos, and hackathon images. A static allowlist is impractical
        // since new events are continuously imported from arbitrary sources.
        // TODO: Consider proxying external images through Supabase Storage during
        // ingestion to eliminate this wildcard.
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize package imports to avoid compiling entire libraries
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@mui/material"
    ],
  },
  // Mark server-only packages as external to prevent client-side bundling
  serverExternalPackages: [
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
// 3. Chain the configurations: Sentry -> BundleAnalyzer -> NextConfig
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Sentry configuration options
const sentryOptions = {
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
};

// Skip Sentry wrapper in development to prevent infinite process spawning issue
// with Next.js 16+ dev server. Production builds still get full Sentry integration.
export default isDev
  ? withBundleAnalyzer(nextConfig)
  : withSentryConfig(withBundleAnalyzer(nextConfig), sentryOptions);
