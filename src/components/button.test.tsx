// src/components/ui/button.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/button'; // This path is now correct

describe('Button Component', () => {
    it('should render the button with its children', () => {
        render(<Button>Click Me</Button>);
        const buttonElement = screen.getByRole('button', { name: /click me/i });
        expect(buttonElement).toBeInTheDocument();
    });

    it('should be disabled when the disabled prop is true', () => {
        render(<Button disabled>Cannot Click</Button>);
        const buttonElement = screen.getByRole('button', { name: /cannot click/i });
        expect(buttonElement).toBeDisabled();
    });

    it('should apply the correct classes for the "destructive" variant', () => {
        render(<Button variant="destructive">Delete</Button>);
        const buttonElement = screen.getByRole('button', { name: /delete/i });
        expect(buttonElement).toHaveClass('bg-destructive');
    });
});