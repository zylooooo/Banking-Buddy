import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './mocks/server';
import { mockUsers, mockClients, mockTransactions, mockCommunications, mockAuditLogs } from './mocks/handlers';

expect.extend(matchers);

// Store original mock data
const originalMockUsers = [...mockUsers];
const originalMockClients = [...mockClients];
const originalMockTransactions = [...mockTransactions];
const originalMockCommunications = [...mockCommunications];
const originalMockAuditLogs = [...mockAuditLogs];

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  
  // Reset mock data arrays to original state
  mockUsers.length = 0;
  mockUsers.push(...originalMockUsers.map(u => ({...u})));
  
  mockClients.length = 0;
  mockClients.push(...originalMockClients.map(c => ({...c})));
  
  mockTransactions.length = 0;
  mockTransactions.push(...originalMockTransactions.map(t => ({...t})));
  
  mockCommunications.length = 0;
  mockCommunications.push(...originalMockCommunications.map(c => ({...c})));
  
  mockAuditLogs.length = 0;
  mockAuditLogs.push(...originalMockAuditLogs.map(l => ({...l})));
});

// Clean up after all tests are done
afterAll(() => server.close());

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(() =>
    Promise.resolve({
      tokens: {
        idToken: {
          payload: {
            email: 'test@example.com',
            given_name: 'Test',
            family_name: 'User',
            'custom:role': 'AGENT',
            sub: 'user-1',
          },
          toString: () => 'mock-token',
        },
      },
    })
  ),
  fetchUserAttributes: vi.fn(),
  updateUserAttributes: vi.fn(),
  confirmUserAttribute: vi.fn(),
  updateMFAPreference: vi.fn(),
}));

// Mock environment variables
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'test-pool-id');
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id');
vi.stubEnv('VITE_COGNITO_DOMAIN', 'test-domain');
vi.stubEnv('VITE_AWS_REGION', 'ap-southeast-1');
vi.stubEnv('VITE_REDIRECT_URI', 'http://localhost:3000/callback');
vi.stubEnv('VITE_LOGOUT_URI', 'http://localhost:3000');
