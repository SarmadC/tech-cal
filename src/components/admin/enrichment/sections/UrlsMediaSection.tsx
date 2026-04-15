'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import ImageExtractorModal from '@/components/admin/ImageExtractorModal';
import type { CoreFieldsState } from '../types';

interface UrlsMediaSectionProps {
    eventId: string;
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export function UrlsMediaSection({
    eventId,
    coreFields,
    setCoreFields,
    onSuccess,
    onError,
}: UrlsMediaSectionProps) {
    const [eventImageExtractorOpen, setEventImageExtractorOpen] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageUploadComplete, setImageUploadComplete] = useState(false);
    const [imagePreviewNonce, setImagePreviewNonce] = useState(() => Date.now());

    const getPreviewImageSrc = useCallback((url: string) => {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${imagePreviewNonce}`;
    }, [imagePreviewNonce]);

    const handleEventImageFromUrl = useCallback(async (imageUrl: string) => {
        setUploadingImage(true);
        setImageUploadComplete(false);

        try {
            const fetchResponse = await fetch('/api/admin/ingestion/enrichment/fetch-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            });
            const fetchData = await fetchResponse.json();
            if (!fetchResponse.ok) throw new Error(fetchData.error || 'Failed to fetch image');
            if (!fetchData.imageData || !fetchData.contentType || !fetchData.filename) {
                throw new Error('Invalid response from image fetch');
            }

            const binaryString = atob(fetchData.imageData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: fetchData.contentType });
            const file = new File([blob], fetchData.filename, {
                type: fetchData.contentType,
                lastModified: Date.now(),
            });

            const formData = new FormData();
            formData.append('eventId', eventId);
            formData.append('file', file);

            const uploadResponse = await fetch('/api/admin/ingestion/enrichment/image', {
                method: 'POST',
                body: formData,
            });
            const data = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(data.error || 'Failed to upload image');
            }

            if (data.imageUrl) {
                setCoreFields(prev => ({ ...prev, event_image_url: data.imageUrl }));
                setImagePreviewNonce(Date.now());
                setImageUploadComplete(true);
                onSuccess();
            }
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    }, [eventId, setCoreFields, onSuccess, onError]);

    const handleFileSelected = useCallback(async (file: File) => {
        setUploadingImage(true);
        setImageUploadComplete(false);

        const formData = new FormData();
        formData.append('eventId', eventId);
        formData.append('file', file);
        try {
            const response = await fetch('/api/admin/ingestion/enrichment/image', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok && data.imageUrl) {
                setCoreFields(prev => ({ ...prev, event_image_url: data.imageUrl }));
                setImagePreviewNonce(Date.now());
                setImageUploadComplete(true);
                onSuccess();
            } else {
                onError(data.error || 'Failed to upload image');
            }
        } catch {
            onError('Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
        setEventImageExtractorOpen(false);
    }, [eventId, setCoreFields, onSuccess, onError]);

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-lg font-medium text-foreground-primary">URLs & Media</h3>
                </div>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Source URL</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={coreFields.source_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, source_url: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Registration URL</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={coreFields.registration_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, registration_url: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Livestream URL</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={coreFields.livestream_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, livestream_url: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Agenda URL</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={coreFields.agenda_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, agenda_url: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2 pt-4">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Event Image</label>
                        <div className="flex items-start gap-4">
                            {coreFields.event_image_url && (
                                <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-default bg-background-tertiary">
                                    <Image
                                        src={getPreviewImageSrc(coreFields.event_image_url)}
                                        alt="Event"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEventImageExtractorOpen(true)}
                                        disabled={uploadingImage}
                                        className="text-xs"
                                    >
                                        {uploadingImage ? (
                                            <BrandLoadingLogo size={16} inline label={null} className="mr-2" />
                                        ) : (
                                            <MaterialIcon name="image" size={16} className="mr-2" />
                                        )}
                                        {uploadingImage ? 'Uploading...' : 'Update Image'}
                                    </Button>
                                </div>
                                <p className="mt-2 text-xs text-foreground-muted">
                                    Recommended: 1200x630px or larger. JPG, PNG, WebP.
                                </p>
                                {imageUploadComplete && (
                                    <p className="mt-2 text-xs text-emerald-400">
                                        Image uploaded and applied to the event.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ImageExtractorModal
                isOpen={eventImageExtractorOpen}
                onClose={() => setEventImageExtractorOpen(false)}
                onSelect={handleEventImageFromUrl}
                onFileSelected={handleFileSelected}
                initialUrl={coreFields.source_url || coreFields.registration_url || ''}
                title="Update Event Image"
                description="Upload a file or extract from website"
                contextName=""
                context="event_image"
            />
        </>
    );
}
