/**
 * @description
 * Client Component responsible for displaying a feed of Allora price predictions.
 * It fetches predictions periodically, handles loading/error states, and allows
 * the user to select a prediction for further action (e.g., staging a trade).
 *
 * Key features:
 * - Displays predictions including timeframe, predicted price, and timestamp.
 * - Periodically fetches new predictions using `usePeriodicFetcher` and `fetchAlloraPredictionsAction`.
 * - Uses `useLocalStorage` to get the refresh interval from settings.
 * - Handles loading, error, and empty states.
 * - Allows selecting a prediction via click, highlighting the selected item.
 * - Calls the `onSelectPrediction` prop when a prediction is selected or deselected.
 *
 * @dependencies
 * - react: For component structure, state (`useState`), and effects (`useEffect`).
 * - @/types: Provides AlloraPrediction, AppSettings type definitions.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/allora-actions: Server Action for fetching Allora predictions.
 * - @/lib/formatting: Utility functions for formatting numbers and dates.
 * - @/lib/constants: Provides default settings values.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/LoadingSpinner: Component to display loading state.
 * - @/components/ui/ErrorDisplay: Component to display error messages.
 * - @/components/ui/badge: Shadcn Badge component for displaying timeframes.
 * - clsx: Utility for conditional class names.
 * - lucide-react: Provides icons (e.g., CalendarClock).
 *
 * @notes
 * - This component manages its own data fetching cycle after receiving initial data via props.
 * - The actual selection state (`selectedPredictionId`) is managed locally, but the
 * parent component is notified via `onSelectPrediction`.
 */
"use client";

import React, { useState } from "react";
import type { AlloraPrediction, AppSettings } from "@/types";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchAlloraPredictionsAction } from "@/actions/allora-actions";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import clsx from "clsx";
import { CalendarClock, Target } from "lucide-react";

/**
 * Props for the PredictionFeed component.
 * @property {AlloraPrediction[] | null} initialPredictions - The initial prediction data fetched server-side.
 * @property {string | null} initialError - An error message if the initial fetch failed.
 * @property {(prediction: AlloraPrediction | null) => void} onSelectPrediction - Callback function to notify the parent when a prediction is selected or deselected.
 */
interface PredictionFeedProps {
  initialPredictions: AlloraPrediction[] | null;
  initialError: string | null;
  onSelectPrediction: (prediction: AlloraPrediction | null) => void;
}

/**
 * Renders a feed of Allora predictions, allowing selection.
 * @param {PredictionFeedProps} props - Component props.
 * @returns {React.ReactElement} The rendered prediction feed component.
 */
const PredictionFeed: React.FC<PredictionFeedProps> = ({
  initialPredictions,
  initialError,
  onSelectPrediction,
}): React.ReactElement => {
  // Get app settings from local storage for refresh interval
  const [settings] = useLocalStorage<AppSettings>(
    "alloraHyperliquidApp_settings",
    DEFAULT_APP_SETTINGS,
  );

  // Fetch predictions periodically using the custom hook
  const {
    data: predictions,
    isLoading,
    error,
    refresh, // Function to manually trigger refresh if needed
  } = usePeriodicFetcher(
    fetchAlloraPredictionsAction,
    settings.predictionRefreshInterval, // Use the prediction refresh interval from settings
    initialPredictions, // Use initial data from server
  );

  // State to track the ID of the selected prediction
  // Using topicId + timestamp as a reasonably unique identifier for selection
  const [selectedPredictionKey, setSelectedPredictionKey] = useState<
    string | null
  >(null);

  // Use the initial error from props if the first client-side fetch hasn't happened yet or if fetcher has no error yet
  const currentError = predictions === null && !isLoading ? initialError : error;
  // Prefer fresh data from the fetcher, fallback to initial data if fetcher hasn't populated yet
  // Sort predictions by timestamp descending (most recent first)
  const currentPredictions = (predictions ?? initialPredictions ?? []).sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  // Handler for clicking on a prediction card
  const handlePredictionClick = (prediction: AlloraPrediction) => {
    const predictionKey = `${prediction.topicId}-${prediction.timestamp}`;
    if (selectedPredictionKey === predictionKey) {
      // If already selected, deselect it
      setSelectedPredictionKey(null);
      onSelectPrediction(null);
    } else {
      // Otherwise, select the new prediction
      setSelectedPredictionKey(predictionKey);
      onSelectPrediction(prediction);
    }
  };

  const renderContent = () => {
    if (isLoading && !currentPredictions.length) {
      // Show loading spinner only if there's no stale data
      return (
        <div className="flex justify-center items-center h-40">
          <LoadingSpinner />
        </div>
      );
    }

    if (currentError && !currentPredictions.length) {
      // Show error only if there's no stale data
      return <ErrorDisplay error={currentError} />;
    }

    if (!currentPredictions || currentPredictions.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-10">
          No predictions available.
        </p>
      );
    }

    // Display predictions
    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {currentPredictions.map((prediction) => {
          const predictionKey = `${prediction.topicId}-${prediction.timestamp}`;
          const isSelected = selectedPredictionKey === predictionKey;

          return (
            <Card
              key={predictionKey}
              className={clsx(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? "border-primary ring-2 ring-primary ring-offset-2"
                  : "border-border",
              )}
              onClick={() => handlePredictionClick(prediction)}
            >
              <CardContent className="p-3 text-sm">
                <div className="flex justify-between items-center mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {prediction.timeframe} Target
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock size={12} />
                    {formatDateTime(prediction.timestamp, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-primary" />
                  <span className="font-semibold text-base">
                    {formatCurrency(prediction.price, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {/* Optional: Display confidence interval if needed */}
                {/* {prediction.confidenceIntervalValues && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {formatCurrency(prediction.confidenceIntervalValues[0])} - {formatCurrency(prediction.confidenceIntervalValues[1])}
                  </p>
                )} */}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allora Predictions (BTC)</CardTitle>
        <CardDescription>
          Latest price predictions fetched from the Allora network. Click to
          select.
          {error && currentPredictions.length > 0 && (
            <>
              {currentPredictions[0]?.timestamp && new Date().getTime() - new Date(currentPredictions[0].timestamp).getTime() > 60000 && (
                <span className="text-red-600 ml-2">(Stale data due to error)</span>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
      {/* Optional Footer for filtering/sorting controls later */}
      {/* <CardFooter>
        <p>Filters Placeholder</p>
      </CardFooter> */}
    </Card>
  );
};

export default PredictionFeed;