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
 * - @/actions/allora-actions: Server Action for fetching Allora predictions.
 * - @/components/ui/StatusIndicator: Shared component for displaying status.
 * - @/components/ui/LoadingSpinner: Shared component for loading indication.
 * - @/components/ui/ErrorDisplay: Shared component for displaying errors.
 * - ./AccountSummary: Component to display account balance/margin info.
 * - ./PositionTable: Component to display open positions.
 * - ./PredictionFeed: Component to display Allora predictions.
 * - ./AlloraStatusIndicator: Component to display Allora API status.
 * - ./HyperliquidStatusIndicator: Component to display Hyperliquid API status.
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

import React, { useState, useCallback, useRef } from "react";
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
  fetchHyperliquidPositionsAction,
} from "@/actions/hyperliquid-actions";
import { fetchAlloraPredictionsAction } from "@/actions/allora-actions";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import AccountSummary from "./AccountSummary";
import PositionTable from "./PositionTable";
import PredictionFeed from "./PredictionFeed";
import AlloraStatusIndicator from "./AlloraStatusIndicator";
import HyperliquidStatusIndicator from "./HyperliquidStatusIndicator";
import TradePanel from "./TradePanel";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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

  // Fetch positions data
  const {
    data: positions,
    isLoading: isLoadingPositions,
    error: positionsError,
    refresh: refreshPositions,
  } = usePeriodicFetcher(
    fetchHyperliquidPositionsAction,
    settings.accountRefreshInterval,
    initialPositions
  );

  // Fetch predictions data
  const {
    data: predictions,
    isLoading: isLoadingPredictions,
    error: predictionsError,
    refresh: refreshPredictions,
  } = usePeriodicFetcher(
    fetchAlloraPredictionsAction,
    settings.predictionRefreshInterval,
    initialPredictions
  );

  // Function to refresh all data
  const refreshAllData = useCallback(async () => {
    console.log('Manual refresh of all data triggered');

    try {
      // Set up refreshes to happen in parallel
      await Promise.all([
        refreshAccountInfo(),
        refreshPositions(),
        refreshPredictions(),
      ]);

      // Also refresh mark prices if we have positions
      if (positions && positions.length > 0) {
        const uniqueAssets = new Set<string>();
        positions.forEach(position => {
          try {
            // Extract asset name (assuming you have a getAssetName function somewhere)
            const assetName = position.position?.coin;
            if (assetName) {
              uniqueAssets.add(assetName);
            }
          } catch (e) {
            console.error("Error getting asset name:", e);
          }
        });

        // This will trigger re-fetching of prices in PositionTable's effect
        console.log('Refreshed mark prices for assets:', Array.from(uniqueAssets));
      }

      console.log('All data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      // If the refresh fails, refresh the page as a fallback
      window.location.reload();
    }
  }, [refreshAccountInfo, refreshPositions, refreshPredictions, positions]);

  // Callback function for the PredictionFeed to update the selected prediction
  const handleSelectPrediction = (prediction: AlloraPrediction | null) => {
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
        <div className="flex items-center space-x-4">
          <AlloraStatusIndicator key="allora-status" />
          <HyperliquidStatusIndicator key="hyperliquid-status" />
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
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