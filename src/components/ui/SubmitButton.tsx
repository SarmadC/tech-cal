// src/components/ui/SubmitButton.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { Button, type ButtonProps } from '@/components/ui/button';

interface SubmitButtonProps extends ButtonProps {
    children: React.ReactNode;
}

export function SubmitButton({ children, ...props }: SubmitButtonProps) {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending} {...props}>
            {pending ? <BrandLoadingLogo className="mr-2 h-4 w-4 text-current" inline label={null} size={16} /> : null}
            {children}
        </Button>
    );
}
