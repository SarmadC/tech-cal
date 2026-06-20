export const CSP_NONCE_HEADER = 'x-nonce';

type CspStage = 'compat' | 'balanced' | 'strict';

type CspOptions = {
    frameAncestors: string;
    nonce: string;
};

type CspFlags = {
    allowUnsafeInline: boolean;
    allowUnsafeEval: boolean;
    includeNonce: boolean;
    includeStrictDynamic: boolean;
};

function getCspStage(isProduction: boolean): CspStage {
    const fallbackStage = isProduction ? 'strict' : 'balanced';
    const configuredStage = (process.env.CSP_STAGE || fallbackStage).toLowerCase();

    if (configuredStage === 'compat' || configuredStage === 'balanced' || configuredStage === 'strict') {
        return configuredStage;
    }

    return fallbackStage;
}

function getCspFlags(stage: CspStage, isProduction: boolean) {
    if (stage === 'strict') {
        return {
            allowUnsafeInline: false,
            allowUnsafeEval: !isProduction,
            includeNonce: true,
            includeStrictDynamic: true,
        } satisfies CspFlags;
    }

    return {
        // `compat` and `balanced` remain available as rollback stages for
        // routes that are not ready for request-bound nonce rendering.
        allowUnsafeInline: true,
        allowUnsafeEval: !isProduction,
        includeNonce: false,
        includeStrictDynamic: false,
    } satisfies CspFlags;
}

export function buildCsp({ frameAncestors, nonce }: CspOptions): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const cspStage = getCspStage(isProduction);
    const {
        allowUnsafeInline,
        allowUnsafeEval,
        includeNonce,
        includeStrictDynamic,
    } = getCspFlags(cspStage, isProduction);

    const scriptSrc = [
        "'self'",
        includeNonce ? `'nonce-${nonce}'` : null,
        includeStrictDynamic ? "'strict-dynamic'" : null,
        allowUnsafeInline ? "'unsafe-inline'" : null,
        allowUnsafeEval ? "'unsafe-eval'" : null,
        'https://cdnjs.cloudflare.com',
        'https://js.sentry-cdn.com',
        'https://cdn.paddle.com',
        'https://public.profitwell.com',
        'https://us.i.posthog.com',
        'https://us-assets.i.posthog.com',
        'https://www.googletagmanager.com',
    ].filter(Boolean).join(' ');

    return `
        default-src 'self';
        script-src ${scriptSrc};
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.paddle.com;
        style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.paddle.com;
        img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
        font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:;
        connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co https://api.bigdatacloud.net https://buy.paddle.com https://sandbox-buy.paddle.com https://*.paddle.com https://us.i.posthog.com https://us-assets.i.posthog.com https://www.google-analytics.com https://region1.google-analytics.com;
        frame-src 'self' https://buy.paddle.com https://sandbox-buy.paddle.com https://*.paddle.com;
        frame-ancestors ${frameAncestors};
        base-uri 'self';
        form-action 'self';
        object-src 'none';
    `.replace(/\s+/g, ' ').trim();
}
