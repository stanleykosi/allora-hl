/**
 * @description
 * Client Component responsible for rendering the main content of the dashboard.
 * It receives initial data fetched on the server (passed as props) and manages
 * client-side state, periodic data fetching, and interactions between dashboard components.
 *
 * Key features:
 * - Manages periodic fetching of Hyperliquid account info and Allora predictions status.
 * - Displays API connection statuses using StatusIndicator.
 * - Renders AccountSummary, PositionTable, PredictionFeed, TradePanel, and TradeLog.
 * - Manages shared state like the selected prediction.
 *
 * @dependencies
 * - React: For component structure, state (`useState`, `useEffect`), and refs.
 * - @/types: Type definitions for initial props and state.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/hyperliquid-actions: Server Action for fetching Hyperliquid account info.
 * - @/components/ui/StatusIndicator: Shared component for displaying status.
 * - @/components/ui/LoadingSpinner: Shared component for loading indication.
 * - @/components/ui/ErrorDisplay: Shared component for displaying errors.
 * - ./AccountSummary: Component to display account balance/margin info.
 * - ./PositionTable: Component to display open positions.
 * - ./AlloraStatusIndicator: Component to display Allora API status.
 * - Placeholder components (PredictionFeed, TradePanel, TradeLog) to be replaced later.
 * - @/lib/constants: Provides default settings values.
 *
 * @notes
 * - Marked with `"use client"` directive.
 * - Takes initial data and error states as props from the parent Server Component (`DashboardPage`).
 * - Manages fetching and state for Hyperliquid account info.
 * - Delegates display of account info to the `AccountSummary` component.
 * - Renders status indicators for both Allora and Hyperliquid APIs.
 */
"use client";

import React, { useState, useEffect } from "react";
import type {
  HyperliquidAccountInfo,
  HyperliquidPosition,
  AlloraPrediction,
  TradeLogEntry,
  AppSettings,
} from "@/types";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchHyperliquidAccountInfoAction } from "@/actions/hyperliquid-actions";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import StatusIndicator, { StatusType } from "@/components/ui/StatusIndicator";
import AccountSummary from "./AccountSummary"; // Import the actual component
import PositionTable from "./PositionTable"; // Import the actual PositionTable component
import AlloraStatusIndicator from "./AlloraStatusIndicator"; // Import the status component
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";

// Placeholder components - these will be imported properly in later steps
const TradeLogPlaceholder = ({ initialLogs, initialError }: { initialLogs: TradeLogEntry[] | null, initialError: string | null }) => (
  <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[150px]">
    <h3 className="font-semibold mb-2">Trade Log</h3>
    {initialError && <p className="text-destructive text-sm">Error loading: {initialError}</p>}
    <pre className="text-xs overflow-auto">{JSON.stringify(initialLogs, null, 2)}</pre>
    <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 26)</p>
  </div>
);
const PredictionFeedPlaceholder = ({ initialPredictions, initialError, onSelect }: { initialPredictions: AlloraPrediction[] | null, initialError: string | null, onSelect: (p: AlloraPrediction | null) => void }) => (
  <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[200px]">
    <h3 className="font-semibold mb-2">Allora Predictions</h3>
    {initialError && <p className="text-destructive text-sm">Error loading: {initialError}</p>}
    <pre className="text-xs overflow-auto">{JSON.stringify(initialPredictions, null, 2)}</pre>
    <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 19)</p>
    {/* Basic selection simulation */}
    {initialPredictions && initialPredictions.length > 0 && (
      <button onClick={() => onSelect(initialPredictions[0])} className="text-xs mt-2 p-1 border rounded">Select First Prediction</button>
    )}
    <button onClick={() => onSelect(null)} className="text-xs mt-2 p-1 border rounded ml-2">Deselect</button>
  </div>
);
const TradePanelPlaceholder = ({ selectedPrediction }: { selectedPrediction: AlloraPrediction | null }) => (
  <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[200px]">
    <h3 className="font-semibold mb-2">Trade Panel</h3>
    <p className="text-sm mb-2">Selected Prediction:</p>
    <pre className="text-xs overflow-auto bg-muted p-2 rounded min-h-[50px]">
      {selectedPrediction ? JSON.stringify(selectedPrediction, null, 2) : "None selected"}
    </pre>
    <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 23)</p>
  </div>
);

