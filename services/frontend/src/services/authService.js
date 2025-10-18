import { signInWithRedirect, signOut, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

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