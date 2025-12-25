'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FeaturesSectionProps } from '../types';

export function FeaturesSection({
    expanded,
    onToggle,
    coreFields,
    setCoreFields,
}: FeaturesSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Features</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={coreFields.certificate_offered}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, certificate_offered: e.target.checked }))}
                        />
                        <span>Certificate Offered</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={coreFields.recording_available}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, recording_available: e.target.checked }))}
                        />
                        <span>Recording Available</span>
                    </label>
                    <div>
                        <label className="block text-sm font-medium mb-2">Accessibility Features (JSON)</label>
                        <textarea
                            placeholder='{"wheelchair_accessible": true, "sign_language": false}'
                            value={coreFields.accessibility_features ? JSON.stringify(coreFields.accessibility_features, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                                    setCoreFields(prev => ({ ...prev, accessibility_features: parsed }));
                                } catch {
                                    // Invalid JSON, keep as is
                                }
                            }}
                            className="w-full px-3 py-2 border rounded font-mono text-sm"
                            rows={4}
                        />
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
