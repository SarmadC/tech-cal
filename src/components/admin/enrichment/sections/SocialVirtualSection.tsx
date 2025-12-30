'use client';

import type { SocialVirtualSectionProps } from '../types';

export function SocialVirtualSection({
    coreFields,
    setCoreFields,
}: Omit<SocialVirtualSectionProps, 'expanded' | 'onToggle'>) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <h3 className="text-lg font-medium text-foreground-primary">Social & Virtual</h3>
            </div>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Social Media Hashtag</label>
                    <input
                        type="text"
                        placeholder="#hashtag"
                        value={coreFields.social_media_hashtag}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, social_media_hashtag: e.target.value }))}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Virtual Platform</label>
                    <input
                        type="text"
                        placeholder="Zoom, Google Meet, etc."
                        value={coreFields.virtual_platform}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, virtual_platform: e.target.value }))}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                    />
                </div>
            </div>
        </div>
    );
}
