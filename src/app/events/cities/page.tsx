import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
    CaretRight,
    Sparkle,
} from '@phosphor-icons/react/ssr';
import { BreadcrumbJsonLd } from '@/components/seo';
import { SITE_URL } from '@/config/site';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';
import { createServiceClient } from '@/utils/supabase/service';
import { createClient } from '@/utils/supabase/server';
import {
    buildCitySummaries,
    buildCountrySummaries,
    CountrySummary,
    CitySummary,
    CitySummaryRow,
    dedupeCitySummariesBySlug,
} from '@/utils/citySummaries';
import CityDirectoryExplorer, { type RankedCitySummary } from './CityDirectoryExplorer';

export const revalidate = 3600;

type CityDirectoryData = {
    citySummaries: CitySummary[];
    countryEventCounts: Record<string, number>;
    countrySummaries: CountrySummary[];
};

export const metadata: Metadata = {
    title: 'Tech Events by City 2026 | Kure-Cal',
    description: 'Browse tech events by city. Explore upcoming conferences, meetups, hackathons, and workshops in the top tech hubs.',
    openGraph: {
        title: 'Tech Events by City 2026',
        description: 'Browse tech events by city and jump into the developer hubs with the most upcoming conferences, meetups, and hackathons.',
        type: 'website',
        url: `${SITE_URL}/events/cities`,
        images: [{ url: `${SITE_URL}/og-image.png` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Tech Events by City 2026',
        description: 'Browse tech events by city and explore the hubs with the most upcoming developer events.',
        images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
        canonical: `${SITE_URL}/events/cities`,
    },
};

async function getPublicReadClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
        return createServiceClient(supabaseUrl, serviceKey);
    }

    return await createClient();
}

const getCitySummaries = unstable_cache(
    async (): Promise<CityDirectoryData> => {
        const supabase = await getPublicReadClient();
        const now = new Date().toISOString();

        const { data } = await supabase
            .from('events')
            .select('location_city, location_country, start_time, title, slug, location_latitude, location_longitude')
            .eq('status', 'confirmed')
            .not('location_city', 'is', null)
            .gte('start_time', now);

        const rows = (data ?? []) as Array<CitySummaryRow & { location_country?: string | null }>;
        const countryEventCounts = rows.reduce<Record<string, number>>((acc, row) => {
            const country = row.location_country?.trim();

            if (!country) {
                return acc;
            }

            acc[country] = (acc[country] ?? 0) + 1;
            return acc;
        }, {});

        return {
            citySummaries: dedupeCitySummariesBySlug(buildCitySummaries(rows)),
            countryEventCounts,
            countrySummaries: buildCountrySummaries(rows),
        };
    },
    ['seo-city-summaries-v3'],
    { revalidate: 3600 }
);

const atlasGridStyle = {
    backgroundImage: [
        'linear-gradient(to right, var(--border-subtle) 1px, transparent 1px)',
        'linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '40px 40px',
    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 82%)',
} as const;

export function CityDirectoryPageView({
    citySummaries,
    countryEventCounts,
    countrySummaries,
    nonce,
}: {
    citySummaries: CitySummary[];
    countryEventCounts: Record<string, number>;
    countrySummaries: CountrySummary[];
    nonce: string;
}) {
    const rankedCities: RankedCitySummary[] = dedupeCitySummariesBySlug(citySummaries).map((city, index) => ({
        ...city,
        rank: index + 1,
    }));

    return (
        <>
            <BreadcrumbJsonLd
                nonce={nonce}
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Events', url: `${SITE_URL}/events` },
                    { name: 'Cities', url: `${SITE_URL}/events/cities` },
                ]}
            />

            <div className="responsive-page-shell relative min-h-[100dvh] overflow-hidden bg-background-main pb-20 lg:pb-24">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-[-8%] top-[-5rem] h-[32rem] w-[32rem] rounded-full bg-sky-400/12 blur-[140px]" />
                    <div className="absolute right-[-10%] top-20 h-[28rem] w-[28rem] rounded-full bg-cyan-300/8 blur-[160px]" />
                    <div className="absolute inset-0 opacity-40" style={atlasGridStyle} />
                </div>

                <header className="relative">
                    <div className="mx-auto max-w-[90rem] px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8">
                        <nav className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary/60">
                            <Link
                                href="/"
                                className="transition-colors hover:text-foreground-tertiary"
                            >
                                Home
                            </Link>
                            <span className="text-foreground-tertiary/30">/</span>
                            <Link
                                href="/events"
                                className="transition-colors hover:text-foreground-tertiary"
                            >
                                Events
                            </Link>
                            <span className="text-foreground-tertiary/30">/</span>
                            <span className="text-foreground-tertiary">Cities</span>
                        </nav>

                        <div className="mt-10">
                            <div className="max-w-4xl">
                                <h1 className="max-w-4xl text-4xl font-semibold leading-[0.94] tracking-[-0.05em] text-foreground-primary sm:text-5xl lg:text-[4.75rem]">
                                    City Directory
                                </h1>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="relative mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
                    {rankedCities.length > 0 ? (
                        <CityDirectoryExplorer
                            cities={rankedCities}
                            countryEventCounts={countryEventCounts}
                            countrySummaries={countrySummaries}
                        />
                    ) : (
                        <div className="rounded-[30px] border border-border-subtle bg-background-secondary/18 px-6 py-16 text-center backdrop-blur-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-700 dark:text-sky-200">
                                <Sparkle size={18} weight="fill" />
                            </div>
                            <h2 className="mt-5 text-xl font-medium text-foreground-primary">
                                No city pages available yet
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-foreground-secondary">
                                Confirmed upcoming events with normalized city data will surface here automatically once
                                the atlas has enough mapped locations to explore.
                            </p>
                            <Link
                                href="/events"
                                className="mt-6 inline-flex items-center gap-1 rounded-full border border-border-subtle bg-background-main/45 px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-sky-400/25 hover:text-foreground-primary"
                            >
                                Browse all events
                                <CaretRight size={14} weight="bold" />
                            </Link>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

export default async function CityDirectoryPage() {
    const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? '';
    const { citySummaries, countryEventCounts, countrySummaries } = await getCitySummaries();

    return (
        <CityDirectoryPageView
            citySummaries={citySummaries}
            countryEventCounts={countryEventCounts}
            countrySummaries={countrySummaries}
            nonce={nonce}
        />
    );
}
