"use client";

import { startTransition, useEffect, useMemo, useState } from 'react';

type TocNode = {
    id: string;
    text: string;
    level: number;
    children: TocNode[];
};

type TableOfContentsProps = {
    variant?: 'desktop' | 'mobile';
    stickyTop?: number;
};

function buildHeadingId(text: string, index: number): string {
    const generatedId = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    return generatedId || `heading-${index}`;
}

function collectHeadingIds(nodes: TocNode[]): string[] {
    return nodes.flatMap((node) => [node.id, ...node.children.map((child) => child.id)]);
}

export function TableOfContents({
    variant = 'desktop',
    stickyTop = 96,
}: TableOfContentsProps) {
    const [headings, setHeadings] = useState<TocNode[]>([]);
    const [activeId, setActiveId] = useState<string>('');
    const [isOpen, setIsOpen] = useState(variant === 'desktop');
    const [expandAll, setExpandAll] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const [readingProgress, setReadingProgress] = useState(0);

    useEffect(() => {
        const elements = Array.from(
            document.querySelectorAll<HTMLElement>('[data-blog-content] h2, [data-blog-content] h3')
        );

        elements.forEach((el, index) => {
            if (!el.id) {
                el.id = buildHeadingId(el.textContent || '', index);
            }
        });

        const nodes: TocNode[] = [];
        let currentH2: TocNode | null = null;

        elements.forEach((el) => {
            const level = Number(el.tagName.substring(1));
            const node: TocNode = {
                id: el.id,
                text: el.textContent || '',
                level,
                children: [],
            };

            if (level === 2) {
                nodes.push(node);
                currentH2 = node;
                return;
            }

            if (level === 3 && currentH2) {
                currentH2.children.push(node);
                return;
            }

            nodes.push(node);
        });

        startTransition(() => {
            setHeadings(nodes);
        });

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter((entry) => entry.isIntersecting);
                if (visibleEntries.length === 0) {
                    return;
                }

                visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                setActiveId(visibleEntries[0].target.id);
            },
            { rootMargin: '-18% 0px -55% 0px' }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const article = document.querySelector<HTMLElement>('[data-blog-content]');
        if (!article) {
            return;
        }

        const updateProgress = () => {
            const rect = article.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const articleHeight = Math.max(article.offsetHeight - viewportHeight * 0.55, 1);
            const consumed = Math.min(Math.max(-rect.top + viewportHeight * 0.18, 0), articleHeight);
            setReadingProgress(Math.round((consumed / articleHeight) * 100));
        };

        updateProgress();
        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress);
        return () => {
            window.removeEventListener('scroll', updateProgress);
            window.removeEventListener('resize', updateProgress);
        };
    }, []);

    const headingIds = useMemo(() => collectHeadingIds(headings), [headings]);
    const activeIndex = headingIds.indexOf(activeId);
    const progressLabel = headingIds.length > 0 && activeIndex >= 0
        ? `${activeIndex + 1} of ${headingIds.length}`
        : `${headingIds.length} sections`;

    const scrollToId = (id: string) => {
        const target = document.getElementById(id);
        if (!target) {
            return;
        }

        const y = target.getBoundingClientRect().top + window.scrollY - stickyTop - 8;
        window.scrollTo({ top: y, behavior: 'smooth' });

        if (variant === 'mobile') {
            setIsOpen(false);
        }
    };

    const toggleSection = (id: string) => {
        setExpandedSections((current) => (
            current.includes(id)
                ? current.filter((sectionId) => sectionId !== id)
                : [...current, id]
        ));
    };

    const renderNode = (node: TocNode, isChild = false) => {
        const isActive = activeId === node.id;
        const hasActiveChild = node.children.some((child) => child.id === activeId);
        const isExpanded = expandedSections.includes(node.id);
        const showChildren = !isChild && node.children.length > 0 && (expandAll || isExpanded || isActive || hasActiveChild);

        return (
            <li key={node.id} className={isChild ? 'mt-1' : 'mt-2'}>
                <div className={`flex items-start gap-2 ${isChild ? '' : 'min-h-8'}`}>
                    {!isChild && (
                        <span
                            className={`mt-[0.78rem] h-5 w-px shrink-0 transition-colors ${isActive || hasActiveChild ? 'bg-zinc-200' : 'bg-white/[0.08]'}`}
                            aria-hidden="true"
                        />
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                            <a
                                href={`#${node.id}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    scrollToId(node.id);
                                }}
                                aria-current={isActive ? 'location' : undefined}
                                className={`group block min-w-0 flex-1 rounded-md py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#0B0C0E] ${isChild ? 'pl-4 pr-2' : 'pr-1'} ${isActive
                                    ? 'text-white'
                                    : hasActiveChild
                                        ? 'text-zinc-200'
                                        : isChild
                                            ? 'text-zinc-600 hover:text-zinc-400'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                <span className={`${isChild ? 'line-clamp-2' : 'line-clamp-3 text-pretty'}`}>
                                    {node.text}
                                </span>
                            </a>

                            {!isChild && node.children.length > 0 && !expandAll && (
                                <button
                                    type="button"
                                    onClick={() => toggleSection(node.id)}
                                    aria-label={`${showChildren ? 'Collapse' : 'Expand'} ${node.text}`}
                                    aria-expanded={showChildren}
                                    className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#0B0C0E]"
                                >
                                    <svg
                                        className={`h-3.5 w-3.5 transition-transform ${showChildren ? 'rotate-90 text-zinc-300' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {showChildren && (
                    <ul className="ml-3 mt-1 border-l border-white/[0.08] pl-3">
                        {node.children.map((child) => renderNode(child, true))}
                    </ul>
                )}
            </li>
        );
    };

    if (headings.length === 0) {
        return null;
    }

    if (variant === 'mobile') {
        return (
            <section className="mb-10 border-b border-white/10 pb-5 lg:hidden">
                <button
                    type="button"
                    onClick={() => setIsOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls="blog-mobile-toc"
                >
                    <div>
                        <p className="text-sm font-medium text-zinc-300">
                            Contents
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                            {progressLabel}
                        </p>
                    </div>
                    <svg
                        className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen ? (
                    <nav id="blog-mobile-toc" className="mt-4 border-t border-white/10 pt-4">
                        <ul className="space-y-1">
                            {headings.map((node) => renderNode(node))}
                        </ul>
                    </nav>
                ) : null}
            </section>
        );
    }

    return (
        <nav
            className="sticky top-24 h-fit self-start"
            style={{ top: `${stickyTop}px` }}
            aria-label="Table of contents"
        >
            <div className="border-l border-white/[0.08] pl-5">
                <div className="mb-5 border-b border-white/[0.08] pb-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] tracking-[0.08em] text-zinc-500">
                                Reading guide
                            </p>
                            <p className="mt-1 text-sm font-medium text-zinc-300">
                                On this page
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setExpandAll((current) => !current)}
                            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                        >
                            {expandAll ? 'Collapse all' : 'Expand all'}
                        </button>
                    </div>
                    <div className="mb-2 h-px overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                            className="h-full rounded-full bg-zinc-300 transition-[width] duration-300"
                            style={{ width: `${Math.max(readingProgress, 6)}%` }}
                        />
                    </div>
                    <p className="text-xs text-zinc-500">
                        {progressLabel} • {readingProgress}% read
                    </p>
                </div>

                <div
                    className="overflow-y-auto pr-1"
                    style={{ maxHeight: `calc(100vh - ${stickyTop + 56}px)` }}
                >
                    <ul className="space-y-1">
                        {headings.map((node) => renderNode(node))}
                    </ul>
                </div>

                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Back to top
                </button>
            </div>
        </nav>
    );
}
