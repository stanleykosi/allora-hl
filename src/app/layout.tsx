/**
 * @description
 * Root layout component for the Next.js application.
 * Applies global styles and sets up the basic HTML structure.
 *
 * @dependencies
 * - next/font/google: For loading the Inter font.
 * - ../styles/globals.css: For global application styles (including Tailwind CSS).
 *
 * @notes
 * - Metadata object provides site-wide SEO information.
 * - The `lang="en"` attribute sets the default language for accessibility.
 * - Includes the main `<body>` tag where page content will be rendered.
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Import global styles, including Tailwind
import React from "react";

// Load the Inter font with Latin subset
const inter = Inter({ subsets: ["latin"] });

// Define application metadata (can be expanded later)
export const metadata: Metadata = {
  title: "Allora Hyperliquid Assistant",
  description: "Trade assistant using Allora predictions on Hyperliquid.",
  // Add more metadata tags here (e.g., icons, open graph)
};

/**
 * The root layout component.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout (typically the current page).
 * @returns {JSX.Element} The rendered root layout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>){
  return (
    <html lang="en">
      {/* Apply the Inter font className to the body */}
      <body className={inter.className}> 
        {/* Render the children components (page content) */}
        {children}
      </body>
    </html>
  );
}
