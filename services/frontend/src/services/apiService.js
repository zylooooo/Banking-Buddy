import axios from 'axios';
import { getIdToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        // Primary: Send Bearer token for API Gateway Cognito authorizer
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// User Service API endpoints (port 8080)
export const userApi = {
    getAllUsers: (page = 0, limit = 10) => apiClient.get('/users', { params: { page, limit } }),
    getUserById: (userId) => apiClient.get(`/users/${userId}`),
    createUser: (userData) => apiClient.post('/users', userData),
    updateUser: (userId, userData) => apiClient.patch(`/users/${userId}`, userData),
    disableUser: (userId) => apiClient.patch(`/users/${userId}/disable`),
    enableUser: (userId) => apiClient.patch(`/users/${userId}/enable`),
    resetPassword: (userId) => apiClient.post(`/users/${userId}/reset-password`),
    setUpMFAForUser: (userId) => apiClient.patch(`/users/${userId}/MFA`),
    // TOTP setup endpoints
    associateTOTP: (accessToken) => apiClient.post('/users/totp/associate', { accessToken }),
    verifyTOTP: (accessToken, totpCode) => apiClient.post('/users/totp/verify', { accessToken, totpCode }),
};

// Client Service API endpoints (port 8081)
const CLIENT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('8080', '8081');

const clientApiClient = axios.create({
    baseURL: CLIENT_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

clientApiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        // Primary: Send Bearer token for API Gateway Cognito authorizer
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const clientApi = {
    // Client Management
    getAllClients: (page = 0, limit = 10, cacheBust) => {
        const params = { page, limit };
        if (cacheBust) {
            return clientApiClient.get(`/clients`, { params: { ...params, t: cacheBust } });
        }
        return clientApiClient.get('/clients', { params });
    },
    getClientById: (clientId) => clientApiClient.get(`/clients/${clientId}`),
    createClient: (clientData) => clientApiClient.post('/clients', clientData),
    updateClient: (clientId, clientData) => clientApiClient.put(`/clients/${clientId}`, clientData),
    deleteClient: (clientId) => clientApiClient.delete(`/clients/${clientId}`),
    verifyClient: (clientId) => clientApiClient.post(`/clients/${clientId}/verify`),
    
    // Account Management
    getAllAccounts: () => clientApiClient.get('/accounts'),
    // GET /api/accounts/{clientId} - fetch accounts for a specific client
    getAccountsByClientId: (clientId) => clientApiClient.get(`/accounts/${clientId}`),
    createAccount: (accountData) => clientApiClient.post('/accounts', accountData),
    deleteAccount: (accountId) => clientApiClient.delete(`/accounts/${accountId}`),
};

// Transaction Service API endpoints (port 8082)
const TRANSACTION_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('8080', '8082');

const transactionApiClient = axios.create({
    baseURL: TRANSACTION_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    // Configure params serializer for Spring's @ModelAttribute array binding
    paramsSerializer: {
        indexes: null // This makes axios send clientIds=id1&clientIds=id2 (repeated params)
    }
});

transactionApiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        // Primary: Send Bearer token for API Gateway Cognito authorizer
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const transactionApi = {
    // GET /api/transactions/all?page=0&limit=10
    getAllTransactions: (page = 0, limit = 10) =>
        transactionApiClient.get(`/transactions/all`, { params: { page, limit } }),

    // GET /api/transactions?clientId=CLIENT_ID&page=0&limit=10
    getTransactionsByClientId: (clientId, page = 0, limit = 10) =>
        transactionApiClient.get(`/transactions`, { params: { clientId, page, limit } }),

    // GET /api/transactions/search?...searchParams
    // Now arrays are automatically serialized correctly via paramsSerializer config
    searchTransactions: (searchParams = {}) =>
        transactionApiClient.get(`/transactions/search`, { params: searchParams }),
};

// Audit Service API endpoints
const AUDIT_API_BASE_URL = import.meta.env.VITE_AUDIT_API_BASE_URL || 'https://f827tiy8zj.execute-api.ap-southeast-1.amazonaws.com';

const auditApiClient = axios.create({
    baseURL: AUDIT_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

auditApiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        // Primary: Send Bearer token for API Gateway Cognito authorizer
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const auditApi = {
    // GET /api/v1/audit/logs - get all audit logs
    getAllLogs: (filters = {}) => {
        const params = {};
        if (filters.clientId) params.clientId = filters.clientId;
        if (filters.agentId) params.agentId = filters.agentId;
        if (filters.operation) params.operation = filters.operation;
        if (filters.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters.dateTo) params.dateTo = filters.dateTo;
        if (filters.attribute) params.attribute = filters.attribute;
        return auditApiClient.get('/api/v1/audit/logs', { params });
    },
    // GET /api/v1/audit/logs - get paginated audit logs
    getLogsPaginated: (pageSize = 10, nextToken = null, operation = null) => {
        const params = { page_size: pageSize };
        if (nextToken) params.next_token = nextToken;
        if (operation) params.operation = operation;
        return auditApiClient.get('/api/v1/audit/logs', { params });
    },
    // GET /api/v1/audit/logs?clientId=CLIENT_ID - get logs by client ID
    getLogsByClientId: (clientId) => auditApiClient.get('/api/v1/audit/logs', { params: { clientId } }),
    // GET /api/v1/audit/logs?agentId=AGENT_ID - get logs by agent ID
    getLogsByAgentId: (agentId) => auditApiClient.get('/api/v1/audit/logs', { params: { agentId } }),
};

// Communication API endpoints

// AI Service API endpoints (port 8083)
const AI_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('8080', '8083');

const aiApiClient = axios.create({
    baseURL: AI_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

aiApiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        config.headers['x-amzn-oidc-data'] = token;
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

export const aiApi = {
    // AI Guide
    askGuide: (question) => aiApiClient.post('/ai/guide/ask', { question }),
    
    // Natural Language Query
    processQuery: (query) => aiApiClient.post('/ai/query', { query }),
};

export default apiClient;