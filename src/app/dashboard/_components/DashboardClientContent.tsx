/**
 * @description
 * Client Component responsible for rendering the main content of the dashboard.
 * It receives initial data fetched on the server (passed as props) and manages
 * client-side state, periodic data fetching, and interactions between dashboard components.
 *
 * @dependencies
 * - React: For component structure, state (`useState`, `useEffect`), and refs.
 * - @/types: Type definitions for initial props and state.
 * - Placeholder components (to be replaced in later steps).
 *
 * @notes
 * - Marked with `"use client"` directive as it uses React hooks for state and effects.
 * - Takes initial data (account info, positions, predictions, logs) and error states as props from the parent Server Component (`DashboardPage`).
 * - Will use hooks like `usePeriodicFetcher` and `useLocalStorage` in later steps to handle dynamic updates and settings.
 * - Manages the state for the selected prediction.
 * - Renders placeholders for the main dashboard sections which will be implemented in subsequent steps.
 */
"use client";

import React, { useState } from "react";
import type {
  HyperliquidAccountInfo,
  HyperliquidPosition,
  AlloraPrediction,
  TradeLogEntry,
} from "@/types";

// Placeholder components - these will be imported properly in later steps
const AccountSummaryPlaceholder = ({ initialAccountInfo, initialError }: { initialAccountInfo: HyperliquidAccountInfo | null, initialError: string | null }) => (
    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[100px]">
        <h3 className="font-semibold mb-2">Account Summary</h3>
        {initialError && <p className="text-destructive text-sm">Error loading: {initialError}</p>}
        <pre className="text-xs overflow-auto">{JSON.stringify(initialAccountInfo, null, 2)}</pre>
        <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 17)</p>
    </div>
);
const PositionTablePlaceholder = ({ initialPositions, initialError }: { initialPositions: HyperliquidPosition[] | null, initialError: string | null }) => (
    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[150px]">
        <h3 className="font-semibold mb-2">Open Positions</h3>
        {initialError && <p className="text-destructive text-sm">Error loading: {initialError}</p>}
        <pre className="text-xs overflow-auto">{JSON.stringify(initialPositions, null, 2)}</pre>
        <p className="text-muted-foreground text-sm mt-2">(Placeholder - Full component in Step 18)</p>
    </div>
);
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
  // State to hold the currently selected prediction for trading
  const [selectedPrediction, setSelectedPrediction] =
    useState<AlloraPrediction | null>(null);

  // Callback function for the PredictionFeed to update the selected prediction
  const handleSelectPrediction = (prediction: AlloraPrediction | null) => {
    console.log("Prediction selected:", prediction);
    setSelectedPrediction(prediction);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

      {/* Grid layout for dashboard sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Summary Component (Placeholder) */}
          <AccountSummaryPlaceholder
            initialAccountInfo={initialAccountInfo}
            initialError={initialAccountError}
          />

          {/* Position Table Component (Placeholder) */}
          <PositionTablePlaceholder
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