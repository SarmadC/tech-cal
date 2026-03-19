'use client';

import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import MobileSectionHeader from './MobileSectionHeader';

interface MobileSheetProps {
    open: boolean;
    title: string;
    subtitle?: string;
    showHeader?: boolean;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}

export default function MobileSheet({
    open,
    title,
    subtitle,
    showHeader = true,
    onClose,
    children,
    footer,
}: MobileSheetProps) {
    const titleId = useId();

    useEffect(() => {
        if (!open || typeof document === 'undefined') {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose, open]);

    if (!open) {
        return null;
    }

    return (
        <div className="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button
                type="button"
                className="mobile-sheet__scrim"
                onClick={onClose}
                aria-label="Close"
            />
            <div className="mobile-sheet__panel">
                <div className="mobile-sheet__grabber" aria-hidden="true" />
                <h2 id={titleId} className="sr-only">
                    {title}
                </h2>
                {showHeader ? (
                    <div className="mobile-sheet__header">
                        <MobileSectionHeader
                            title={title}
                            subtitle={subtitle}
                            className="mb-0"
                        />
                    </div>
                ) : null}
                <div className="mobile-sheet__body">
                    {children}
                </div>
                {footer ? <div className="mobile-sheet__footer">{footer}</div> : null}
            </div>
        </div>
    );
}
