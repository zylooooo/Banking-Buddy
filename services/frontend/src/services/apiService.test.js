import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as authService from './authService';

// Mock axios before importing apiService
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn((callback) => {
        mockAxiosInstance._requestInterceptor = callback;
        return 0;
      }),
    },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

vi.mock('./authService');

// Import after mocks are set up
const { userApi, clientApi, transactionApi } = await import('./apiService');

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getIdToken.mockResolvedValue('mock-token');
    
    // Reset mock functions
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.patch.mockReset();
    mockAxiosInstance.delete.mockReset();
  });

  describe('userApi', () => {
    it('getAllUsers makes GET request to /users', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });

      await userApi.getAllUsers();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users');
    });

    it('getUserById makes GET request with userId', async () => {
      const userId = 'user-123';
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      await userApi.getUserById(userId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/users/${userId}`);
    });

    it('createUser makes POST request with userData', async () => {
      const userData = { name: 'Test User', email: 'test@example.com' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await userApi.createUser(userData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', userData);
    });

    it('updateUser makes PATCH request with userId and userData', async () => {
      const userId = 'user-123';
      const userData = { name: 'Updated User' };
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await userApi.updateUser(userId, userData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/users/${userId}`, userData);
    });

    it('disableUser makes PATCH request to disable endpoint', async () => {
      const userId = 'user-123';
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await userApi.disableUser(userId);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/users/${userId}/disable`);
    });

    it('enableUser makes PATCH request to enable endpoint', async () => {
      const userId = 'user-123';
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await userApi.enableUser(userId);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(`/users/${userId}/enable`);
    });
  });

  describe('clientApi', () => {
    it('getAllClients makes GET request', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await clientApi.getAllClients();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/clients');
    });

    it('getClientById makes GET request with clientId', async () => {
      const clientId = 'client-123';
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      await clientApi.getClientById(clientId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/clients/${clientId}`);
    });

    it('createClient makes POST request with clientData', async () => {
      const clientData = { name: 'Test Client' };
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await clientApi.createClient(clientData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/clients', clientData);
    });

    it('updateClient makes PUT request with clientId and clientData', async () => {
      const clientId = 'client-123';
      const clientData = { name: 'Updated Client' };
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await clientApi.updateClient(clientId, clientData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(`/clients/${clientId}`, clientData);
    });

    it('deleteClient makes DELETE request with clientId', async () => {
      const clientId = 'client-123';
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await clientApi.deleteClient(clientId);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/clients/${clientId}`);
    });

    it('verifyClient makes POST request to verify endpoint', async () => {
      const clientId = 'client-123';
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await clientApi.verifyClient(clientId);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(`/clients/${clientId}/verify`);
    });
  });

  describe('transactionApi', () => {
    it('getAllTransactions makes GET request with filters', async () => {
      const filters = { status: 'COMPLETED', limit: 10 };
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await transactionApi.getAllTransactions(filters);

      expect(mockAxiosInstance.get).toHaveBeenCalled();
      const callArg = mockAxiosInstance.get.mock.calls[0][0];
      expect(callArg).toContain('/transactions?');
      expect(callArg).toContain('status=COMPLETED');
      expect(callArg).toContain('limit=10');
    });

    it('getTransactionById makes GET request with transactionId', async () => {
      const transactionId = 'txn-123';
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      await transactionApi.getTransactionById(transactionId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/transactions/${transactionId}`);
    });

    it('getTransactionsByClientId makes GET request with clientId', async () => {
      const clientId = 'client-123';
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      await transactionApi.getTransactionsByClientId(clientId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/clients/${clientId}/transactions`);
    });

    it('syncFromSFTP makes POST request to sync endpoint', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await transactionApi.syncFromSFTP();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/transactions/sync-sftp');
    });
  });

  describe('API interceptors', () => {
    it('adds authorization token to requests', async () => {
      const config = { headers: {} };
      
      // Call the interceptor
      if (mockAxiosInstance._requestInterceptor) {
        await mockAxiosInstance._requestInterceptor(config);
      }

      expect(authService.getIdToken).toHaveBeenCalled();
      expect(config.headers['x-amzn-oidc-data']).toBe('mock-token');
    });

    it('handles missing token gracefully', async () => {
      authService.getIdToken.mockResolvedValue(null);
      const config = { headers: {} };
      
      // Call the interceptor
      if (mockAxiosInstance._requestInterceptor) {
        await mockAxiosInstance._requestInterceptor(config);
      }

      expect(config.headers['x-amzn-oidc-data']).toBeUndefined();
    });
  });
});
