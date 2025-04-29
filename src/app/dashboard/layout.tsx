/**
 * @description
 * Layout component for the main application dashboard section (`(dashboard)` route group).
 * Defines the primary structure including a header and main content area.
 * Wraps the content in React Suspense to handle loading states.
 * Includes a navigation link to the Settings page.
 *
 * @dependencies
 * - react: For component structure and Suspense.
 * - next/link: For client-side navigation.
 * - @/components/ui/button: Shadcn Button component for styling the link.
 * - lucide-react: For the Settings icon.
 *
 * @notes
 * - This is a Server Component by default.
 * - The header now contains a functional link to the `/settings` page.
 * - The Suspense fallback uses `loading.tsx` in the same directory.
 */
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

/**
 * DashboardLayout component.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Child components (typically the dashboard page) to be rendered within this layout.
 * @returns {React.ReactElement} The rendered dashboard layout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Section */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Allora / Hyperliquid</h1>
          {/* Header Actions: Status Indicators, Master Switch (future), Settings Link */}
          <div className="flex items-center space-x-4">
            {/* Placeholder for Status Indicators */}
            {/* <div className="flex space-x-2">
              <AlloraStatusIndicator />
              <StatusIndicator status={'idle'} serviceName="Hyperliquid" />
            </div> */}

            {/* Placeholder for Master Trade Switch */}
            {/* <div>Master Switch</div> */}

            {/* Settings Link */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {/*
         * Wrap children in Suspense. The `loading.tsx` file in the same directory
         * will be automatically used as the fallback UI by Next.js App Router.
         * If `loading.tsx` wasn't used, a manual fallback like <LoadingSpinner /> would be needed here.
         */}
        {children}
      </main>

      {/* Footer Placeholder (Optional) */}
      {/* <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        © 2025 Trade Assistant
      </footer> */}
    </div>
  );
}