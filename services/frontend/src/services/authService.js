import {
    signInWithRedirect,
    signOut,
    fetchAuthSession,
    fetchUserAttributes,
    updateUserAttributes,
    confirmUserAttribute,
    updateMFAPreference
} from 'aws-amplify/auth';

export const handleLogin = async () => {
    try {
        await signInWithRedirect();
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};

export const handleCallback = async () => {
    try {
        const session = await fetchAuthSession();
        return session;
    } catch (error) {
        console.error('Callback failed:', error);
        throw error;
    }
};

export const getUserFromToken = async () => {
    try {
        const attributes = await fetchUserAttributes();
        return {
            email: attributes.email,
            firstName: attributes.given_name,
            lastName: attributes.family_name,
            role: attributes['custom:role'],
            sub: attributes.sub,
        };
    } catch (error) {
        console.error('Get user failed:', error);
        return null;
    }
};

export const getIdToken = async () => {
    try {
        const session = await fetchAuthSession();
        return session.tokens?.idToken?.toString() || null;
    } catch (error) {
        console.error('Get ID token failed:', error);
        return null;
    }
};

export const isAuthenticated = async () => {
    try {
        const session = await fetchAuthSession();
        return session.tokens !== undefined;
    } catch (error) {
        return false;
    }
};

export const logout = async () => {
    try {
        await signOut();
    } catch (error) {
        console.error('Logout failed:', error);
    }
};

// REMOVE the custom resetPassword functions and use Hosted UI
export const handleForgotPassword = async () => {
    try {
        const config = {
            userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
            clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        };

        const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
        const region = import.meta.env.VITE_AWS_REGION;
        const redirectUri = import.meta.env.VITE_REDIRECT_URI;

        // Use Cognito Hosted UI for password reset
        const forgotPasswordUrl = `https://${cognitoDomain}.auth.${region}.amazoncognito.com/forgotPassword?client_id=${config.clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(redirectUri)}`;

        window.location.href = forgotPasswordUrl;
    } catch (error) {
        console.error('Forgot password failed:', error);
        throw error;
    }
};

export { updateUserAttributes, confirmUserAttribute, updateMFAPreference };
