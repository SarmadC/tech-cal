'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import ImageExtractorModal from '@/components/admin/ImageExtractorModal';
import type { OrganizerData } from '../types';
import type { Database } from '@/types/supabase';

type OrganizerRow = Database['public']['Tables']['organizers']['Row'];

interface OrganizerSectionProps {
    organizer: OrganizerRow | null | undefined;
    organizerData: OrganizerData;
    setOrganizerData: React.Dispatch<React.SetStateAction<OrganizerData>>;
    currentLogoUrl: string | null;
    setCurrentLogoUrl: React.Dispatch<React.SetStateAction<string | null>>;
    sourceUrl: string;
    onSuccess: () => void;
    onError: (error: string) => void;
    isCreatingOrganizer: boolean;
    setIsCreatingOrganizer: React.Dispatch<React.SetStateAction<boolean>>;
    createdOrganizerId: string | null;
    onOrganizerCreated: (organizerId: string) => void;
}

export function OrganizerSection({
    organizer,
    organizerData,
    setOrganizerData,
    currentLogoUrl,
    setCurrentLogoUrl,
    sourceUrl,
    onSuccess,
    onError,
    isCreatingOrganizer,
    setIsCreatingOrganizer,
    createdOrganizerId,
    onOrganizerCreated,
}: OrganizerSectionProps) {
    const [logoExtractorOpen, setLogoExtractorOpen] = useState(false);
    const [logoCreating, setLogoCreating] = useState(false);
    const [nameError, setNameError] = useState(false);

    // The effective organizer ID — either the persisted one or one created inline before main save
    const effectiveOrganizerId = organizer?.id || createdOrganizerId || null;

    /**
     * Called when the user clicks "Update Logo".
     * If we don't have an organizer ID yet (create mode), create the organizer first
     * so we have an ID to attach the logo to — then open the modal.
     */
    const handleLogoButtonClick = useCallback(async () => {
        if (effectiveOrganizerId) {
            setLogoExtractorOpen(true);
            return;
        }

        // Create mode: need a name before we can create the organizer
        if (!organizerData.name.trim()) {
            setNameError(true);
            return;
        }

        setLogoCreating(true);
        try {
            const res = await fetch('/api/admin/ingestion/enrichment/organizer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: organizerData.name.trim(),
                    description: organizerData.description?.trim() || null,
                    website_url: organizerData.website_url?.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create organizer');
            onOrganizerCreated(data.organizerId);
            setLogoExtractorOpen(true);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to create organizer');
        } finally {
            setLogoCreating(false);
        }
    }, [effectiveOrganizerId, organizerData, onOrganizerCreated, onError]);

    const handleLogoFromUrl = useCallback(async (imageUrl: string) => {
        if (!effectiveOrganizerId) {
            onError('No organizer to attach logo to');
            return;
        }

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
            formData.append('organizerId', effectiveOrganizerId);
            formData.append('file', file);

            const uploadResponse = await fetch('/api/admin/ingestion/enrichment/logo', {
                method: 'POST',
                body: formData,
            });
            const data = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(data.error || 'Failed to upload logo');
            }

            if (data.logoUrl) {
                const cleanUrl = data.logoUrl.split('?')[0];
                setCurrentLogoUrl(`${cleanUrl}?t=${Date.now()}`);
                onSuccess();
            }
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to upload logo');
        }
    }, [effectiveOrganizerId, setCurrentLogoUrl, onSuccess, onError]);

    const handleFileSelected = useCallback(async (file: File) => {
        if (!effectiveOrganizerId) return;
        const formData = new FormData();
        formData.append('organizerId', effectiveOrganizerId);
        formData.append('file', file);
        try {
            const response = await fetch('/api/admin/ingestion/enrichment/logo', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok && data.logoUrl) {
                const cleanUrl = data.logoUrl.split('?')[0];
                setCurrentLogoUrl(`${cleanUrl}?t=${Date.now()}`);
                onSuccess();
            } else {
                onError(data.error || 'Failed to upload logo');
            }
        } catch {
            onError('Failed to upload logo');
        }
        setLogoExtractorOpen(false);
    }, [effectiveOrganizerId, setCurrentLogoUrl, onSuccess, onError]);

    const showForm = organizer || isCreatingOrganizer;

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-lg font-medium text-foreground-primary">Organizer</h3>
                </div>
                {showForm ? (
                    <div className="space-y-6">
                        <div className="flex items-start gap-6">
                            {/* Logo column — always visible when form is shown */}
                            <div className="space-y-3">
                                <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-default bg-background-tertiary">
                                    {currentLogoUrl ? (
                                        <Image
                                            src={currentLogoUrl}
                                            alt={organizer?.name || organizerData.name || 'Logo'}
                                            fill
                                            className="object-contain p-2"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-foreground-muted">
                                            <MaterialIcon name="building" size={32} />
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogoButtonClick}
                                    disabled={logoCreating}
                                    className="w-full text-xs"
                                >
                                    {logoCreating ? (
                                        <BrandLoadingLogo size={14} inline label={null} className="mr-1" />
                                    ) : null}
                                    Update Logo
                                </Button>
                            </div>

                            {/* Fields column */}
                            <div className="flex-1 space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Name</label>
                                    <input
                                        type="text"
                                        placeholder="Organizer name"
                                        value={organizerData.name}
                                        onChange={(e) => {
                                            setNameError(false);
                                            setOrganizerData(prev => ({ ...prev, name: e.target.value }));
                                        }}
                                        className={`w-full bg-transparent border-b px-0 py-2 text-sm text-foreground-primary focus:outline-none transition-colors placeholder:text-foreground-muted ${nameError ? 'border-rose-500 focus:border-rose-500' : 'border-default focus:border-accent-primary'}`}
                                    />
                                    {nameError && (
                                        <p className="text-xs text-rose-400">Name is required to add a logo</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Website</label>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={organizerData.website_url}
                                        onChange={(e) => setOrganizerData(prev => ({ ...prev, website_url: e.target.value }))}
                                        className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Description</label>
                            <textarea
                                value={organizerData.description}
                                placeholder="Brief description of the organizer"
                                onChange={(e) => setOrganizerData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                rows={3}
                            />
                        </div>
                        {/* Cancel only available before any creation has happened */}
                        {isCreatingOrganizer && !effectiveOrganizerId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsCreatingOrganizer(false);
                                    setNameError(false);
                                    setOrganizerData({ name: '', description: '', website_url: '', social_media: null });
                                }}
                                className="text-xs text-foreground-muted hover:text-foreground-tertiary"
                            >
                                <MaterialIcon name="close" size={14} className="mr-1" />
                                Cancel
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-default bg-background-tertiary/50 p-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-tertiary text-foreground-muted">
                            <MaterialIcon name="building" size={20} />
                        </div>
                        <p className="text-sm text-foreground-tertiary">No organizer associated with this event.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreatingOrganizer(true)}
                            className="text-xs"
                        >
                            <MaterialIcon name="add" size={16} className="mr-1" />
                            Add Organizer
                        </Button>
                    </div>
                )}
            </div>

            <ImageExtractorModal
                isOpen={logoExtractorOpen}
                onClose={() => setLogoExtractorOpen(false)}
                onSelect={handleLogoFromUrl}
                onFileSelected={handleFileSelected}
                initialUrl={sourceUrl}
                title="Update Logo"
                description="Upload a file or extract from website"
                contextName={organizer?.name || organizerData.name || ''}
                context="logo"
            />
        </>
    );
}
