'use client';

import type { FormEvent } from 'react';

import { useEffect, useRef, useActionState, useState, useMemo, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { submitContactFormAction, type ContactFormState } from './actions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Button } from '@/components/ui/button';
import {
    CircleNotchIcon,
    GithubLogo,
    DiscordLogo,
    Bug,
    Lightbulb,
    Chat,
    MagnifyingGlass,
    Command,
    ArrowUpRight,
} from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        description: 'Share feedback or ideas for the roadmap.',
        keywords: ['feature', 'idea', 'feedback', 'roadmap'],
        type: 'form',
        subject: 'feedback',
    },
    {
        id: 'bug',
        label: 'Report a Bug',
        description: 'File an issue in our public GitHub tracker.',
        keywords: ['bug', 'issue', 'error', 'github'],
        type: 'link',
        href: 'https://github.com/SarmadC/tech-cal/issues',
        target: '_blank',
    },
    {
        id: 'community',
        label: 'Join the Community',
        description: 'Connect with other builders on Discord.',
        keywords: ['discord', 'community', 'discussion', 'chat'],
        type: 'link',
        href: 'https://discord.gg/kure-cal',
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

type SubmitButtonProps = {
    disabled?: boolean;
};

function SubmitButton({ disabled = false }: SubmitButtonProps) {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            className="w-full bg-accent-primary hover:bg-accent-primary-hover !text-accent-primary-foreground h-10 font-medium"
        >
            {pending && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Sending...' : 'Send Message'}
        </Button>
    );
}
export default function ContactPage() {
    const formRef = useRef<HTMLFormElement>(null);
    const { showSuccess, showError } = useSnackbar();
    const initialState: ContactFormState = { message: '', success: false, errors: {} };
    const [state, formAction] = useActionState(submitContactFormAction, initialState);
    const [showForm, setShowForm] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const formSectionRef = useRef<HTMLDivElement>(null);
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

    const focusFormSection = useCallback(() => {
        if (formSectionRef.current) {
            formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                showSuccess(`Message Sent! ${state.message}`);
                formRef.current?.reset();
                setSelectedSubject('');
            } else {
                const errorDescription = Object.values(state.errors || {}).flat().join(' ');
                showError(`Submission Failed: ${errorDescription || state.message}`);
            }
        }
    }, [state, showSuccess, showError]);

    useEffect(() => {
        if (showForm) {
            focusFormSection();
        }
    }, [showForm, focusFormSection]);

    const handleOpenForm = useCallback((subject?: string) => {
        setSelectedSubject(subject ?? '');
        if (!showForm) {
            setShowForm(true);
            return;
        }
        focusFormSection();
    }, [focusFormSection, showForm]);

    const handleShortcutAction = useCallback((shortcut: SupportShortcut) => {
        if (shortcut.type === 'form' && shortcut.subject) {
            handleOpenForm(shortcut.subject);
            return;
        }

        if (shortcut.type === 'link' && shortcut.href) {
            if (shortcut.target === '_blank') {
                window.open(shortcut.href, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = shortcut.href;
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
        <main className="min-h-screen bg-background text-foreground-primary selection:bg-neutral-800 font-sans">
            <section className="pt-32 pb-16 px-6 relative">
                <div className="max-w-[1200px] mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground-primary mb-8">
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
            <div className="max-w-[1200px] mx-auto px-6 pb-24">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="group p-6 rounded-xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground-primary">Issues</h3>
                            <Bug className="h-5 w-5 text-neutral-500 group-hover:text-white transition-colors" />
                        </div>
                        <p className="text-neutral-400 text-sm mb-8 min-h-[40px]">
                            Found a bug? We'd love to hear about it. Check our GitHub issues or report a new one.
                        </p>
                        <a
                            href="https://github.com/SarmadC/tech-cal/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors"
                        >
                            Open GitHub Issue
                            <GithubLogo className="ml-2 h-3.5 w-3.5" />
                        </a>
                    </div>

                    <div className="group p-6 rounded-xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground-primary">Feature requests</h3>
                            <Lightbulb className="h-5 w-5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <p className="text-neutral-400 text-sm mb-8 min-h-[40px]">
                            Want to suggest a new feature? Send us a request directly via our feedback form.
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
                            Join our GitHub discussions or Discord server for help and general questions.
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href="https://github.com/SarmadC/tech-cal/discussions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors"
                            >
                                Discussions
                                <GithubLogo className="ml-2 h-3.5 w-3.5" />
                            </a>
                            <a
                                href="https://discord.gg/kure-cal"
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

                <div className="mt-12 p-8 rounded-2xl bg-neutral-900/20 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <h2 className="text-xl font-semibold text-foreground-primary mb-2">
                            Can't find what you're looking for?
                        </h2>
                        <p className="text-neutral-400 text-sm">
                            The KureCal Support Team is ready to help. Response time varies depending on plan type.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => handleOpenForm('sales')}
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-md border border-neutral-700 transition-colors"
                        >
                            Contact Enterprise Sales
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenForm('support')}
                            className="flex items-center text-neutral-400 hover:text-white text-sm font-medium transition-colors"
                        >
                            Open Ticket
                            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {showForm && (
                    <div ref={formSectionRef} className="mt-16 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-semibold text-foreground-primary mb-2">Send us a message</h2>
                                <p className="text-neutral-400">We'll get back to you as soon as possible.</p>
                            </div>
                            <div className="bg-neutral-900/30 rounded-2xl p-8 border border-neutral-800 backdrop-blur-sm">
                                <form ref={formRef} action={formAction} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="name" className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Name</label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                required
                                                className="w-full px-4 py-2.5 bg-black/50 border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary placeholder:text-neutral-700 transition-all hover:border-neutral-700"
                                                placeholder="John Doe"
                                            />
                                            {state.errors?.name && <p className="text-red-500 text-xs mt-1">{state.errors.name[0]}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Email</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                required
                                                className="w-full px-4 py-2.5 bg-black/50 border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary placeholder:text-neutral-700 transition-all hover:border-neutral-700"
                                                placeholder="john@company.com"
                                            />
                                            {state.errors?.email && <p className="text-red-500 text-xs mt-1">{state.errors.email[0]}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="company" className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Company</label>
                                            <input
                                                type="text"
                                                id="company"
                                                name="company"
                                                className="w-full px-4 py-2.5 bg-black/50 border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary placeholder:text-neutral-700 transition-all hover:border-neutral-700"
                                                placeholder="Acme Inc."
                                            />
                                        </div>
                                        <div>
                                            <label id="subject-label" htmlFor="subject" className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Subject</label>
                                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                                <SelectTrigger
                                                    id="subject"
                                                    aria-required="true"
                                                    className="w-full bg-black/50 border-neutral-800 text-white h-[42px] focus:ring-accent-primary focus:ring-1"
                                                >
                                                    <SelectValue placeholder="Select a subject..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                                    <SelectItem value="general">General Inquiry</SelectItem>
                                                    <SelectItem value="sales">Enterprise Sales</SelectItem>
                                                    <SelectItem value="support">Technical Support</SelectItem>
                                                    <SelectItem value="feedback">Feature Request / Feedback</SelectItem>
                                                    <SelectItem value="partnership">Partnership</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <input type="hidden" name="subject" value={selectedSubject} />
                                            {state.errors?.subject && <p className="text-red-500 text-xs mt-1">{state.errors.subject[0]}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="block text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">Message</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            required
                                            rows={4}
                                            className="w-full px-4 py-2.5 bg-black/50 border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary placeholder:text-neutral-700 resize-none transition-all hover:border-neutral-700"
                                            placeholder="How can we help you today?"
                                        />
                                        {state.errors?.message && <p className="text-red-500 text-xs mt-1">{state.errors.message[0]}</p>}
                                    </div>

                                    <SubmitButton disabled={!selectedSubject} />

                                    {state.errors?._form && (
                                        <div className="mt-2 text-sm text-red-500 text-center" aria-live="polite">
                                            {state.errors._form[0]}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-neutral-900 mx-auto max-w-[1200px]" />
        </main>
    );
}

