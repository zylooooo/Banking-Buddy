import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Custom render with router
export function renderWithRouter(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  });
}

// Mock authenticated user
export const mockUser = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'AGENT',
  sub: 'test-user-id',
};

export const mockAdminUser = {
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  sub: 'admin-user-id',
};

// Mock auth service functions
export const mockAuthService = {
  isAuthenticated: vi.fn(() => Promise.resolve(true)),
  getUserFromToken: vi.fn(() => Promise.resolve(mockUser)),
  getIdToken: vi.fn(() => Promise.resolve('mock-token')),
  handleLogin: vi.fn(),
  logout: vi.fn(),
};
