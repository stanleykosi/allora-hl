/**
 * @description
 * Client Component responsible for rendering the main content of the dashboard.
 * It receives initial data fetched on the server (passed as props) and manages
 * client-side state, periodic data fetching, interactions between dashboard components,
 * and the contradictory prediction alert logic.
 *
 * Key features:
 * - Manages periodic fetching of Hyperliquid account info and positions.
 * - Displays API connection statuses using StatusIndicator.
 * - Renders AccountSummary, PositionTable, PredictionFeed, TradePanel, and TradeLog.
 * - Manages shared state like the selected prediction.
 * - Implements logic to compare predictions against open positions and trigger alerts based on user settings.
 * - Passes alert status down to the PositionTable.
 *
 * @dependencies
 * - react: For component structure, state (`useState`), effects (`useEffect`), and refs (`useRef`).
 * - @/types: Type definitions for initial props and state.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/*: Server Actions for fetching data.
 * - @/components/ui/*: Various UI components (StatusIndicator, Button, etc.).
 * - ./AccountSummary: Component to display account balance/margin info.
 * - ./PositionTable: Component to display open positions (now receives alertStatusMap).
 * - ./PredictionFeed: Component to display Allora predictions.
 * - ./AlloraStatusIndicator: Component to display Allora API status.
 * - ./HyperliquidStatusIndicator: Component to display Hyperliquid API status.
 * - ./TradePanel: Component for staging trades.
 * - ./TradeLogDisplay: Component for displaying trade history.
 * - @/lib/constants: Provides default settings values.
 *
 * @notes
 * - Marked with `"use client"` directive.
 * - Takes initial data and error states as props from the parent Server Component (`DashboardPage`).
 * - Manages fetching and state for Hyperliquid account info and positions.
 * - The alert logic currently uses a simple threshold (1% difference in the opposite direction) and checks against the latest 8hr prediction. This logic can be refined.
 */
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { fetchTradeLogAction } from "@/actions/log-actions"; // Import fetchTradeLogAction
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import AccountSummary from "./AccountSummary";
import PositionTable from "./PositionTable";
import PredictionFeed from "./PredictionFeed";
import AlloraStatusIndicator from "./AlloraStatusIndicator";
import HyperliquidStatusIndicator from "./HyperliquidStatusIndicator";
import TradePanel from "./TradePanel";
import TradeLogDisplay, { TradeLogDisplayRef } from "./TradeLogDisplay"; // Import ref type
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
  initialLogs: TradeLogEntry[] | null; // Add initial logs prop
  initialLogsError: string | null; // Add initial logs error prop
}

