'use client';

import { useState } from 'react';

interface BlogShareButtonsProps {
    title: string;
    url: string;
}

function openSharePopup(url: string) {
    const width = 600;
    const height = 640;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    window.open(
        url,
        'share-dialog',
        `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`
    );
}

export function BlogShareButtons({ title, url }: BlogShareButtonsProps) {
    const [copied, setCopied] = useState(false);

    const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    const buttonClasses = 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="mt-4 flex gap-3">
            <button
                type="button"
                onClick={() => openSharePopup(xShareUrl)}
                aria-label="Share on X (Twitter)"
                className={`${buttonClasses} hover:bg-white/[0.08] hover:text-white`}
            >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM16.482 19.333h1.833L7.084 4.126H5.117z" />
                </svg>
            </button>

            <button
                type="button"
                onClick={() => openSharePopup(linkedInShareUrl)}
                aria-label="Share on LinkedIn"
                className={`${buttonClasses} hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white`}
            >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 22.227.792 23 1.771 23h20.451C23.2 23 24 22.227 24 21.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            </button>

            <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Link copied' : 'Copy link'}
                className={`${buttonClasses} hover:bg-white/[0.08] hover:text-white`}
            >
                {copied ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
                    </svg>
                )}
            </button>
        </div>
    );
}
