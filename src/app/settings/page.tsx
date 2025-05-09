/**
 * @description
 * Server Component for the application settings page (route '/settings').
 * Fetches initial data, specifically the list of saved Trade Parameter Templates,
 * and renders client components responsible for managing templates and UI preferences.
 *
 * Key features:
 * - Fetches trade templates using `getTemplatesAction`.
 * - Renders the `ManageTemplatesClient` component to handle template UI.
 * - Renders the `SettingsForm` component for UI settings management using localStorage.
 * - Passes fetched templates down as props to `ManageTemplatesClient`.
 * - Includes basic error handling display for the initial template fetch.
 * - Added standard page spacing and heading style.
 *
 * @dependencies
 * - React: For component structure.
 * - @/actions/template-actions: Server Action to fetch trade templates from the database.
 * - @/types: Type definitions for TradeTemplate and ActionState.
 * - @/app/settings/_components/ManageTemplatesClient: Client component for template management.
 * - @/app/settings/_components/SettingsForm: Client component for UI settings management.
 *
 * @notes
 * - This page uses a Server Component approach for initial data loading (templates).
 * - The actual UI interaction and state management for settings and templates
 * are handled within their respective client components (`ManageTemplatesClient`, `SettingsForm`).
 */
import React from 'react';
import { getTemplatesAction } from '@/actions/template-actions';
import type { TradeTemplate } from '@/types';
// Import the actual client component for managing templates
import ManageTemplatesClient from './_components/ManageTemplatesClient';
// Import the actual client component for managing UI settings
import SettingsForm from './_components/SettingsForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Settings - Allora Hyperliquid Assistant",
};

/**
 * Renders the settings page.
 * Fetches initial trade templates and passes them to the client component.
 * Renders the form for managing UI settings.
 * @returns {Promise<JSX.Element>} A promise resolving to the rendered settings page component.
 */
export default async function SettingsPage(): Promise<JSX.Element> {
  console.log("Fetching initial data for SettingsPage...");

  // Fetch initial trade templates
  const templatesResult = await getTemplatesAction();

  const initialTemplates = templatesResult.isSuccess ? templatesResult.data : null;
  const initialTemplatesError = !templatesResult.isSuccess ? templatesResult.message : null;

  console.log("Initial templates fetch complete.");
  console.log("Templates:", initialTemplates ? "OK" : `Error: ${initialTemplatesError}`);

  return (
    // Added standard vertical spacing and centering
    <div className="container mx-auto mt-16 space-y-8">
      {/* Added heading style consistency */}
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>

      {/* Section for managing UI Preferences (e.g., refresh intervals, alerts) */}
      <SettingsForm />

      {/* Section for managing Trade Parameter Templates */}
      <ManageTemplatesClient
        initialTemplates={initialTemplates}
        initialError={initialTemplatesError}
      />

    </div>
  );
}