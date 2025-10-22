// Development Authentication Service
// This is a simplified version for development without AWS Cognito

let mockUser = null;
let mockAuthenticated = false;

export const handleLogin = async () => {
    try {
        // Mock authentication - in development, automatically log in as admin
        mockUser = {
            email: 'admin@scroogebank.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            sub: 'mock-admin-id'
        };
        mockAuthenticated = true;
        localStorage.setItem('mockAuth', JSON.stringify({ authenticated: true, user: mockUser }));
        return true;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};

export const handleCallback = async () => {
    try {
        // Mock callback handling
        return { authenticated: mockAuthenticated };
    } catch (error) {
        console.error('Callback failed:', error);
        throw error;
    }
};

export const getUserFromToken = async () => {
    try {
        const stored = localStorage.getItem('mockAuth');
        if (stored) {
            const { user } = JSON.parse(stored);
            return user;
        }
        return null;
    } catch (error) {
        console.error('Get user failed:', error);
        return null;
    }
};

export const getIdToken = async () => {
    try {
        if (mockAuthenticated) {
            return 'mock-jwt-token';
        }
        return null;
    } catch (error) {
        console.error('Get ID token failed:', error);
        return null;
    }
};

export const getUserRole = async () => {
    try {
        const stored = localStorage.getItem('mockAuth');
        if (stored) {
            const { user } = JSON.parse(stored);
            return user.role || 'agent';
        }
        return null;
    } catch (error) {
        console.error('Get user role failed:', error);
        return null;
    }
};

export const isAuthenticated = async () => {
    try {
        const stored = localStorage.getItem('mockAuth');
        if (stored) {
            const { authenticated } = JSON.parse(stored);
            mockAuthenticated = authenticated;
            return authenticated;
        }
        return false;
    } catch (error) {
        return false;
    }
};

export const logout = async () => {
    try {
        mockUser = null;
        mockAuthenticated = false;
        localStorage.removeItem('mockAuth');
    } catch (error) {
        console.error('Logout failed:', error);
    }
};

export const handleForgotPassword = async () => {
    try {
        alert('Forgot password functionality will be implemented with AWS Cognito');
    } catch (error) {
        console.error('Forgot password failed:', error);
        throw error;
    }
};

// Development helper functions
export const loginAsAdmin = () => {
    mockUser = {
        email: 'admin@scroogebank.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        sub: 'mock-admin-id'
    };
    mockAuthenticated = true;
    localStorage.setItem('mockAuth', JSON.stringify({ authenticated: true, user: mockUser }));
};

export const loginAsAgent = () => {
    mockUser = {
        email: 'agent@scroogebank.com',
        firstName: 'Agent',
        lastName: 'Smith',
        role: 'agent',
        sub: 'mock-agent-id'
    };
    mockAuthenticated = true;
    localStorage.setItem('mockAuth', JSON.stringify({ authenticated: true, user: mockUser }));
};
