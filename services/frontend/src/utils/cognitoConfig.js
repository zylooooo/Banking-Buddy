import { Amplify } from 'aws-amplify';

const config = {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    region: import.meta.env.VITE_AWS_REGION,
    redirectUri: import.meta.env.VITE_REDIRECT_URI,
    logoutUri: import.meta.env.VITE_LOGOUT_URI,
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
                        'profile',
                        'aws.cognito.signin.user.admin'
                    ],
                    redirectSignIn: [config.redirectUri],
                    redirectSignOut: [config.logoutUri],
                    responseType: 'code',
                    providers: ['Cognito']
                }
            }
        }
    }
});

export default config;