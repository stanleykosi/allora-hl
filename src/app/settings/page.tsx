/**
 * @description
 * Server Component for the application settings page (route '/settings').
 * Fetches initial data, specifically the list of saved Trade Parameter Templates,
 * and renders client components responsible for managing templates and UI preferences.
 *
 * Key features:
 * - Fetches trade templates using `getTemplatesAction`.
 * - Renders the `ManageTemplatesClient` component to handle template UI.
 * - Renders the `SettingsForm` component (placeholder for now) for UI settings.
 * - Passes fetched templates down as props.
 * - Includes basic error handling for the initial data fetch.
 *
 * @dependencies
 * - React: For component structure.
 * - @/actions/template-actions: Server Action to fetch trade templates from the database.
 * - @/types: Type definitions for TradeTemplate and ActionState.
 * - @/app/settings/_components/ManageTemplatesClient: Client component for template management.
 * - Placeholder Client Components: `SettingsForm` (to be created in subsequent steps).
 * - @/components/ui/ErrorDisplay: To show fetch errors (handled within ManageTemplatesClient now).
 *
 * @notes
 * - This page uses a Server Component approach for initial data loading.
 * - The actual UI interaction and state management for settings and templates
 * will be handled within the client components (`ManageTemplatesClient`, `SettingsForm`).
 */
import React from 'react';
import { getTemplatesAction } from '@/actions/template-actions';
import type { TradeTemplate } from '@/types';
// Import the actual client component for managing templates
import ManageTemplatesClient from './_components/ManageTemplatesClient';

// Placeholder component for SettingsForm - Replace with actual import in Step 22
const SettingsForm = () => (
  <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[150px]">
    <h3 className="font-semibold mb-2">UI & Fetch Settings</h3>
    <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 22)</p>
  </div>
);


/**
 * Renders the settings page.
 * Fetches initial trade templates and passes them to the client component.
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
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>

      {/* Section for managing Trade Parameter Templates */}
      <ManageTemplatesClient
        initialTemplates={initialTemplates}
        initialError={initialTemplatesError}
      />

      {/* Section for managing UI Preferences (e.g., refresh intervals, alerts) */}
      {/* This remains a placeholder until Step 22 */}
      <SettingsForm />

    </div>
  );
}