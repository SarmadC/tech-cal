// src/components/auth/ForgotPassword.test.tsx

import { render, screen } from '@/utils/test-utils'; // Using our custom render is sufficient
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ForgotPasswordForm from './ForgotPassword';
// 1. REMOVE the incorrect import from react-router-dom
// import { BrowserRouter } from 'react-router-dom';

// 2. REMOVE the unnecessary custom render function
/*
const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};
*/

describe('ForgotPasswordForm Component', () => {

    it('should allow a user to type an email and submit the form', async () => {
        // Arrange
        const user = userEvent.setup();
        const mockOnSubmit = vi.fn();

        // 3. USE the standard `render` from your test-utils
        render(<ForgotPasswordForm onSubmit={mockOnSubmit} isPending={false} />);

        // Act
        const emailInput = screen.getByLabelText(/email address/i);
        const submitButton = screen.getByRole('button', { name: /send reset email/i });

        await user.type(emailInput, 'forgotmypassword@example.com');
        await user.click(submitButton);

        // Assert
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith('forgotmypassword@example.com');
    });

    it('should disable the submit button and show "Sending..." when isPending is true', () => {
        // Arrange
        render(<ForgotPasswordForm onSubmit={vi.fn()} isPending={true} />);

        // Act
        const submitButton = screen.getByRole('button', { name: /sending.../i });

        // Assert
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
    });

    it('should display an error message when an error is passed', () => {
        // Arrange
        const errorMessage = 'No account found with this email.';
        render(<ForgotPasswordForm onSubmit={vi.fn()} isPending={false} error={errorMessage} />);

        // Act
        const errorElement = screen.getByText(errorMessage);

        // Assert
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveClass('bg-red-50'); // Check for specific error styling
    });

    it('should have a link to go back to the sign-in page', () => {
        // Arrange
        render(<ForgotPasswordForm onSubmit={vi.fn()} isPending={false} />);

        // Act
        const backLink = screen.getByRole('link', { name: /back to sign in/i });

        // Assert
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/login');
    });
});