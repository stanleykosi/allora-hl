/**
 * @description
 * Loading UI component for the dashboard route group `(dashboard)`.
 * This component is automatically rendered by Next.js App Router as the fallback
 * for the `<React.Suspense>` boundary defined in `src/app/(dashboard)/layout.tsx`
 * while Server Components within the route group are loading data.
 *
 * @dependencies
 * - React: For component structure.
 *
 * @notes
 * - This will be enhanced in Step 14 to use a proper `LoadingSpinner` component.
 */
import React from "react";

/**
 * Renders the loading state UI for the dashboard.
 * @returns {React.ReactElement} The loading UI component.
 */
export default function Loading(): React.ReactElement {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      {/* Placeholder Text - To be replaced by LoadingSpinner in Step 14 */}
      <p className="text-lg animate-pulse">Loading Dashboard...</p>
    </div>
  );
}