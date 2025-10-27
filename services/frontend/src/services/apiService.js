import axios from 'axios';
import { getIdToken } from './authService';

// Use different URLs for Docker vs browser
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

console.log('API_BASE_URL:', API_BASE_URL); // Debug log
console.log('isDevelopment:', isDevelopment); // Debug log

apiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        // FOR DEVELOPMENT ONLY, WHEN ALB IMPLEMENTED, SEND BEARER AUTH STILL
        config.headers['x-amzn-oidc-data'] = token;
    }
    return config;
});

// User Service API endpoints (port 8080)
export const userApi = {
    getAllUsers: () => apiClient.get('/users'),
    getUserById: (userId) => apiClient.get(`/users/${userId}`),
    createUser: (userData) => apiClient.post('/users', userData),
    updateUser: (userId, userData) => apiClient.patch(`/users/${userId}`, userData),
    disableUser: (userId) => apiClient.patch(`/users/${userId}/disable`),
    enableUser: (userId) => apiClient.patch(`/users/${userId}/enable`),
    resetPassword: (userId) => apiClient.post(`/users/${userId}/reset-password`),
    setUpMFAForUser: (userId) => apiClient.patch(`/users/${userId}/MFA`),
};

// Client Service API endpoints (port 8081)
const CLIENT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('8080', '8081');

const clientApiClient = axios.create({
    baseURL: CLIENT_API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

console.log('CLIENT_API_BASE_URL:', CLIENT_API_BASE_URL); // Debug log

clientApiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        config.headers['x-amzn-oidc-data'] = token;
    }
    return config;
});

export const clientApi = {
    // Client Management
    getAllClients: () => clientApiClient.get('/clients'),
    getClientById: (clientId) => clientApiClient.get(`/clients/${clientId}`),
    createClient: (clientData) => clientApiClient.post('/clients', clientData),
    updateClient: (clientId, clientData) => clientApiClient.put(`/clients/${clientId}`, clientData),
    deleteClient: (clientId) => clientApiClient.delete(`/clients/${clientId}`),
    verifyClient: (clientId) => clientApiClient.post(`/clients/${clientId}/verify`),
    
    // Account Management
    getAllAccounts: () => clientApiClient.get('/accounts'),
    createAccount: (accountData) => clientApiClient.post('/accounts', accountData),
    deleteAccount: (accountId) => clientApiClient.delete(`/accounts/${accountId}`),
};

// Transaction Service API endpoints (port 8082 or client service)
export const transactionApi = {
    getAllTransactions: (filters = {}) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });
        return clientApiClient.get(`/transactions?${params.toString()}`);
    },
    getTransactionById: (transactionId) => clientApiClient.get(`/transactions/${transactionId}`),
    getTransactionsByClientId: (clientId) => clientApiClient.get(`/clients/${clientId}/transactions`),
    syncFromSFTP: () => clientApiClient.post('/transactions/sync-sftp'),
    getTransactionStats: () => clientApiClient.get('/transactions/stats'),
};

// Communication API endpoints
export const communicationApi = {
    sendClientEmail: (clientId, emailData) => clientApiClient.post(`/clients/${clientId}/communications/email`, emailData),
    getCommunicationStatus: (communicationId) => clientApiClient.get(`/communications/${communicationId}/status`),
    getCommunicationHistory: (clientId) => clientApiClient.get(`/clients/${clientId}/communications`),
};

// Audit Log API endpoints
export const auditApi = {
    getAllLogs: (filters = {}) => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                params.append(key, filters[key]);
            }
        });
        return clientApiClient.get(`/audit-logs?${params.toString()}`);
    },
    getLogsByClientId: (clientId) => clientApiClient.get(`/audit-logs/client/${clientId}`),
    getLogsByAgentId: (agentId) => clientApiClient.get(`/audit-logs/agent/${agentId}`),
};

export default apiClient;