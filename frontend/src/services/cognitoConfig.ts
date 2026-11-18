import { Amplify } from 'aws-amplify';

const env = import.meta.env;
const userPoolId = env.VITE_COGNITO_USER_POOL_ID?.trim();
const userPoolClientId = env.VITE_COGNITO_APP_CLIENT_ID?.trim();
const region = env.VITE_AWS_REGION?.trim();

function isPlaceholder(value: string | undefined) {
  return !value || /your-|example|placeholder/i.test(value);
}

const missing = [
  isPlaceholder(userPoolId) && 'VITE_COGNITO_USER_POOL_ID',
  isPlaceholder(userPoolClientId) && 'VITE_COGNITO_APP_CLIENT_ID',
  isPlaceholder(region) && 'VITE_AWS_REGION',
].filter((name): name is string => Boolean(name));

if (missing.length === 0 && userPoolId && userPoolClientId && region) {
  const poolRegion = userPoolId.split('_', 1)[0];
  if (poolRegion !== region) {
    missing.push('VITE_AWS_REGION (must match the User Pool region)');
  } else {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          loginWith: { email: true },
          signUpVerificationMethod: 'code',
        },
      },
    });
  }
}

export const cognitoConfiguration = {
  configured: missing.length === 0,
  missing,
};
