'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PricingSectionProps, PricingTypeEnum } from '../types';

export function PricingSection({
    expanded,
    onToggle,
    coreFields,
    setCoreFields,
}: PricingSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Pricing</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    <select
                        value={coreFields.pricing_type || ''}
                        onChange={(e) => {
                            const value = e.target.value as PricingTypeEnum | '';
                            setCoreFields(prev => ({
                                ...prev,
                                pricing_type: value ? (value as PricingTypeEnum) : null,
                            }));
                        }}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="">Select Pricing Type</option>
                        <option value="Free">Free</option>
                        <option value="Paid">Paid</option>
                        <option value="Varies">Varies</option>
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Price Min"
                        value={coreFields.price_min ?? ''}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, price_min: e.target.value ? parseFloat(e.target.value) : null }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Price Max"
                        value={coreFields.price_max ?? ''}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, price_max: e.target.value ? parseFloat(e.target.value) : null }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Currency (ISO 4217, e.g., USD)"
                        value={coreFields.currency}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                </CardContent>
            )}
        </Card>
    );
}
