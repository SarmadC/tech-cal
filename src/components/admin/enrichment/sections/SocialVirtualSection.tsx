'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SocialVirtualSectionProps } from '../types';

export function SocialVirtualSection({
    expanded,
    onToggle,
    coreFields,
    setCoreFields,
}: SocialVirtualSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Social & Virtual</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    <input
                        type="text"
                        placeholder="Social Media Hashtag"
                        value={coreFields.social_media_hashtag}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, social_media_hashtag: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Virtual Platform"
                        value={coreFields.virtual_platform}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, virtual_platform: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                </CardContent>
            )}
        </Card>
    );
}
