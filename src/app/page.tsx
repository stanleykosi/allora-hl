/**
 * @description
 * The default home page component for the application (route '/').
 * Currently displays a simple placeholder message. Will be updated later
 * to potentially redirect to the main dashboard.
 *
 * @dependencies
 * - React: For component structure.
 *
 * @notes
 * - This is a Server Component by default in the Next.js App Router.
 */
import React from 'react';

/**
 * Renders the default home page.
 * @returns {React.ReactNode} The rendered home page component.
 */
export default function Home(): React.ReactNode {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold">Allora Hyperliquid Assistant</h1>
      <p className="mt-4">Loading...</p> 
      {/* This content will be replaced later, possibly with a redirect */}
    </main>
  );
}

