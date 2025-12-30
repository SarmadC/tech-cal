'use client';

import type { FeaturesSectionProps } from '../types';

export function FeaturesSection({
    coreFields,
    setCoreFields,
}: Omit<FeaturesSectionProps, 'expanded' | 'onToggle'>) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <h3 className="text-lg font-medium text-foreground-primary">Features</h3>
            </div>
            <div className="grid gap-4">
                <div className="flex flex-col gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={coreFields.certificate_offered}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, certificate_offered: e.target.checked }))}
                            className="rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                        />
                        <span className="text-sm text-foreground-tertiary">Certificate Offered</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={coreFields.recording_available}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, recording_available: e.target.checked }))}
                            className="rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                        />
                        <span className="text-sm text-foreground-tertiary">Recording Available</span>
                    </label>
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Accessibility Features (JSON)</label>
                    <textarea
                        placeholder='{"wheelchair_accessible": true}'
                        value={coreFields.accessibility_features ? JSON.stringify(coreFields.accessibility_features, null, 2) : ''}
                        onChange={(e) => {
                            try {
                                const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                                setCoreFields(prev => ({ ...prev, accessibility_features: parsed }));
                            } catch {
                                // Invalid JSON, keep as is
                            }
                        }}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors font-mono placeholder:text-foreground-muted resize-none"
                        rows={4}
                    />
                </div>
            </div>
        </div>
    );
}
