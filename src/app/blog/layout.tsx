// src/app/blog/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Blog',
    description: 'Stay informed with the Kure-Cal blog. Insights, tutorials, and news from the tech events world. Learn about conferences, developer meetups, and industry trends.',
    keywords: ['tech blog', 'developer news', 'conference insights', 'tech events blog', 'programming tutorials'],
    openGraph: {
        title: 'Blog | Kure-Cal',
        description: 'Stay informed with insights, tutorials, and news from the tech events world.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Blog | Kure-Cal',
        description: 'Stay informed with insights, tutorials, and news from the tech events world.',
    },
};

export default function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
