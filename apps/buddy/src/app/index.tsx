import { Redirect } from 'expo-router';

import { usePreviewStore } from '@/state/preview-store';

export default function Entry() {
  const onboarded = usePreviewStore((s) => s.onboarded);
  return <Redirect href={onboarded ? '/today' : '/onboarding'} />;
}
