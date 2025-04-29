/**
 * @description
 * Client Component responsible for rendering the main content of the dashboard.
 * It receives initial data fetched on the server (passed as props) and manages
 * client-side state, periodic data fetching, and interactions between dashboard components.
 *
 * Key features:
 * - Manages periodic fetching of Hyperliquid account info and positions.
 * - Displays API connection statuses using StatusIndicator.
 * - Renders AccountSummary, PositionTable, PredictionFeed, TradePanel, and TradeLog.
 * - Manages shared state like the selected prediction.
 *
 * @dependencies
 * - React: For component structure, state (`useState`), and effects (`useEffect`).
 * - @/types: Type definitions for initial props and state.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/hyperliquid-actions: Server Action for fetching Hyperliquid account info and positions.
 * - @/components/ui/StatusIndicator: Shared component for displaying status.
 * - @/components/ui/LoadingSpinner: Shared component for loading indication.
 * - @/components/ui/ErrorDisplay: Shared component for displaying errors.
 * - ./AccountSummary: Component to display account balance/margin info.
 * - ./PositionTable: Component to display open positions.
 * - ./PredictionFeed: Component to display Allora predictions.
 * - ./AlloraStatusIndicator: Component to display Allora API status.
 * - ./TradePanel: Component for staging trades.
 * - Placeholder components (TradeLog) to be replaced later.
 * - @/lib/constants: Provides default settings values.
 *
 * @notes
 * - Marked with `"use client"` directive.
 * - Takes initial data and error states as props from the parent Server Component (`DashboardPage`).
 * - Manages fetching and state for Hyperliquid account info and positions.
 * - Delegates display of account info and positions to respective components.
 * - Renders status indicators for both Allora and Hyperliquid APIs.
 * - Manages the selected prediction state and passes it to relevant components.
 */
"use client";

import React, { useState } from "react";
import type {
  HyperliquidAccountInfo,
  HyperliquidPosition,
  AlloraPrediction,
  TradeLogEntry,
  AppSettings,
} from "@/types";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  fetchHyperliquidAccountInfoAction,
  fetchHyperliquidPositionsAction, // Import action for positions
} from "@/actions/hyperliquid-actions";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import StatusIndicator, { StatusType } from "@/components/ui/StatusIndicator";
import AccountSummary from "./AccountSummary";
import PositionTable from "./PositionTable";
import PredictionFeed from "./PredictionFeed";
import AlloraStatusIndicator from "./AlloraStatusIndicator";
import TradePanel from "./TradePanel"; // Import the actual TradePanel component

// Placeholder components - TradeLog will be replaced later
const TradeLogPlaceholder = ({ initialLogs, initialError }: { initialLogs: TradeLogEntry[] | null, initialError: string | null }) => (
  <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[150px]">
    <h3 className="font-semibold mb-2">Trade Log</h3>
    {initialError && <p className="text-destructive text-sm">Error loading: {initialError}</p>}
    <pre className="text-xs overflow-auto">{JSON.stringify(initialLogs, null, 2)}</pre>
    <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 26)</p>
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
    refresh: refreshAccountInfo,
  } = usePeriodicFetcher(
    fetchHyperliquidAccountInfoAction,
    settings.accountRefreshInterval,
    initialAccountInfo
  );

  // Determine Hyperliquid API status based on Account Info fetch
  const getHyperliquidStatus = (): StatusType => {
    if (isLoadingAccountInfo) return 'connecting';
    if (accountInfoError) return 'error';
    if (accountInfo) return 'connected';
    return 'idle';
  };

  // Callback function for the PredictionFeed to update the selected prediction
  const handleSelectPrediction = (prediction: AlloraPrediction | null) => {
    console.log("Prediction selected in DashboardClientContent:", prediction);
    setSelectedPrediction(prediction);
  };

  // Use the initial error from props if the first client-side fetch hasn't happened yet
  const currentAccountInfoError = accountInfo === null ? initialAccountError : accountInfoError;
  const currentAccountInfo = accountInfo ?? initialAccountInfo; // Prefer fresh data, fallback to initial

  // Ensure consistent initial render
  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        {/* Status Indicators */}
        <div className="flex space-x-4">
          <AlloraStatusIndicator key="allora-status" />
          <StatusIndicator
            key="hyperliquid-status"
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
            key="account-summary"
            currentAccountInfo={currentAccountInfo}
            isLoading={isLoadingAccountInfo}
            error={currentAccountInfoError}
          />

          {/* Position Table Component */}
          <PositionTable
            key="position-table"
            initialPositions={initialPositions}
            initialError={initialPositionsError}
          />

          {/* Trade Log Display Component (Placeholder) */}
          <TradeLogPlaceholder
            key="trade-log"
            initialLogs={initialLogs}
            initialError={initialLogsError}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Prediction Feed Component */}
          <PredictionFeed
            key="prediction-feed"
            initialPredictions={initialPredictions}
            initialError={initialPredictionsError}
            onSelectPrediction={handleSelectPrediction}
          />

          {/* Trade Panel Component */}
          <TradePanel
            key="trade-panel"
            selectedPrediction={selectedPrediction}
          />
        </div>
      </div>
    </div>
  );

  return content;
}