import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import * as authService from '../services/authService';

// Mock authService
vi.mock('../services/authService', () => ({
  handleLogin: vi.fn(),
  handleForgotPassword: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page with title', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('Banking Buddy')).toBeInTheDocument();
    expect(screen.getByText('Customer Relationship Management')).toBeInTheDocument();
  });

  it('displays welcome message', () => {
    render(<LoginPage />);
    
    expect(screen.getByText(/Sign in to access your dashboard/i)).toBeInTheDocument();
  });

  it('has sign in button', () => {
    render(<LoginPage />);
    
    const signInButton = screen.getByRole('button', { name: /sign in with cognito/i });
    expect(signInButton).toBeInTheDocument();
  });

  it('calls handleLogin when sign in button is clicked', async () => {
    authService.handleLogin.mockResolvedValue();
    render(<LoginPage />);
    
    const signInButton = screen.getByRole('button', { name: /sign in with cognito/i });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(authService.handleLogin).toHaveBeenCalledTimes(1);
    });
  });

  it('has forgot password button', () => {
    render(<LoginPage />);
    
    const forgotPasswordButton = screen.getByText(/forgot your password/i);
    expect(forgotPasswordButton).toBeInTheDocument();
  });

  it('calls handleForgotPassword when forgot password is clicked', async () => {
    authService.handleForgotPassword.mockResolvedValue();
    render(<LoginPage />);
    
    const forgotPasswordButton = screen.getByText(/forgot your password/i);
    fireEvent.click(forgotPasswordButton);

    await waitFor(() => {
      expect(authService.handleForgotPassword).toHaveBeenCalledTimes(1);
    });
  });

  it('handles login error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authService.handleLogin.mockRejectedValue(new Error('Login failed'));
    
    render(<LoginPage />);
    const signInButton = screen.getByRole('button', { name: /sign in with cognito/i });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Login redirect failed:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles forgot password error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authService.handleForgotPassword.mockRejectedValue(new Error('Forgot password failed'));
    
    render(<LoginPage />);
    const forgotPasswordButton = screen.getByText(/forgot your password/i);
    fireEvent.click(forgotPasswordButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Forgot password failed:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays AWS Cognito branding', () => {
    render(<LoginPage />);
    
    expect(screen.getByText(/Secure authentication powered by AWS Cognito/i)).toBeInTheDocument();
  });
});
