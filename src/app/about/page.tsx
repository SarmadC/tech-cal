// src/app/about/page.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Kure-Cal - Our Mission & Story',
    description: 'Learn about Kure-Cal and our mission to make tech events easier to discover, track, and attend. We organize conferences, meetups, and hackathons into one trusted calendar.',
    openGraph: {
        title: 'About Kure-Cal - Our Mission & Story',
        description: 'Learn about Kure-Cal and our mission to make tech events easier to discover, track, and attend. We organize conferences, meetups, and hackathons into one trusted calendar.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About Kure-Cal - Our Mission & Story',
        description: 'Learn about Kure-Cal and our mission to make tech events easier to discover, track, and attend. We organize conferences, meetups, and hackathons into one trusted calendar.',
    },
};

export default function AboutPage() {
    return (
        <main id="main-content" className="responsive-page-shell min-h-[100dvh] bg-background-main pt-20">
            <section className="bg-background-secondary px-4 py-14 sm:px-6 sm:py-16">
                <div className="max-w-[1600px] mx-auto">
                    <h1 className="mb-6 text-3xl font-bold text-foreground-primary sm:text-4xl md:text-5xl">
                        About Kure-Cal
                    </h1>
                    <p className="max-w-3xl text-lg text-foreground-secondary sm:text-xl">
                        Kure-Cal helps developers and teams discover, track, and plan tech events without the
                        information overload. We organize conferences, meetups, hackathons, and live streams into one
                        trusted calendar so you can focus on what matters.
                    </p>
                </div>
            </section>

            <section className="px-4 py-10 sm:px-6 sm:py-12">
                <div className="max-w-[1600px] mx-auto grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground-primary">Our Mission</h2>
                        <p className="text-foreground-secondary">
                            We want every engineer, designer, and builder to have a clear path to the right events at
                            the right time. Kure-Cal surfaces the sessions that match your goals, skills, and schedule
                            so you never miss a key opportunity.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground-primary">What We Track</h2>
                        <p className="text-foreground-secondary">
                            From global conferences to local meetups, we index the best technical events, keep them
                            up to date, and make them searchable by topic, format, and experience level.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
