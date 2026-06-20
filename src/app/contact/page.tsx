'use client';

import { useMemo, useState, useCallback, type FormEvent } from 'react';
import {
    DiscordLogo,
    Bug,
    Lightbulb,
    Chat,
    MagnifyingGlass,
    Command,
    ArrowUpRight,
} from '@phosphor-icons/react';
import { ContactForm } from './ContactForm';

type SupportShortcut = {
    id: string;
    label: string;
    description: string;
    keywords: string[];
    type: 'link' | 'form';
    href?: string;
    target?: '_blank' | '_self';
    subject?: string;
};

const SEARCH_RESULTS_LIMIT = 4;

const supportShortcuts: SupportShortcut[] = [
    {
        id: 'support',
        label: 'Contact Support',
        description: 'Open a direct ticket with the KureCal team.',
        keywords: ['support', 'ticket', 'help', 'contact', 'issue'],
        type: 'form',
        subject: 'support',
    },
    {
        id: 'sales',
        label: 'Talk to Sales',
        description: 'Chat with us about enterprise plans or billing.',
        keywords: ['sales', 'pricing', 'invoice', 'enterprise', 'quote'],
        type: 'form',
        subject: 'sales',
    },
    {
        id: 'feature',
        label: 'Request a Feature',
        description: 'Share feedback or ideas for the roadmap (tracked in Linear).',
        keywords: ['feature', 'idea', 'feedback', 'roadmap'],
        type: 'form',
        subject: 'feedback',
    },
    {
        id: 'bug',
        label: 'Report a Bug',
        description: 'Report a bug and we’ll track it in Linear.',
        keywords: ['bug', 'issue', 'error', 'linear'],
        type: 'form',
        subject: 'bug_report',
    },
    {
        id: 'community',
        label: 'Join the Community',
        description: 'Connect with other builders on Discord.',
        keywords: ['discord', 'community', 'discussion', 'chat'],
        type: 'link',
        href: 'https://discord.gg/k9BDw8Jq',
        target: '_blank',
    },
    {
        id: 'faq',
        label: 'Read the FAQ',
        description: 'Review answers to pricing and product questions.',
        keywords: ['faq', 'docs', 'documentation', 'questions'],
        type: 'link',
        href: '/pricing#faq',
        target: '_self',
    },
];

const defaultShortcut = supportShortcuts[0];

