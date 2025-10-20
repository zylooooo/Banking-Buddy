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
    setUpMFAForUser: (userId) => 
        apiClient.patch(`/users/${userId}/MFA`),
};

export default apiClient;