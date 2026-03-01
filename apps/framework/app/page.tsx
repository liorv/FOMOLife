import { Suspense } from 'react';
import FrameworkHost from '@/components/FrameworkHost';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'FOMO Life';

export default function FrameworkPage() {
  return (
    <Suspense fallback={<main className="main-layout" />}>
      <FrameworkHost appName={appName} />
    </Suspense>
  );
}