/**
 * Props for the DashboardClientContent component.
 * Contains the initial data fetched server-side.
 */
interface DashboardClientContentProps {
  initialAccountInfo: HyperliquidAccountInfo | null;
  initialAccountError: string | null;
  initialPositions: HyperliquidPosition[] | null;
  initialPositionsError: string | null;
  initialPredictions: AlloraPrediction[] | null;
  initialPredictionsError: string | null;
  initialLogs: TradeLogEntry[] | null;
  initialLogsError: string | null;
}

/**
 * Renders the main dashboard layout and manages client-side state.
 * @param {DashboardClientContentProps} props - Initial data and error states.
 * @returns {React.ReactElement} The rendered dashboard client content.
 */
export default function DashboardClientContent({
  initialAccountInfo,
  initialAccountError,
  initialPositions,
  initialPositionsError,
  initialPredictions,
  initialPredictionsError,
  initialLogs,
  initialLogsError,
}: DashboardClientContentProps): React.ReactElement {
  // Get app settings from local storage
  const [settings] = useLocalStorage<AppSettings>(
    'alloraHyperliquidApp_settings',
    DEFAULT_APP_SETTINGS
  );

  // State for selected prediction
  const [selectedPrediction, setSelectedPrediction] =
    useState<AlloraPrediction | null>(null);

  // Fetch Hyperliquid Account Info periodically
  const {
    data: accountInfo,
    isLoading: isLoadingAccountInfo,
    error: accountInfoError,
    refresh: refreshAccountInfo, // Function to manually trigger refresh if needed
  } = usePeriodicFetcher(
    fetchHyperliquidAccountInfoAction,
    settings.accountRefreshInterval,
    initialAccountInfo // Use initial data from server
  );

  // Determine Hyperliquid API status
  const getHyperliquidStatus = (): StatusType => {
    if (isLoadingAccountInfo) return 'connecting';
    // Show error status persistently if there was an error, even if data exists (stale)
    if (accountInfoError) return 'error';
    if (accountInfo) return 'connected';
    return 'idle'; // Initial state or unexpected state
  };

  // Callback function for the PredictionFeed to update the selected prediction
  const handleSelectPrediction = (prediction: AlloraPrediction | null) => {
    console.log("Prediction selected:", prediction);
    setSelectedPrediction(prediction);
  };

  // Use the initial error from props if the first client-side fetch hasn't happened yet
  const currentAccountInfoError = accountInfo === null ? initialAccountError : accountInfoError;
  const currentAccountInfo = accountInfo ?? initialAccountInfo; // Prefer fresh data, fallback to initial

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        {/* Status Indicators */}
        <div className="flex space-x-4">
          <AlloraStatusIndicator />
          <StatusIndicator
            status={getHyperliquidStatus()}
            serviceName="Hyperliquid"
            className="text-xs"
          />
        </div>
      </div>


      {/* Grid layout for dashboard sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Summary Component */}
          <AccountSummary
            currentAccountInfo={currentAccountInfo}
            isLoading={isLoadingAccountInfo} // Pass loading state
            error={currentAccountInfoError} // Pass current error state
          />

          {/* Position Table Component */}
          <PositionTable
            initialPositions={initialPositions}
            initialError={initialPositionsError}
          />

          {/* Trade Log Display Component (Placeholder) */}
          <TradeLogPlaceholder
            initialLogs={initialLogs}
            initialError={initialLogsError}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Prediction Feed Component (Placeholder) */}
          <PredictionFeedPlaceholder
            initialPredictions={initialPredictions}
            initialError={initialPredictionsError}
            onSelect={handleSelectPrediction}
          />

          {/* Trade Panel Component (Placeholder) */}
          <TradePanelPlaceholder
            selectedPrediction={selectedPrediction}
          />
        </div>
      </div>
    </div>
  );
}