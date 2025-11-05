/**
 * Field Protection Configuration Client Component
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProtectionRule {
    id: string;
    field_name: string;
    protection_mode: 'auto_update' | 'protected' | 'review_required';
    default_mode?: string | null;
    updated_at: string;
    updated_by?: string | null;
}

interface FieldProtectionClientProps {
    initialRules: ProtectionRule[];
}

const PROTECTION_MODE_LABELS = {
    auto_update: 'Auto-Update',
    protected: 'Protected',
    review_required: 'Review Required',
} as const;

const PROTECTION_MODE_COLORS = {
    auto_update: 'bg-green-100 text-green-800',
    protected: 'bg-yellow-100 text-yellow-800',
    review_required: 'bg-blue-100 text-blue-800',
} as const;

export default function FieldProtectionClient({ initialRules }: FieldProtectionClientProps) {
    const [rules, setRules] = useState<ProtectionRule[]>(initialRules);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleUpdate = async (fieldName: string, newMode: 'auto_update' | 'protected' | 'review_required') => {
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/ingestion/field-protection', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: [{ field_name: fieldName, protection_mode: newMode }],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update protection mode');
            }

            setMessage({ type: 'success', text: 'Protection mode updated successfully' });

            // Update local state
            setRules((prev) =>
                prev.map((rule) =>
                    rule.field_name === fieldName
                        ? { ...rule, protection_mode: newMode, updated_at: new Date().toISOString() }
                        : rule
                )
            );
        } catch (error) {
            console.error('Error updating protection mode:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to update protection mode',
            });
        } finally {
            setLoading(false);
        }
    };

    // Common event fields
    const commonFields = [
        'title',
        'description',
        'start_time',
        'end_time',
        'location',
        'source_url',
        'registration_url',
        'livestream_url',
        'speaker_lineup',
        'event_format',
        'tags',
        'audiences',
        'prerequisites',
    ];

    // Get all unique fields (from rules + common fields)
    const allFields = Array.from(
        new Set([...rules.map((r) => r.field_name), ...commonFields])
    ).sort();

    return (
        <div className="space-y-6">
            {message && (
                <div
                    className={`p-4 rounded-lg ${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-800'
                            : 'bg-red-50 text-red-800'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Field Protection Rules</CardTitle>
                    <p className="text-sm text-gray-600 mt-2">
                        Fields with manual edits are automatically protected. Protection modes determine how fields are handled during re-ingestion.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3 font-semibold">Field Name</th>
                                    <th className="text-left p-3 font-semibold">Protection Mode</th>
                                    <th className="text-left p-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allFields.map((fieldName) => {
                                    const rule = rules.find((r) => r.field_name === fieldName);
                                    const currentMode = rule?.protection_mode || 'review_required';

                                    return (
                                        <tr key={fieldName} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono text-sm">{fieldName}</td>
                                            <td className="p-3">
                                                <Badge
                                                    className={PROTECTION_MODE_COLORS[currentMode]}
                                                >
                                                    {PROTECTION_MODE_LABELS[currentMode]}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    {(['auto_update', 'review_required'] as const).map((mode) => (
                                                        <Button
                                                            key={mode}
                                                            size="sm"
                                                            variant={currentMode === mode ? 'default' : 'outline'}
                                                            onClick={() => handleUpdate(fieldName, mode)}
                                                            disabled={loading || currentMode === mode}
                                                            className="text-xs"
                                                        >
                                                            {PROTECTION_MODE_LABELS[mode]}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Protection Mode Explanations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Badge className="bg-green-100 text-green-800 mr-2">Auto-Update</Badge>
                        <span className="text-sm text-gray-600">
                            Fields are automatically updated during re-ingestion without review
                        </span>
                    </div>
                    <div>
                        <Badge className="bg-blue-100 text-blue-800 mr-2">Review Required</Badge>
                        <span className="text-sm text-gray-600">
                            Fields require admin approval before being updated
                        </span>
                    </div>
                    <div>
                        <Badge className="bg-yellow-100 text-yellow-800 mr-2">Protected</Badge>
                        <span className="text-sm text-gray-600">
                            Fields with manual edits are automatically protected and require review
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

