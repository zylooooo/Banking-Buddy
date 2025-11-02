import { Amplify } from 'aws-amplify';

const config = {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    region: import.meta.env.VITE_AWS_REGION,
    redirectUri: import.meta.env.VITE_REDIRECT_URI,
    logoutUri: import.meta.env.VITE_LOGOUT_URI,
};

// Dynamically determine redirect URIs based on current window location
// This ensures the redirect URIs match the actual deployed URL (CloudFront or custom domain)
// Fallback to env vars for local development or when window is not available
const getRedirectSignIn = () => {
    if (typeof window !== 'undefined') {
        // Use current window origin for deployed environments
        const origin = window.location.origin;
        const dynamicCallback = `${origin}/callback`;
        
        // Include both dynamic URL and env var (if different) to support both deployed and local dev
        const urls = [dynamicCallback];
        if (config.redirectUri && config.redirectUri !== dynamicCallback) {
            urls.push(config.redirectUri);
        }
        return urls;
    }
    // Fallback for SSR or when window is not available
    return [config.redirectUri].filter(Boolean);
};

const getRedirectSignOut = () => {
    if (typeof window !== 'undefined') {
        // Use current window origin for deployed environments
        const origin = window.location.origin;
        
        // Include both dynamic URL and env var (if different) to support both deployed and local dev
        const urls = [origin];
        if (config.logoutUri && config.logoutUri !== origin) {
            urls.push(config.logoutUri);
        }
        return urls;
    }
    // Fallback for SSR or when window is not available
    return [config.logoutUri].filter(Boolean);
};

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: config.userPoolId,
            userPoolClientId: config.clientId,
            loginWith: {
                oauth: {
                    domain: `${config.domain}.auth.${config.region}.amazoncognito.com`,
                    scopes: [
                        'openid',
                        'email',
                        'phone',
                        'profile',
                        'aws.cognito.signin.user.admin'
                    ],
                    redirectSignIn: getRedirectSignIn(),
                    redirectSignOut: getRedirectSignOut(),
                    responseType: 'code'
                }
            }
        }
    }
});

export default config;