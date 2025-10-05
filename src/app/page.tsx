// src/app/page.tsx

// Static generation for landing page - all animations are client-side
export const dynamic = 'force-static';

import AdaptiveLandingRenderer from '@/components/landing/AdaptiveLandingRenderer';

export default function HomePage() {
  return (
    <main id="main-content">
      <AdaptiveLandingRenderer />
    </main>
  );
}