/**
 * Renders the main dashboard layout and manages client-side state and interactions.
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
  initialLogs, // Destructure initialLogs
  initialLogsError, // Destructure initialLogsError
}: DashboardClientContentProps): React.ReactElement {
  // Get app settings from local storage
  const [settings] = useLocalStorage<AppSettings>(
    'alloraHyperliquidApp_settings',
    DEFAULT_APP_SETTINGS
  );

  // State for selected prediction
  const [selectedPrediction, setSelectedPrediction] =
    useState<AlloraPrediction | null>(null);

  // State for manual refresh button
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Ref for TradeLogDisplay component to trigger refresh
  const tradeLogRef = useRef<TradeLogDisplayRef>(null);

  // State for contradictory prediction alerts
  const [alertStatusMap, setAlertStatusMap] = useState<Record<string, boolean>>({});

  // --- Data Fetching Hooks ---
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

  // Combine initial and fetched data
  const currentAccountInfo = accountInfo ?? initialAccountInfo;
  const currentPositions = positions ?? initialPositions;
  const currentPredictions = predictions ?? initialPredictions;
  const currentAccountInfoError = accountInfo === null ? initialAccountError : accountInfoError;
  const currentPositionsError = positions === null ? initialPositionsError : positionsError;
  const currentPredictionsError = predictions === null ? initialPredictionsError : predictionsError;

  // --- Alert Logic ---
  useEffect(() => {
    // Only run alert logic if alerts are enabled in settings
    if (!settings.alertsEnabled || !currentPositions || !currentPredictions) {
      setAlertStatusMap({}); // Clear alerts if disabled or data missing
      return;
    }

    console.log("Checking for contradictory predictions...");
    const newAlertStatusMap: Record<string, boolean> = {};
    const alertThresholdPercent = 0.01; // Example: 1% threshold

    const openPositions = currentPositions.filter(p => p?.position?.szi && parseFloat(p.position.szi) !== 0);
    const latestPredictions = currentPredictions // Sort by timestamp descending
        .sort((a, b) => b.timestamp - a.timestamp);

    openPositions.forEach(pos => {
        const assetName = pos.position?.coin;
        const entryPrice = parseFloat(pos.position?.entryPx || "0");
        const positionSize = parseFloat(pos.position?.szi || "0");

        if (!assetName || isNaN(entryPrice) || isNaN(positionSize) || positionSize === 0) {
            console.warn("Skipping position due to invalid data:", pos);
            return; // Skip if essential data is missing
        }

        const isLong = positionSize > 0;

        // Find the latest relevant prediction (e.g., 8hr) for this asset
        // Assumption: We only care about BTC for now. Extend if needed.
        const relevantPrediction = latestPredictions.find(pred => pred.timeframe === '8h'); // Hardcoded 8hr for now

        if (relevantPrediction) {
            const predictionPrice = relevantPrediction.price;
            let isContradictory = false;

            if (isLong) {
                // Long position contradicts if prediction is significantly lower
                const lowerBound = entryPrice * (1 - alertThresholdPercent);
                if (predictionPrice < lowerBound) {
                    isContradictory = true;
                    console.log(`Alert: LONG ${assetName} (Entry: ${entryPrice}) contradicts 8h prediction (${predictionPrice})`);
                }
            } else { // Short position
                // Short position contradicts if prediction is significantly higher
                const upperBound = entryPrice * (1 + alertThresholdPercent);
                if (predictionPrice > upperBound) {
                    isContradictory = true;
                     console.log(`Alert: SHORT ${assetName} (Entry: ${entryPrice}) contradicts 8h prediction (${predictionPrice})`);
                }
            }
            newAlertStatusMap[assetName] = isContradictory;
        } else {
             console.log(`No relevant 8h prediction found for ${assetName} to check alert status.`);
        }
    });

    // Update the state only if the map has changed
    if (JSON.stringify(newAlertStatusMap) !== JSON.stringify(alertStatusMap)) {
        console.log("Updating alert status map:", newAlertStatusMap);
        setAlertStatusMap(newAlertStatusMap);
    }

  }, [currentPredictions, currentPositions, settings.alertsEnabled, alertStatusMap]); // Rerun when data or setting changes


  // --- Callbacks ---
  const refreshAllData = useCallback(async () => {
    if (isManualRefreshing) return; // Prevent multiple clicks

    console.log('Manual refresh triggered.');
    setIsManualRefreshing(true);
    try {
      await Promise.allSettled([
        refreshAccountInfo(),
        refreshPositions(),
        refreshPredictions(),
        tradeLogRef.current?.refresh(), // Refresh logs via ref
      ]);
      console.log('Manual refresh complete.');
    } catch (error) {
      console.error('Error during manual refresh:', error);
      // Consider adding a toast notification on error
    } finally {
      // Add a small delay before resetting to prevent state race conditions
      setTimeout(() => setIsManualRefreshing(false), 300);
    }
  }, [isManualRefreshing, refreshAccountInfo, refreshPositions, refreshPredictions]); // Dependencies

  const handleSelectPrediction = (prediction: AlloraPrediction | null) => {
    setSelectedPrediction(prediction);
  };

  // --- Render Logic ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex items-center space-x-4">
          <AlloraStatusIndicator key="allora-status" />
          <HyperliquidStatusIndicator key="hyperliquid-status" />
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllData}
            disabled={isManualRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            {isManualRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <AccountSummary
            key="account-summary"
            currentAccountInfo={currentAccountInfo}
            isLoading={isLoadingAccountInfo}
            error={currentAccountInfoError}
          />
          <PositionTable
            key="position-table"
            initialPositions={initialPositions} // Pass initial for first render
            initialError={initialPositionsError}
            alertStatusMap={alertStatusMap} // Pass down the alert status
          />
          <TradeLogDisplay
            key="trade-log"
            initialLogEntries={initialLogs}
            initialError={initialLogsError}
            ref={tradeLogRef} // Assign ref
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PredictionFeed
            key="prediction-feed"
            initialPredictions={initialPredictions} // Pass initial for first render
            initialError={initialPredictionsError}
            onSelectPrediction={handleSelectPrediction}
          />
          <TradePanel
            key="trade-panel"
            selectedPrediction={selectedPrediction}
          />
        </div>
      </div>
    </div>
  );
}