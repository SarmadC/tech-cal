'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import ImageExtractorModal from '@/components/admin/ImageExtractorModal';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { getLogoUrlFromInput } from '@/utils/logoUtils';
import type { HackathonWithOrganizer } from './page';

interface HackathonEditorState {
    title: string;
    description: string;
    status: 'active' | 'cancelled' | 'completed';
    start_date: string;
    end_date: string;
    registration_deadline: string;
    submission_deadline: string;
    location: string;
    is_virtual: boolean;
    max_team_size: string;
    platform_url: string;
    registration_url: string;
    website_url: string;
    source_url: string;
    header_image_url: string;
    prize_pool: string;
    prize_description: string;
}

interface OrganizerState {
    id: string | null;
    name: string;
    website_url: string;
    logo_url: string | null;
}

interface HackathonEditorClientProps {
    hackathon: HackathonWithOrganizer | null;
    isNew: boolean;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-default bg-background-secondary">
            <div className="px-4 py-3 border-b border-default">
                <h2 className="text-[13px] font-semibold text-foreground-secondary uppercase tracking-wide">
                    {title}
                </h2>
            </div>
            <div className="p-4 space-y-4">{children}</div>
        </div>
    );
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground-tertiary">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls =
    'w-full rounded-md border border-default bg-background-tertiary px-3 py-1.5 text-[13px] text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50';

const textareaCls =
    'w-full rounded-md border border-default bg-background-tertiary px-3 py-2 text-[13px] text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 resize-none';

