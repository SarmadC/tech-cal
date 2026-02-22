'use client';

import { useState } from 'react';
import { SITE_URL } from '@/config/site';

interface EmbedButtonProps {
    slug: string;
    title: string;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function buildEmbedIframeCode(slug: string, title: string): string {
    const embedUrl = `${SITE_URL}/embed/${encodeURIComponent(slug)}`;
    const safeTitle = escapeHtmlAttribute(title);
    return `<iframe src="${embedUrl}" width="100%" height="200" style="border:none;border-radius:8px;" title="${safeTitle}" loading="lazy"></iframe>`;
}

export function EmbedButton({ slug, title }: EmbedButtonProps) {
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState(false);

    const embedCode = buildEmbedIframeCode(slug, title);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = embedCode;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!showCode) {
        return (
            <button
                onClick={() => setShowCode(true)}
                className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary/70 hover:text-foreground-secondary transition-colors"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Embed this event
            </button>
        );
    }

    return (
        <div className="space-y-2">
            <span className="text-[11px] text-foreground-tertiary/70 block">Embed Code</span>
            <div className="relative">
                <pre className="text-[10px] text-foreground-tertiary bg-background-main/60 border border-border-subtle rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {embedCode}
                </pre>
                <button
                    onClick={handleCopy}
                    className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-foreground-tertiary hover:text-foreground-primary hover:bg-white/[0.1] transition-colors"
                >
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
}
