import { Redirect } from 'expo-router';

/**
 * OAuth redirect target. The in-app browser normally consumes this URL itself
 * (see `signInWithGoogle`); if the deep link opens the app directly, go back to the entry route.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
