import { Amplify } from 'aws-amplify';

const config = {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    region: import.meta.env.VITE_AWS_REGION,
    redirectUri: import.meta.env.VITE_REDIRECT_URI,
    logoutUri: import.meta.env.VITE_LOGOUT_URI,
};

/**
 * Get the redirect URI based on the current window location.
 * 
 * Best Practice (per AWS documentation):
 * - The redirect URI in Amplify config MUST exactly match one of the callback URLs
 *   registered in Cognito User Pool Client settings
 * - Use window.location.origin for runtime determination (supports CloudFront/custom domains)
 * - Fallback to env vars for local development or when window is unavailable
 * 
 * Note: Cognito must have ALL possible redirect URIs registered:
 * - CloudFront domain: https://{cloudfront-domain}.cloudfront.net/callback
 * - Custom domain (if configured): https://{custom-domain}/callback
 * - Local dev: http://localhost:3000/callback
 */
const getRedirectSignIn = () => {
    // Runtime check: use current window location (works for all deployed environments)
    if (typeof window !== 'undefined' && window.location.origin) {
        // Use the actual origin where the app is running (CloudFront, custom domain, or localhost)
        return [`${window.location.origin}/callback`];
    }
    // Fallback: use env var (for SSR, build time, or local development)
    return [config.redirectUri].filter(Boolean);
};

const getRedirectSignOut = () => {
    // Runtime check: use current window location (works for all deployed environments)
    if (typeof window !== 'undefined' && window.location.origin) {
        // Use the actual origin where the app is running (CloudFront, custom domain, or localhost)
        return [window.location.origin];
    }
    // Fallback: use env var (for SSR, build time, or local development)
    return [config.logoutUri].filter(Boolean);
};

// Configure Amplify with dynamic redirect URIs
// This ensures the redirect URI matches the actual deployed URL
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