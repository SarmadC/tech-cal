// src/components/auth/LoginForm.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoginForm from './LoginForm'; // Import the component we're testing

describe('LoginForm Component', () => {

    it('should allow a user to type in email and password and submit the form', async () => {
        // Arrange
        const user = userEvent.setup(); // Set up the user event simulator
        const mockOnSubmit = vi.fn(); // Create a mock function to act as our onSubmit prop

        render(<LoginForm onSubmit={mockOnSubmit} isPending={false} />);

        // Act
        // Find the input fields by their accessible labels (best practice)
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const signInButton = screen.getByRole('button', { name: /sign in/i });

        // Simulate the user typing into the fields
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');

        // Simulate the user clicking the sign-in button
        await user.click(signInButton);

        // Assert
        // Check that our mock onSubmit function was called exactly one time
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);

        // Check that it was called with the correct email and password
        expect(mockOnSubmit).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
        });
    });

    it('should disable the submit button and show "Signing in..." when isPending is true', () => {
        // Arrange
        const mockOnSubmit = vi.fn();
        render(<LoginForm onSubmit={mockOnSubmit} isPending={true} />);

        // Act
        const signInButton = screen.getByRole('button', { name: /signing in.../i });

        // Assert
        // Check that the button is in the document
        expect(signInButton).toBeInTheDocument();
        // Check that it is disabled
        expect(signInButton).toBeDisabled();
    });

    it('should display an error message when an error is passed', () => {
        // Arrange
        const errorMessage = 'Invalid email or password.';
        render(<LoginForm onSubmit={vi.fn()} isPending={false} error={errorMessage} />);

        // Act
        const errorElement = screen.getByText(errorMessage);

        // Assert
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveClass('bg-red-50'); // Check for error styling
    });
});