/**
 * @description
 * Client component responsible for displaying the connection status of the Allora API.
 * It periodically attempts to fetch predictions using `fetchAlloraPredictionsAction`
 * and updates the status displayed by the `StatusIndicator` component based on
 * the success or failure of the fetch attempts.
 *
 * @dependencies
 * - react: For component structure and hooks (`useState`, `useEffect`).
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/allora-actions: Server Action to fetch Allora predictions.
 * - @/components/ui/StatusIndicator: Reusable component to display status visually.
 * - @/lib/constants: Provides default settings values.
 * - @/types: Type definitions (AppSettings, AlloraPrediction, ActionState).
 *
 * @notes
 * - Fetches predictions periodically based on the interval configured in settings.
 * - Maps the state (`isLoading`, `error`) from `usePeriodicFetcher` to the `StatusType`
 * required by `StatusIndicator` ('connecting', 'connected', 'error', 'idle').
 */
"use client";

import React, { useState, useEffect } from 'react';
import { usePeriodicFetcher } from '@/hooks/usePeriodicFetcher';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { fetchAlloraPredictionsAction } from '@/actions/allora-actions';
import StatusIndicator, { StatusType } from '@/components/ui/StatusIndicator';
import { DEFAULT_APP_SETTINGS } from '@/lib/constants';
import type { AppSettings } from '@/types';

const AlloraStatusIndicator: React.FC = () => {
  // Get app settings from local storage, defaulting if not found
  const [settings] = useLocalStorage<AppSettings>(
    'alloraHyperliquidApp_settings',
    DEFAULT_APP_SETTINGS
  );

  // State to manage the derived status for the indicator
  const [indicatorStatus, setIndicatorStatus] = useState<StatusType>('idle');

  // Use the periodic fetcher hook to attempt fetching predictions
  // We don't need the actual prediction data here, just the fetch status.
  const { isLoading, error, data } = usePeriodicFetcher(
    fetchAlloraPredictionsAction, // The server action to call
    settings.predictionRefreshInterval, // Interval from settings
    null // No initial data needed for status check
  );

  // Effect to update the indicator status based on fetcher state
  useEffect(() => {
    if (isLoading) {
      setIndicatorStatus('connecting');
    } else if (error) {
      // Keep showing error state until a successful fetch occurs
      setIndicatorStatus('error');
    } else if (data !== null) {
      // Set to connected only if fetch was successful (data is not null and no error)
      setIndicatorStatus('connected');
    } else {
      // Fallback to idle if no data, not loading, and no error (e.g., initial state)
      setIndicatorStatus('idle');
    }
  }, [isLoading, error, data]);

  return (
    <StatusIndicator
      status={indicatorStatus}
      serviceName="Allora"
      className="text-xs" // Example: smaller text size
    />
  );
};

export default AlloraStatusIndicator;