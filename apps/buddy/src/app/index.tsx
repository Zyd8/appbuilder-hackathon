import { Redirect } from 'expo-router';

import { usePreviewStore } from '@/state/preview-store';

export default function Entry() {
  const signedIn = usePreviewStore((s) => Boolean(s.account));
  const onboarded = usePreviewStore((s) => s.onboarded);
  // Login is required before onboarding (ADR-005); the welcome screen routes to it.
  return <Redirect href={signedIn && onboarded ? '/today' : '/onboarding'} />;
}
