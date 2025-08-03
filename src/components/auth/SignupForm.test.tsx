// src/components/auth/SignupForm.test.tsx

// 1. IMPORT the correct render function
import { render, screen } from '@/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SignupForm from './SignupForm';
// 2. REMOVE the incorrect import
// import { BrowserRouter } from 'react-router-dom';

// 3. REMOVE the unnecessary custom render function
/*
const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};
*/

describe('SignupForm Component', () => {

    it('should allow a user to fill out the form and submit it', async () => {
        const user = userEvent.setup();
        const mockOnSubmit = vi.fn();

        // 4. USE the standard render function from your test-utils
        render(<SignupForm onSubmit={mockOnSubmit} isPending={false} />);

        const nameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/^password \*/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
        const termsCheckbox = screen.getByLabelText(/i agree to the/i);
        const createAccountButton = screen.getByRole('button', { name: /create account/i });

        await user.type(nameInput, 'John Doe');
        await user.type(emailInput, 'john.doe@example.com');
        await user.type(passwordInput, 'securepassword123');
        await user.type(confirmPasswordInput, 'securepassword123');
        await user.click(termsCheckbox);
        await user.click(createAccountButton);

        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).toHaveBeenCalledWith({
            name: 'John Doe',
            email: 'john.doe@example.com',
            password: 'securepassword123',
            confirmPassword: 'securepassword123',
            acceptTerms: true,
        });
    });

    it('should disable the submit button until the terms are accepted', async () => {
        const user = userEvent.setup();
        render(<SignupForm onSubmit={vi.fn()} isPending={false} />);
        const termsCheckbox = screen.getByLabelText(/i agree to the/i);
        const createAccountButton = screen.getByRole('button', { name: /create account/i });

        expect(createAccountButton).toBeDisabled();
        await user.click(termsCheckbox);
        expect(createAccountButton).toBeEnabled();
    });

    it('should display a client-side error if passwords do not match', async () => {
        // Arrange
        const user = userEvent.setup();
        const mockOnSubmit = vi.fn();
        render(<SignupForm onSubmit={mockOnSubmit} isPending={false} />);

        // Act
        const nameInput = screen.getByLabelText(/full name/i);
        const emailInput = screen.getByLabelText(/email address/i);
        await user.type(nameInput, 'Test User');
        await user.type(emailInput, 'test@user.com');

        const passwordInput = screen.getByLabelText(/^password \*/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
        const termsCheckbox = screen.getByLabelText(/i agree to the/i);
        const createAccountButton = screen.getByRole('button', { name: /create account/i });

        await user.type(passwordInput, 'password123');
        await user.type(confirmPasswordInput, 'password_mismatch');
        await user.click(termsCheckbox);
        await user.click(createAccountButton);

        // Assert
        expect(mockOnSubmit).not.toHaveBeenCalled();

        const errorMessage = await screen.findByText(/passwords do not match/i);
        expect(errorMessage).toBeInTheDocument();
    });
});