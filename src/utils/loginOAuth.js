import { withTimeout } from './asyncTimeout.js';

export async function beginOAuthSignIn(signInFn, returnTo, provider, timeoutMs = 15000) {
  const { data, error } = await withTimeout(signInFn(returnTo), timeoutMs, `${provider} sign-in`);
  if (error) throw error;
  if (!data?.url) throw new Error('Sign-in could not start. Please try again.');
  return data;
}
