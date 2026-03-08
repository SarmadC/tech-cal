export const CSP_NONCE_HEADER = 'x-csp-nonce';

type CspStage = 'compat' | 'balanced' | 'strict';

type CspOptions = {
    frameAncestors: string;
    nonce: string;
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
        return { allowUnsafeInline: false, allowUnsafeEval: false };
    }

    if (stage === 'compat') {
        return { allowUnsafeInline: true, allowUnsafeEval: true };
    }

    return {
        allowUnsafeInline: !isProduction,
        allowUnsafeEval: !isProduction,
    };
}

export function buildCsp({ frameAncestors, nonce }: CspOptions): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const cspStage = getCspStage(isProduction);
    const { allowUnsafeInline, allowUnsafeEval } = getCspFlags(cspStage, isProduction);

    const scriptSrc = [
        "'self'",
        `'nonce-${nonce}'`,
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
        img-src 'self' data: blob: https:;
        font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:;
        connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co https://api.bigdatacloud.net https://buy.paddle.com https://sandbox-buy.paddle.com https://*.paddle.com https://us.i.posthog.com https://us-assets.i.posthog.com https://www.google-analytics.com https://region1.google-analytics.com;
        frame-src 'self' https://buy.paddle.com https://sandbox-buy.paddle.com https://*.paddle.com;
        frame-ancestors ${frameAncestors};
        base-uri 'self';
        form-action 'self';
        object-src 'none';
    `.replace(/\s+/g, ' ').trim();
}
