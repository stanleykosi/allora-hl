/**
 * @description
 * Loading UI component for the dashboard route group `(dashboard)`.
 * This component is automatically rendered by Next.js App Router as the fallback
 * for the `<React.Suspense>` boundary defined in `src/app/(dashboard)/layout.tsx`
 * while Server Components within the route group are loading data.
 *
 * @dependencies
 * - React: For component structure.
 * - @/components/ui/LoadingSpinner: The shared loading spinner component.
 *
 * @notes
 * - Uses the shared LoadingSpinner component for consistent loading indication.
 */
import React from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Renders the loading state UI for the dashboard using the LoadingSpinner component.
 * @returns {React.ReactElement} The loading UI component.
 */
export default function Loading(): React.ReactElement {
  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center space-y-4">
      <LoadingSpinner size={48} />
      <p className="text-lg text-muted-foreground">Loading Dashboard Data...</p>
    </div>
  );
}