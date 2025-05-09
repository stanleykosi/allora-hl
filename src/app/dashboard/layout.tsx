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
 * - Uses a responsive container with padding.
 * - Header uses flexbox for alignment and spacing.
 * - Main content area includes subtle border for visual separation.
 */
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn utility

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
    <div className="flex flex-col min-h-screen bg-muted/40">
      {/* Header Section */}
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side: Title */}
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Allora / Hyperliquid
          </Link>

          {/* Right side: Actions */}
          <div className="flex items-center space-x-4">
            {/* Placeholder for Status Indicators & Master Switch (populated by Client Component) */}
            {/* <div id="dashboard-header-status"></div> */}

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
      <main className="flex-1 container mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Subtle border added for visual separation if needed, consider removing if cards provide enough separation */}
        {/* <div className="border rounded-lg bg-background shadow-sm p-4 md:p-6 lg:p-8"> */}
          {/*
           * Wrap children in Suspense. The `loading.tsx` file in the same directory
           * will be automatically used as the fallback UI by Next.js App Router.
           */}
          {children}
        {/* </div> */}
      </main>

      {/* Footer Placeholder (Optional) */}
      {/* <footer className="py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Trade Assistant
      </footer> */}
    </div>
  );
}