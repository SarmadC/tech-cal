/**
 * LogoExtractorModal
 *
 * Modal component for extracting and selecting logos from a source URL.
 * Allows admins to paste a URL, extract images, and select one as the organizer logo.
 */

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ExtractedImage {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
}

interface ImageExtractorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    onFileSelected?: (file: File) => void;
    initialUrl?: string;
    title?: string;
    description?: string;
    contextName?: string;
    context?: 'logo' | 'event_image';
}

export default function ImageExtractorModal({
    isOpen,
    onClose,
    onSelect,
    onFileSelected,
    initialUrl = '',
    title = 'Extract Image from URL',
    description = 'Enter a website URL to extract image candidates',
    contextName,
    context,
}: ImageExtractorModalProps) {
    const [url, setUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<ExtractedImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

    /**
     * Validate URL format - accepts all valid TLDs (.ca, .org, .io, .co.uk, etc.)
     * Uses the URL constructor which properly validates all valid domain names
     */
    const validateUrl = useCallback((urlString: string): { isValid: boolean; error?: string } => {
        const trimmed = urlString.trim();
        
        if (!trimmed) {
            return { isValid: false, error: 'Please enter a URL' };
        }

        try {
            const parsedUrl = new URL(trimmed);
            
            // Ensure protocol is http or https
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return { isValid: false, error: 'URL must use http:// or https:// protocol' };
            }

            // Ensure hostname exists
            if (!parsedUrl.hostname) {
                return { isValid: false, error: 'Invalid URL format' };
            }

            return { isValid: true };
        } catch {
            return { isValid: false, error: 'Invalid URL format. Please enter a valid URL (e.g., https://example.ca)' };
        }
    }, []);

    const handleExtract = useCallback(async () => {
        // Validate URL before making API call
        const validation = validateUrl(url);
        if (!validation.isValid) {
            setError(validation.error || 'Invalid URL');
            return;
        }

        setLoading(true);
        setError(null);
        setImages([]);
        setSelectedImage(null);
        setImageLoadErrors(new Set());

        try {
            const response = await fetch('/api/admin/ingestion/extract-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim(), ...(context && { context }) }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract images');
            }

            if (!data.images || data.images.length === 0) {
                setError('No images found on this page');
                return;
            }

            setImages(data.images);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract images');
        } finally {
            setLoading(false);
        }
    }, [context, url, validateUrl]);

    const handleImageError = useCallback((src: string) => {
        setImageLoadErrors((prev) => new Set([...prev, src]));
    }, []);

    const handleConfirm = useCallback(() => {
        if (selectedImage) {
            onSelect(selectedImage);
            onClose();
        }
    }, [selectedImage, onSelect, onClose]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter' && !loading && url.trim()) {
                handleExtract();
            }
        },
        [handleExtract, loading, onClose, url]
    );

    if (!isOpen) return null;

    const visibleImages = images.filter((img) => !imageLoadErrors.has(img.src));

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/80 backdrop-blur"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-extractor-title"
            onKeyDown={handleKeyDown}
        >
            <div className="flex max-h-[85vh] w-[min(90vw,800px)] flex-col rounded-xl border border-default bg-background-main shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-default px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background-tertiary">
                            <MaterialIcon name="image" size={18} className="text-foreground-tertiary" />
                        </div>
                        <div>
                            <h2 id="image-extractor-title" className="text-base font-semibold text-foreground-primary">
                                {title} {contextName ? `for ${contextName}` : ''}
                            </h2>
                            <p className="text-xs text-foreground-tertiary">
                                {description}
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-secondary"
                    >
                        <MaterialIcon name="clear" size={20} />
                    </Button>
                </div>

                {/* File Upload */}
                {onFileSelected && (
                    <div className="border-b border-default px-5 py-4">
                        <label className="block text-xs font-medium text-foreground-tertiary uppercase tracking-wide mb-2">
                            Upload File
                        </label>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/avif"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    onFileSelected(file);
                                    onClose();
                                }
                            }}
                            className="block w-full text-sm text-foreground-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-background-tertiary file:text-foreground-tertiary hover:file:bg-background-elevated cursor-pointer"
                        />
                    </div>
                )}

                {/* URL Input */}
                <div className="border-b border-default px-5 py-4">
                    <label className="block text-xs font-medium text-foreground-tertiary uppercase tracking-wide mb-2">
                        Extract from URL
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                            className="flex-1 rounded-md border border-default bg-background-secondary px-3 py-2 text-sm text-foreground-primary placeholder:text-foreground-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                            disabled={loading}
                        />
                        <Button
                            onClick={handleExtract}
                            disabled={loading || !url.trim()}
                            className="min-w-[100px]"
                        >
                            {loading ? (
                                <>
                                    <MaterialIcon
                                        name="refresh"
                                        size={16}
                                        className="animate-spin"
                                    />
                                    Extracting...
                                </>
                            ) : (
                                <>
                                    <MaterialIcon name="search" size={16} />
                                    Extract
                                </>
                            )}
                        </Button>
                    </div>
                    {error && (
                        <p className="mt-2 text-sm text-rose-400">
                            <MaterialIcon name="warning" size={14} className="mr-1 inline" />
                            {error}
                        </p>
                    )}
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-foreground-tertiary">
                            <MaterialIcon
                                name="refresh"
                                size={32}
                                className="animate-spin mb-3"
                            />
                            <p>Extracting images from page...</p>
                        </div>
                    ) : visibleImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-foreground-tertiary">
                            <MaterialIcon name="image" size={48} className="mb-3 opacity-50" />
                            <p className="text-sm">
                                {images.length > 0
                                    ? 'All extracted images failed to load'
                                    : 'Enter a URL and click Extract to find images'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-3 text-xs text-foreground-tertiary">
                                Found {visibleImages.length} images. Click to select one.
                            </p>
                            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
                                {visibleImages.map((img) => (
                                    <button
                                        key={img.src}
                                        type="button"
                                        onClick={() => setSelectedImage(img.src)}
                                        className={cn(
                                            'group relative aspect-square overflow-hidden rounded-lg border-2 bg-background-secondary p-2 transition-all hover:border-strong',
                                            selectedImage === img.src
                                                ? 'border-accent-primary ring-2 ring-accent-primary/30'
                                                : 'border-default'
                                        )}
                                        title={img.alt || img.src}
                                    >
                                        <Image
                                            src={img.src}
                                            alt={img.alt || 'Extracted image'}
                                            fill
                                            className="object-contain p-1"
                                            sizes="(max-width: 640px) 80px, 100px"
                                            onError={() => handleImageError(img.src)}
                                            unoptimized
                                        />
                                        {selectedImage === img.src && (
                                            <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-accent-primary-foreground">
                                                <MaterialIcon name="check" size={14} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Selected Preview & Actions */}
                {selectedImage && (
                    <div className="border-t border-default px-5 py-4">
                        <div className="flex items-center gap-4">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-default bg-background-secondary">
                                <Image
                                    src={selectedImage}
                                    alt="Selected image"
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground-secondary">Selected Image</p>
                                <p className="max-w-[400px] truncate text-xs text-foreground-tertiary">
                                    {selectedImage}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-default px-5 py-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="text-foreground-tertiary hover:bg-background-tertiary"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedImage}
                    >
                        <MaterialIcon name="check" size={16} />
                        Use Selected Image
                    </Button>
                </div>
            </div>
        </div>
    );
}
