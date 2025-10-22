import axios from 'axios';
import { getIdToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    if (token) {
        // FOR DEVELOPMENT ONLY, WHEN ALB IMPLEMENTED, SEND BEARER AUTH STILL
        config.headers['x-amzn-oidc-data'] = token;
    }
    return config;
});

export const userApi = {
    getAllUsers: () => apiClient.get('/users'),
    getUserById: (userId) => apiClient.get(`/users/${userId}`),
    createUser: (userData) => apiClient.post('/users', userData),
    updateUser: (userId, userData) => apiClient.patch(`/users/${userId}`, userData),
    disableUser: (userId) => apiClient.patch(`/users/${userId}/disable`),
    enableUser: (userId) => apiClient.patch(`/users/${userId}/enable`),
    resetPassword: (userId) => apiClient.post(`/users/${userId}/reset-password`),
    authenticate: (credentials) => apiClient.post('/users/authenticate', credentials),
};

// Client API calls
export const clientApi = {
    getAllClients: (params) => apiClient.get('/clients', { params }),
    getClientById: (clientId) => apiClient.get(`/clients/${clientId}`),
    createClient: (clientData) => apiClient.post('/clients', clientData),
    updateClient: (clientId, clientData) => apiClient.put(`/clients/${clientId}`, clientData),
    deleteClient: (clientId) => apiClient.delete(`/clients/${clientId}`),
    verifyClient: (clientId, verificationData) => apiClient.post(`/clients/${clientId}/verify`, verificationData),
};

// Account API calls
export const accountApi = {
    getAllAccounts: (params) => apiClient.get('/accounts', { params }),
    getAccountById: (accountId) => apiClient.get(`/accounts/${accountId}`),
    createAccount: (accountData) => apiClient.post('/accounts', accountData),
    updateAccount: (accountId, accountData) => apiClient.put(`/accounts/${accountId}`, accountData),
    deleteAccount: (accountId) => apiClient.delete(`/accounts/${accountId}`),
    getAccountsByClient: (clientId) => apiClient.get(`/accounts?clientId=${clientId}`),
};

// Transaction API calls
export const transactionApi = {
    getAllTransactions: (params) => apiClient.get('/transactions', { params }),
    getTransactionById: (transactionId) => apiClient.get(`/transactions/${transactionId}`),
    getTransactionsByAccount: (accountId) => apiClient.get(`/transactions?accountId=${accountId}`),
    syncSftpData: () => apiClient.post('/transactions/sync-sftp'),
};

// Log API calls
export const logApi = {
    getAllLogs: (params) => apiClient.get('/logs', { params }),
    createLog: (logData) => apiClient.post('/logs', logData),
};

// Communication API calls
export const communicationApi = {
    sendEmail: (emailData) => apiClient.post('/communications/email', emailData),
    getCommunicationStatus: (communicationId) => apiClient.get(`/communications/${communicationId}`),
};

// Statistics API calls
export const statsApi = {
    getDashboardStats: () => apiClient.get('/stats/dashboard'),
    getUserStats: (userId) => apiClient.get(`/stats/users/${userId}`),
    getClientStats: () => apiClient.get('/stats/clients'),
};

export default apiClient;