export default function ContactPage() {
    const [showForm, setShowForm] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredShortcuts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return supportShortcuts.slice(0, SEARCH_RESULTS_LIMIT);
        }
        return supportShortcuts
            .filter((shortcut) => {
                const haystack = `${shortcut.label} ${shortcut.description} ${shortcut.keywords.join(' ')}`.toLowerCase();
                return haystack.includes(query);
            })
            .slice(0, SEARCH_RESULTS_LIMIT);
    }, [searchQuery]);

    const handleOpenForm = useCallback((subject?: string) => {
        setSelectedSubject(subject ?? '');
        if (!showForm) {
            setShowForm(true);
        }
        // Smooth scroll to form if needed, but with the new design it's likely prominent enough
        setTimeout(() => {
            document.getElementById('contact-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [showForm]);

    const handleShortcutAction = useCallback((shortcut: SupportShortcut) => {
        if (shortcut.type === 'form' && shortcut.subject) {
            handleOpenForm(shortcut.subject);
            return;
        }

        if (shortcut.type === 'link' && shortcut.href) {
            const href = shortcut.href;
            const isSafe = href.startsWith('/') || href.startsWith('https://');
            if (!isSafe) return;
            if (shortcut.target === '_blank') {
                window.open(href, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = href;
            }
        }
    }, [handleOpenForm]);

    const handleSearchSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const shortcut = filteredShortcuts[0] ?? defaultShortcut;
        if (shortcut) {
            handleShortcutAction(shortcut);
            setSearchQuery('');
        }
    }, [filteredShortcuts, handleShortcutAction]);

    const handleSearchResultClick = useCallback((shortcut: SupportShortcut) => {
        handleShortcutAction(shortcut);
        setSearchQuery('');
    }, [handleShortcutAction]);

    const searchResultsVisible = searchQuery.trim().length > 0;

    return (
        <main className="responsive-page-shell min-h-[100dvh] bg-background text-foreground-primary selection:bg-neutral-800 font-sans">
            <section className="relative px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
                <div className="max-w-[1200px] mx-auto text-center relative z-10">
                    <h1 className="mb-6 text-4xl font-semibold tracking-tight text-foreground-primary md:text-6xl">
                        Hello, how can we help?
                    </h1>
                    <div className="max-w-xl mx-auto relative">
                        <form onSubmit={handleSearchSubmit} className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MagnifyingGlass className="h-5 w-5 text-neutral-500 group-hover:text-neutral-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search help topics (e.g. sales, support, feature request)"
                                aria-label="Search support resources"
                                className="block w-full pl-11 pr-16 py-3.5 bg-neutral-900/50 border border-neutral-800 text-neutral-300 rounded-lg focus:ring-1 focus:ring-neutral-700 focus:border-neutral-700 sm:text-sm placeholder:text-neutral-600 transition-all hover:bg-neutral-900 hover:border-neutral-700"
                            />
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <div className="flex items-center gap-1 px-1.5 py-1 rounded border border-neutral-800 bg-neutral-900/50">
                                    <Command className="h-3 w-3 text-neutral-500" />
                                    <span className="text-xs text-neutral-500 font-sans">K</span>
                                </div>
                            </div>
                        </form>
                        {searchResultsVisible && (
                            <div className="absolute left-0 right-0 mt-3 rounded-xl border border-neutral-800 bg-neutral-900/90 backdrop-blur-lg shadow-2xl shadow-black/50 p-2 z-30">
                                {filteredShortcuts.length ? (
                                    filteredShortcuts.map((shortcut) => (
                                        <button
                                            key={shortcut.id}
                                            type="button"
                                            onClick={() => handleSearchResultClick(shortcut)}
                                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary flex items-center justify-between gap-3 transition-colors"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-white">{shortcut.label}</p>
                                                <p className="text-xs text-neutral-400">{shortcut.description}</p>
                                            </div>
                                            <ArrowUpRight className="h-4 w-4 text-neutral-500" />
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-xs text-neutral-400 px-3 py-2.5">
                                        No quick actions matched your search. Try contacting support directly.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-neutral-900/20 blur-[120px] rounded-full -z-0 pointer-events-none" />
            </section>

            <div className="mx-auto max-w-[1200px] space-y-16 px-4 pb-20 sm:space-y-24 sm:px-6 sm:pb-24">

                {/* Contact Options Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="group p-6 rounded-xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground-primary">Issues</h3>
                            <Bug className="h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-neutral-400 text-sm mb-8 min-h-[40px]">
                            Found a bug? Report it here and we’ll track it in Linear.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleOpenForm('bug_report')}
                            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors w-max"
                        >
                            Report an issue
                            <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="group p-6 rounded-xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground-primary">Feature requests</h3>
                            <Lightbulb className="h-5 w-5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <p className="text-neutral-400 text-sm mb-8 min-h-[40px]">
                            Want to suggest a new feature? Send us a request and we’ll track it in Linear.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleOpenForm('feedback')}
                            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors w-max"
                        >
                            Request feature
                            <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="group p-6 rounded-xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground-primary">Ask the Community</h3>
                            <Chat className="h-5 w-5 text-neutral-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-neutral-400 text-sm mb-8 min-h-[40px]">
                            Join our Discord server for help and general questions.
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href="https://discord.gg/k9BDw8Jq"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-black bg-white hover:bg-neutral-200 border border-white rounded-md transition-colors"
                            >
                                Join Discord
                                <DiscordLogo className="ml-2 h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Additional Help Section */}
                <div className="flex flex-col gap-6 rounded-2xl border border-neutral-800 bg-neutral-900/20 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                    <div className="max-w-xl">
                        <h2 className="text-xl font-semibold text-foreground-primary mb-2">
                            Can't find what you're looking for?
                        </h2>
                        <p className="text-neutral-400 text-sm">
                            The KureCal Support Team is ready to help. Response time varies depending on plan type.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                        <button
                            type="button"
                            onClick={() => handleOpenForm('sales')}
                            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 sm:w-auto"
                        >
                            Contact Enterprise Sales
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenForm('support')}
                            className="flex items-center justify-center text-sm font-medium text-neutral-400 transition-colors hover:text-white sm:justify-start"
                        >
                            Open Ticket
                            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Contact Form Section */}
                <div id="contact-form-section" className="scroll-mt-32">
                    {showForm ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in">
                            <ContactForm initialSubject={selectedSubject} onClose={() => setShowForm(false)} />
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-neutral-500 text-sm">
                                Select an option above to contact us.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-[1200px] border-t border-neutral-900" />
        </main>
    );
}
