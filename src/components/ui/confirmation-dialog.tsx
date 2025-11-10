import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmationDialogProps {
    triggerLabel: string;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    onConfirm: () => Promise<void> | void;
    disabled?: boolean;
}

export function ConfirmationDialog({
    triggerLabel,
    title = 'Are you sure?',
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    disabled = false,
}: ConfirmationDialogProps) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        setSubmitting(true);
        try {
            await onConfirm();
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Button
                variant={variant}
                onClick={() => setOpen(true)}
                disabled={disabled || submitting}
            >
                {triggerLabel}
            </Button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
                        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
                        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => !submitting && setOpen(false)}
                                disabled={submitting}
                            >
                                {cancelLabel}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirm}
                                disabled={submitting}
                            >
                                {submitting ? 'Processing...' : confirmLabel}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