export default function HackathonEditorClient({
    hackathon,
    isNew,
}: HackathonEditorClientProps) {
    const router = useRouter();
    const { showSuccess, showError } = useSnackbar();
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [headerImageUploading, setHeaderImageUploading] = useState(false);
    const [showHeaderImageModal, setShowHeaderImageModal] = useState(false);
    const [importingEventImage, setImportingEventImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const headerFileInputRef = useRef<HTMLInputElement>(null);

    const [fields, setFields] = useState<HackathonEditorState>({
        title: hackathon?.title ?? '',
        description: hackathon?.description ?? '',
        status: (hackathon?.status as HackathonEditorState['status']) ?? 'active',
        start_date: hackathon?.start_date ?? '',
        end_date: hackathon?.end_date ?? '',
        registration_deadline: hackathon?.registration_deadline ?? '',
        submission_deadline: hackathon?.submission_deadline ?? '',
        location: hackathon?.location ?? '',
        is_virtual: hackathon?.is_virtual ?? false,
        max_team_size: hackathon?.max_team_size != null ? String(hackathon.max_team_size) : '',
        platform_url: hackathon?.platform_url ?? '',
        registration_url: hackathon?.registration_url ?? '',
        website_url: hackathon?.website_url ?? '',
        source_url: hackathon?.source_url ?? '',
        header_image_url: hackathon?.header_image_url ?? '',
        prize_pool: hackathon?.prize_pool ?? '',
        prize_description: hackathon?.prize_description ?? '',
    });

    const [organizer, setOrganizer] = useState<OrganizerState>({
        id: hackathon?.organizer?.id ?? hackathon?.organizer_id ?? null,
        name: hackathon?.organizer?.name ?? '',
        website_url: hackathon?.organizer?.website_url ?? '',
        logo_url: hackathon?.organizer?.logo_url ?? null,
    });

    const setField = useCallback(<K extends keyof HackathonEditorState>(
        key: K,
        value: HackathonEditorState[K]
    ) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    }, []);

    const logoDisplayUrl = getLogoUrlFromInput(organizer.logo_url, organizer.name);

    const handleSave = useCallback(async () => {
        if (!fields.title.trim()) {
            showError('Title is required');
            return;
        }
        if (!fields.start_date || !fields.end_date) {
            showError('Start date and end date are required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: fields.title.trim(),
                description: fields.description.trim() || null,
                status: fields.status,
                start_date: fields.start_date,
                end_date: fields.end_date,
                registration_deadline: fields.registration_deadline || null,
                submission_deadline: fields.submission_deadline || null,
                location: fields.location.trim() || null,
                is_virtual: fields.is_virtual,
                max_team_size: fields.max_team_size ? parseInt(fields.max_team_size, 10) : null,
                // Pass organizer info — API will resolve/create the organizer
                organizer_id: organizer.id || null,
                organizer_name: organizer.name.trim() || null,
                organizer_website_url: organizer.website_url.trim() || null,
                platform_url: fields.platform_url.trim() || null,
                registration_url: fields.registration_url.trim() || null,
                website_url: fields.website_url.trim() || null,
                source_url: fields.source_url.trim() || null,
                prize_pool: fields.prize_pool.trim() || null,
                prize_description: fields.prize_description.trim() || null,
            };

            let response: Response;
            if (isNew) {
                response = await fetch('/api/admin/hackathons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                response = await fetch(`/api/admin/hackathons/${hackathon!.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Save failed');
            }

            const data = await response.json();

            // Update organizer ID from response if it was resolved by the API
            if (data.organizer_id && !organizer.id) {
                setOrganizer((prev) => ({ ...prev, id: data.organizer_id }));
            } else if (data.hackathon?.organizer_id && !organizer.id) {
                setOrganizer((prev) => ({ ...prev, id: data.hackathon.organizer_id }));
            }

            showSuccess(isNew ? 'Hackathon created!' : 'Hackathon saved!');

            if (isNew && data.hackathon?.id) {
                router.push(`/admin/hackathons/${data.hackathon.id}`);
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to save hackathon');
        } finally {
            setSaving(false);
        }
    }, [fields, organizer, hackathon, isNew, router, showError, showSuccess]);

    const handleDelete = useCallback(async () => {
        if (!hackathon?.id) return;
        if (!confirm('Delete this hackathon? This cannot be undone.')) return;

        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/hackathons/${hackathon.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            showSuccess('Hackathon deleted');
            router.push('/admin/hackathons');
        } catch {
            showError('Failed to delete hackathon');
        } finally {
            setDeleting(false);
        }
    }, [hackathon, router, showError, showSuccess]);

    const uploadLogoFile = useCallback(
        async (file: File) => {
            if (!organizer.id) {
                showError('Save the hackathon with an organizer first, then upload a logo.');
                return;
            }
            setLogoUploading(true);
            try {
                const fd = new FormData();
                fd.append('organizerId', organizer.id);
                fd.append('file', file);

                const res = await fetch('/api/admin/ingestion/enrichment/logo', {
                    method: 'POST',
                    body: fd,
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Upload failed');
                }
                const data = await res.json();
                const newLogoUrl = data.logoUrl ?? null;
                setOrganizer((prev) => ({ ...prev, logo_url: newLogoUrl }));
                showSuccess('Logo uploaded!');
            } catch (err) {
                showError(err instanceof Error ? err.message : 'Logo upload failed');
            } finally {
                setLogoUploading(false);
            }
        },
        [organizer.id, showError, showSuccess]
    );

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) uploadLogoFile(file);
            e.target.value = '';
        },
        [uploadLogoFile]
    );

    const handleImageModalSelect = useCallback(
        (imageUrl: string) => {
            // If it's an external URL, just set it as preview; actual file upload handled by onFileSelected
            setOrganizer((prev) => ({ ...prev, logo_url: imageUrl }));
            setShowImageModal(false);
        },
        []
    );

    const handleImageModalFile = useCallback(
        (file: File) => {
            setShowImageModal(false);
            uploadLogoFile(file);
        },
        [uploadLogoFile]
    );

    const uploadHeaderImageFile = useCallback(
        async (file: File) => {
            if (!hackathon?.id) {
                showError('Create/save the hackathon first, then upload a header image.');
                return;
            }
            setHeaderImageUploading(true);
            try {
                const fd = new FormData();
                fd.append('hackathonId', hackathon.id);
                fd.append('file', file);

                const res = await fetch('/api/admin/hackathons/image', {
                    method: 'POST',
                    body: fd,
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');

                if (data.imageUrl) {
                    setField('header_image_url', data.imageUrl);
                }
                showSuccess('Header image updated!');
            } catch (err) {
                showError(err instanceof Error ? err.message : 'Header image upload failed');
            } finally {
                setHeaderImageUploading(false);
            }
        },
        [hackathon?.id, setField, showError, showSuccess]
    );

    const handleHeaderImageFromUrl = useCallback(
        async (imageUrl: string) => {
            if (!hackathon?.id) {
                showError('Create/save the hackathon first, then extract a header image.');
                return;
            }
            setHeaderImageUploading(true);
            try {
                const fetchResponse = await fetch('/api/admin/ingestion/enrichment/fetch-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl }),
                });

                const fetchData = await fetchResponse.json();
                if (!fetchResponse.ok) {
                    throw new Error(fetchData.error || 'Failed to fetch image from URL');
                }

                if (!fetchData.imageData || !fetchData.contentType || !fetchData.filename) {
                    throw new Error('Invalid response from image fetch: missing required fields');
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

                await uploadHeaderImageFile(file);
            } catch (err) {
                showError(err instanceof Error ? err.message : 'Failed to update header image');
            } finally {
                setHeaderImageUploading(false);
            }
        },
        [hackathon?.id, showError, uploadHeaderImageFile]
    );

    const handleHeaderFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) uploadHeaderImageFile(file);
            e.target.value = '';
        },
        [uploadHeaderImageFile]
    );

    const handleImportFromLinkedEvent = useCallback(async () => {
        if (!hackathon?.id) {
            showError('Create/save the hackathon first.');
            return;
        }
        setImportingEventImage(true);
        try {
            const res = await fetch(`/api/admin/hackathons/${hackathon.id}/import-event-image`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');
            if (data.imageUrl) {
                setField('header_image_url', data.imageUrl);
            }
            showSuccess('Imported header image from linked event!');
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to import from linked event');
        } finally {
            setImportingEventImage(false);
        }
    }, [hackathon?.id, setField, showError, showSuccess]);

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/hackathons')}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-background-tertiary text-foreground-muted hover:text-foreground-tertiary transition-colors"
                    >
                        <MaterialIcon name="arrow_back" size={16} />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground-primary">
                            {isNew ? 'New Hackathon' : 'Edit Hackathon'}
                        </h1>
                        {!isNew && hackathon && (
                            <p className="text-[12px] text-foreground-muted mt-0.5">{hackathon.title}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isNew && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="h-7 px-3 text-[12px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-7 px-4 text-[12px] bg-accent-primary hover:bg-accent-primary/90 text-accent-primary-foreground"
                    >
                        {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
                    </Button>
                </div>
            </div>

            {/* Basic Info */}
            <SectionCard title="Basic Info">
                <Field label="Title" required>
                    <input
                        type="text"
                        className={inputCls}
                        value={fields.title}
                        onChange={(e) => setField('title', e.target.value)}
                        placeholder="Hackathon title"
                    />
                </Field>
                <Field label="Description">
                    <textarea
                        className={textareaCls}
                        rows={4}
                        value={fields.description}
                        onChange={(e) => setField('description', e.target.value)}
                        placeholder="Describe the hackathon…"
                    />
                </Field>
                <Field label="Status">
                    <select
                        className={inputCls}
                        value={fields.status}
                        onChange={(e) => setField('status', e.target.value as HackathonEditorState['status'])}
                    >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </Field>
            </SectionCard>

            <SectionCard title="Prizes">
                <Field label="Prize Pool">
                    <input
                        type="text"
                        className={inputCls}
                        value={fields.prize_pool}
                        onChange={(e) => setField('prize_pool', e.target.value)}
                        placeholder="e.g. $5,000, 1 BTC, etc."
                    />
                </Field>
                <Field label="Prize Description">
                    <textarea
                        className={textareaCls}
                        rows={3}
                        value={fields.prize_description}
                        onChange={(e) => setField('prize_description', e.target.value)}
                        placeholder="List specific prizes, categories, or sponsor awards…"
                    />
                </Field>
            </SectionCard>

            {/* Dates */}
            <SectionCard title="Dates">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Start Date" required>
                        <input
                            type="date"
                            className={inputCls}
                            value={fields.start_date}
                            onChange={(e) => setField('start_date', e.target.value)}
                        />
                    </Field>
                    <Field label="End Date" required>
                        <input
                            type="date"
                            className={inputCls}
                            value={fields.end_date}
                            onChange={(e) => setField('end_date', e.target.value)}
                        />
                    </Field>
                    <Field label="Registration Deadline">
                        <input
                            type="date"
                            className={inputCls}
                            value={fields.registration_deadline}
                            onChange={(e) => setField('registration_deadline', e.target.value)}
                        />
                    </Field>
                    <Field label="Submission Deadline">
                        <input
                            type="date"
                            className={inputCls}
                            value={fields.submission_deadline}
                            onChange={(e) => setField('submission_deadline', e.target.value)}
                        />
                    </Field>
                </div>
            </SectionCard>

            {/* Location */}
            <SectionCard title="Location">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                            checked={fields.is_virtual}
                            onChange={(e) => setField('is_virtual', e.target.checked)}
                        />
                        <span className="text-[13px] text-foreground-tertiary">Virtual / Online</span>
                    </label>
                </div>
                <Field label={fields.is_virtual ? 'Location (Optional)' : 'Location'}>
                    <input
                        type="text"
                        className={inputCls}
                        value={fields.location}
                        onChange={(e) => setField('location', e.target.value)}
                        placeholder={fields.is_virtual ? 'Online (e.g. Discord, Zoom, etc.)' : 'City, Country or venue address'}
                    />
                </Field>
            </SectionCard>

            {/* Team Settings */}
            <SectionCard title="Team Settings">
                <Field label="Max Team Size">
                    <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={fields.max_team_size}
                        onChange={(e) => setField('max_team_size', e.target.value)}
                        placeholder="e.g. 4"
                    />
                </Field>
            </SectionCard>

            {/* URLs */}
            <SectionCard title="URLs">
                <Field label="Platform URL">
                    <input
                        type="url"
                        className={inputCls}
                        value={fields.platform_url}
                        onChange={(e) => setField('platform_url', e.target.value)}
                        placeholder="https://devpost.com/hackathon/..."
                    />
                </Field>
                <Field label="Registration URL">
                    <input
                        type="url"
                        className={inputCls}
                        value={fields.registration_url}
                        onChange={(e) => setField('registration_url', e.target.value)}
                        placeholder="https://..."
                    />
                </Field>
                <Field label="Website URL">
                    <input
                        type="url"
                        className={inputCls}
                        value={fields.website_url}
                        onChange={(e) => setField('website_url', e.target.value)}
                        placeholder="https://..."
                    />
                </Field>
                <Field label="Source URL (Original)">
                    <div className="flex gap-2">
                        <input
                            type="url"
                            className={`${inputCls} opacity-60`}
                            value={fields.source_url}
                            readOnly
                            placeholder="Imported from MLH/etc."
                        />
                        {fields.source_url && !fields.website_url && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-[34px] px-3 shrink-0 text-[11px]"
                                onClick={() => setField('website_url', fields.source_url)}
                            >
                                Use as Website
                            </Button>
                        )}
                    </div>
                </Field>

                <Field label="Header Image">
                    <div className="flex items-start gap-4">
                        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-default bg-background-tertiary">
                            {fields.header_image_url ? (
                                <Image
                                    src={fields.header_image_url}
                                    alt="Hackathon header"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-foreground-muted">
                                    <MaterialIcon name="image" size={20} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={headerFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleHeaderFileInputChange}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => headerFileInputRef.current?.click()}
                                    disabled={headerImageUploading || !hackathon?.id || saving}
                                    className="h-7 px-3 text-[12px] border-default text-foreground-tertiary hover:text-foreground-primary"
                                >
                                    <MaterialIcon name="arrow-up" size={13} className="mr-1.5" />
                                    {headerImageUploading ? 'Uploading…' : 'Upload File'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowHeaderImageModal(true)}
                                    disabled={headerImageUploading || !hackathon?.id || saving}
                                    className="h-7 px-3 text-[12px] border-default text-foreground-tertiary hover:text-foreground-primary"
                                >
                                    <MaterialIcon name="globe" size={13} className="mr-1.5" />
                                    Extract from URL
                                </Button>
                                {!isNew && hackathon?.event_id && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleImportFromLinkedEvent}
                                        disabled={importingEventImage || headerImageUploading || saving}
                                        className="h-7 px-3 text-[12px] border-default text-foreground-tertiary hover:text-foreground-primary"
                                    >
                                        <MaterialIcon name="copy" size={13} className="mr-1.5" />
                                        {importingEventImage ? 'Importing…' : 'Import from Linked Event'}
                                    </Button>
                                )}
                            </div>
                            <p className="mt-2 text-[12px] text-foreground-muted">
                                Recommended: 1200x630px or larger. Create the hackathon first to upload.
                            </p>
                        </div>
                    </div>
                </Field>
            </SectionCard>

            {/* Organizer & Logo */}
            <SectionCard title="Organizer & Logo">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Organizer Name">
                        <input
                            type="text"
                            className={inputCls}
                            value={organizer.name}
                            onChange={(e) => setOrganizer((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Organization name"
                        />
                    </Field>
                    <Field label="Organizer Website">
                        <input
                            type="url"
                            className={inputCls}
                            value={organizer.website_url}
                            onChange={(e) => setOrganizer((prev) => ({ ...prev, website_url: e.target.value }))}
                            placeholder="https://..."
                        />
                    </Field>
                </div>

                {/* Logo */}
                <div className="flex items-start gap-4 pt-2">
                    <div className="h-16 w-16 rounded-lg border border-default bg-background-tertiary flex items-center justify-center overflow-hidden flex-shrink-0">
                        {logoDisplayUrl ? (
                            <Image
                                src={logoDisplayUrl}
                                alt="Organizer logo"
                                width={64}
                                height={64}
                                className="object-contain"
                                unoptimized
                            />
                        ) : (
                            <MaterialIcon name="image" size={24} className="text-foreground-muted" />
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-[12px] text-foreground-muted">
                            {organizer.id
                                ? 'Upload or extract a logo for this organizer.'
                                : 'Save the hackathon with an organizer name first, then upload a logo.'}
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileInputChange}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={logoUploading || !organizer.id}
                                className="h-7 px-3 text-[12px] border-default text-foreground-tertiary hover:text-foreground-primary"
                            >
                                <MaterialIcon name="arrow-up" size={13} className="mr-1.5" />
                                {logoUploading ? 'Uploading…' : 'Upload File'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImageModal(true)}
                                disabled={logoUploading || !organizer.id}
                                className="h-7 px-3 text-[12px] border-default text-foreground-tertiary hover:text-foreground-primary"
                            >
                                <MaterialIcon name="globe" size={13} className="mr-1.5" />
                                Extract from URL
                            </Button>
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Image Extractor Modal */}
            <ImageExtractorModal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                onSelect={handleImageModalSelect}
                onFileSelected={handleImageModalFile}
                initialUrl={organizer.website_url}
                title="Extract Organizer Logo"
                description="Enter the organizer website URL to extract logo candidates"
                contextName={organizer.name || 'Organizer'}
            />

            <ImageExtractorModal
                isOpen={showHeaderImageModal}
                onClose={() => setShowHeaderImageModal(false)}
                onSelect={handleHeaderImageFromUrl}
                onFileSelected={(file) => uploadHeaderImageFile(file)}
                initialUrl={fields.source_url || fields.website_url || fields.registration_url || ''}
                title="Update Hackathon Header Image"
                description="Upload a file or extract from website"
                contextName={fields.title || 'Hackathon'}
            />
        </div>
    );
}
