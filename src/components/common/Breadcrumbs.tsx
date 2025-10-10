'use client';

import Link from 'next/link';

type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ base = [{ label: 'Home', href: '/' }], trail = [] as Crumb[] }: { base?: Crumb[]; trail?: Crumb[] }) {

  const items: Crumb[] = [...base, ...trail];

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const content = isLast || !item.href ? (
            <span className="text-foreground-tertiary">{item.label}</span>
          ) : (
            <Link href={item.href} className="text-foreground-secondary hover:text-foreground-primary transition-colors">
              {item.label}
            </Link>
          );
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-2">
              {content}
              {!isLast && <span className="text-foreground-tertiary">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


