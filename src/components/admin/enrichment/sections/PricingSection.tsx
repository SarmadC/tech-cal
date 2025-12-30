'use client';

import type { PricingSectionProps, PricingTypeEnum } from '../types';

export function PricingSection({
    coreFields,
    setCoreFields,
}: Omit<PricingSectionProps, 'expanded' | 'onToggle'>) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <h3 className="text-lg font-medium text-foreground-primary">Pricing</h3>
            </div>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Pricing Type</label>
                    <select
                        value={coreFields.pricing_type || ''}
                        onChange={(e) => {
                            const value = e.target.value as PricingTypeEnum | '';
                            setCoreFields(prev => ({
                                ...prev,
                                pricing_type: value ? (value as PricingTypeEnum) : null,
                            }));
                        }}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                    >
                        <option value="" className="bg-background-main">Select Pricing Type</option>
                        <option value="Free" className="bg-background-main">Free</option>
                        <option value="Paid" className="bg-background-main">Paid</option>
                        <option value="Varies" className="bg-background-main">Varies</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Min Price</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={coreFields.price_min ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, price_min: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Max Price</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={coreFields.price_max ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, price_max: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Currency</label>
                    <input
                        type="text"
                        placeholder="USD, EUR, etc."
                        value={coreFields.currency}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                    />
                </div>
            </div>
        </div>
    );
}
