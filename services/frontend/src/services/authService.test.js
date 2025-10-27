import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleLogin,
  handleCallback,
  getUserFromToken,
  getIdToken,
  isAuthenticated,
  logout,
  handleForgotPassword,
} from './authService';
import {
  signInWithRedirect,
  signOut,
  fetchAuthSession,
} from 'aws-amplify/auth';

vi.mock('aws-amplify/auth');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleLogin', () => {
    it('calls signInWithRedirect', async () => {
      signInWithRedirect.mockResolvedValue();

      await handleLogin();

      expect(signInWithRedirect).toHaveBeenCalledTimes(1);
    });

    it('throws error when signInWithRedirect fails', async () => {
      const error = new Error('Login failed');
      signInWithRedirect.mockRejectedValue(error);

      await expect(handleLogin()).rejects.toThrow('Login failed');
    });
  });

  describe('handleCallback', () => {
    it('fetches and returns auth session', async () => {
      const mockSession = { tokens: { idToken: 'mock-token' } };
      fetchAuthSession.mockResolvedValue(mockSession);

      const result = await handleCallback();

      expect(result).toEqual(mockSession);
      expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    });

    it('throws error when callback fails', async () => {
      const error = new Error('Callback failed');
      fetchAuthSession.mockRejectedValue(error);

      await expect(handleCallback()).rejects.toThrow('Callback failed');
    });
  });

  describe('getUserFromToken', () => {
    it('returns user data from token claims', async () => {
      const mockSession = {
        tokens: {
          idToken: {
            payload: {
              email: 'test@example.com',
              given_name: 'Test',
              family_name: 'User',
              'custom:role': 'AGENT',
              sub: 'user-123',
            },
          },
        },
      };

      fetchAuthSession.mockResolvedValue(mockSession);

      const user = await getUserFromToken();

      expect(user).toEqual({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'AGENT',
        sub: 'user-123',
      });
    });

    it('returns null when no session exists', async () => {
      fetchAuthSession.mockResolvedValue({ tokens: undefined });

      const user = await getUserFromToken();

      expect(user).toBeNull();
    });

    it('returns null when no idToken exists', async () => {
      fetchAuthSession.mockResolvedValue({ tokens: { idToken: null } });

      const user = await getUserFromToken();

      expect(user).toBeNull();
    });

    it('returns null on error', async () => {
      fetchAuthSession.mockRejectedValue(new Error('Session error'));

      const user = await getUserFromToken();

      expect(user).toBeNull();
    });
  });

  describe('getIdToken', () => {
    it('returns ID token string', async () => {
      const mockSession = {
        tokens: {
          idToken: {
            toString: () => 'mock-token-string',
          },
        },
      };

      fetchAuthSession.mockResolvedValue(mockSession);

      const token = await getIdToken();

      expect(token).toBe('mock-token-string');
    });

    it('returns null when no token exists', async () => {
      fetchAuthSession.mockResolvedValue({ tokens: undefined });

      const token = await getIdToken();

      expect(token).toBeNull();
    });

    it('returns null when idToken is undefined', async () => {
      fetchAuthSession.mockResolvedValue({ tokens: { idToken: undefined } });

      const token = await getIdToken();

      expect(token).toBeNull();
    });

    it('returns null on error', async () => {
      fetchAuthSession.mockRejectedValue(new Error('Token error'));

      const token = await getIdToken();

      expect(token).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when tokens exist', async () => {
      fetchAuthSession.mockResolvedValue({ tokens: { idToken: {} } });

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('returns false when tokens do not exist', async () => {
      fetchAuthSession.mockResolvedValue({ tokens: undefined });

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      fetchAuthSession.mockRejectedValue(new Error('Auth error'));

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('calls signOut', async () => {
      signOut.mockResolvedValue();

      await logout();

      expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('handles logout error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      signOut.mockRejectedValue(new Error('Logout failed'));

      await logout();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleForgotPassword', () => {
    it('redirects to Cognito forgot password page', async () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      await handleForgotPassword();

      expect(window.location.href).toContain('forgotPassword');
      expect(window.location.href).toContain('client_id=test-client-id');
      expect(window.location.href).toContain('test-domain.auth.ap-southeast-1.amazoncognito.com');

      window.location = originalLocation;
    });
  });
});
