/**
 * @description
 * Root layout component for the Next.js application.
 * Applies global styles, fonts, and sets up the basic HTML structure.
 * Includes the Toaster component for displaying notifications.
 *
 * @dependencies
 * - next/font/google: For loading the Inter font.
 * - ./globals.css: For global application styles (including Tailwind CSS).
 * - react: For component structure.
 * - next/metadata: For defining application metadata.
 * - @/components/ui/toaster: (Assumes Shadcn UI setup) Component for rendering toasts.
 *
 * @notes
 * - Metadata object provides site-wide SEO information.
 * - The `lang="en"` attribute sets the default language for accessibility.
 * - Includes the main `<body>` tag where page content will be rendered.
 * - `<Toaster />` is added to enable toast notifications throughout the app. Requires Shadcn UI setup.
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Import global styles, including Tailwind
import React from 'react';
// Assuming Shadcn UI setup, import the Toaster component
import { Toaster } from '@/components/ui/toaster'; // Path might change based on shadcn config

// Load the Inter font with Latin subset
const inter = Inter({ subsets: ['latin'] });

// Define application metadata
export const metadata: Metadata = {
  title: 'Allora Hyperliquid Assistant',
  description: 'Trade assistant using Allora predictions on Hyperliquid.',
  // Consider adding favicon links here later
  // icons: {
  //   icon: "/favicon.ico",
  // },
};

/**
 * The root layout component.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout (typically the current page or nested layouts).
 * @returns {React.ReactElement} The rendered root layout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
       * Apply the Inter font className to the body for consistent typography.
       * Use suppressHydrationWarning on <html> if using theme providers that might cause mismatches.
       */}
      <body className={inter.className}>
        {/* Render the children components (page content or nested layouts) */}
        {children}
        {/* Render the Toaster component to handle toast notifications */}
        <Toaster />
      </body>
    </html>
  );
}