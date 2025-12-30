'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AdminCrumb = {
    label: string;
    href?: string;
    icon?: ReactNode;
};

const SEGMENT_LABELS: Record<string, string> = {
    admin: 'Admin',
    ingestion: 'Ingestion',
    'update-queue': 'Update Queue',
    moderation: 'Moderation',
    enrichment: 'Enrichment',
    'field-protection': 'Field Protection',
    utilities: 'Utilities',
    activity: 'API Activity',
    reports: 'Reports',
};

function formatSegment(segment: string) {
    const decoded = decodeURIComponent(segment);
    if (SEGMENT_LABELS[decoded]) {
        return SEGMENT_LABELS[decoded];
    }
    const normalized = decoded.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function isDynamicSegment(segment: string) {
    return segment.includes('%5B') || segment.includes('%5D') || segment.startsWith('[') || /\d/.test(segment);
}

export default function AdminBreadcrumbs({ trail = [] }: { trail?: AdminCrumb[] }) {
    const pathname = usePathname();

    const breadcrumbs = useMemo(() => {
        const segments = pathname
            .split('/')
            .filter(Boolean);

        const adminIndex = segments.indexOf('admin');
        if (adminIndex === -1) {
            return trail;
        }

        const baseSegments = segments.slice(0, adminIndex + 1);
        const remainder = segments.slice(adminIndex + 1);

        const crumbs: AdminCrumb[] = baseSegments.map((segment, index) => {
            const href = '/' + segments.slice(0, adminIndex + 1).slice(0, index + 1).join('/');
            return {
                label: formatSegment(segment),
                href,
            };
        });

        remainder.forEach((segment, index) => {
            const hrefSegments = segments.slice(0, adminIndex + 1 + index + 1);
            const href = '/' + hrefSegments.join('/');
            crumbs.push({
                label: formatSegment(segment),
                href: isDynamicSegment(segment) ? undefined : href,
            });
        });

        return [...crumbs, ...trail];
    }, [pathname, trail]);

    if (breadcrumbs.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Admin breadcrumbs" className="flex items-center gap-2 text-xs text-foreground-tertiary">
            {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const content = crumb.href && !isLast ? (
                    <Link
                        href={crumb.href}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-foreground-secondary transition hover:bg-accent-primary-light hover:text-foreground-primary"
                    >
                        {crumb.icon}
                        <span>{crumb.label}</span>
                    </Link>
                ) : (
                    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5', isLast && 'text-foreground-primary')}>
                        {crumb.icon}
                        <span>{crumb.label}</span>
                    </span>
                );

                return (
                    <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                        {content}
                        {!isLast && <span className="text-foreground-muted">/</span>}
                    </span>
                );
            })}
        </nav>
    );
}


