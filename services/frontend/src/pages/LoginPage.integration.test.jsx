import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as authService from '../services/authService';

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays login page with all elements', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Banking Buddy')).toBeInTheDocument();
    expect(screen.getByText('Customer Relationship Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with cognito/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    expect(screen.getByText(/Secure authentication powered by AWS Cognito/i)).toBeInTheDocument();
  });

  it('initiates login flow when sign in button is clicked', async () => {
    const user = userEvent.setup();
    const handleLoginSpy = vi.spyOn(authService, 'handleLogin').mockResolvedValue();

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with cognito/i });
    await user.click(signInButton);

    await waitFor(() => {
      expect(handleLoginSpy).toHaveBeenCalledTimes(1);
    });

    handleLoginSpy.mockRestore();
  });

  it('initiates forgot password flow when link is clicked', async () => {
    const user = userEvent.setup();
    const handleForgotPasswordSpy = vi.spyOn(authService, 'handleForgotPassword').mockResolvedValue();

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const forgotPasswordButton = screen.getByText(/forgot your password/i);
    await user.click(forgotPasswordButton);

    await waitFor(() => {
      expect(handleForgotPasswordSpy).toHaveBeenCalledTimes(1);
    });

    handleForgotPasswordSpy.mockRestore();
  });

  it('handles login error gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handleLoginSpy = vi.spyOn(authService, 'handleLogin').mockRejectedValue(
      new Error('Authentication failed')
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with cognito/i });
    await user.click(signInButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Login redirect failed:',
        expect.any(Error)
      );
    });

    handleLoginSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('handles forgot password error gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handleForgotPasswordSpy = vi.spyOn(authService, 'handleForgotPassword').mockRejectedValue(
      new Error('Password reset failed')
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const forgotPasswordButton = screen.getByText(/forgot your password/i);
    await user.click(forgotPasswordButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Forgot password failed:',
        expect.any(Error)
      );
    });

    handleForgotPasswordSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('displays responsive layout', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const container = screen.getByText('Banking Buddy').closest('div');
    expect(container).toHaveClass('text-center');
  });

  it('has proper button styling and interactions', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const signInButton = screen.getByRole('button', { name: /sign in with cognito/i });
    expect(signInButton).toHaveClass('bg-blue-600');
    expect(signInButton).toHaveClass('hover:bg-blue-700');
  });
});
