/**
 * @description
 * Client component responsible for displaying the connection status of the Hyperliquid API.
 * It periodically attempts to fetch account info using `fetchHyperliquidAccountInfoAction`
 * and updates the status displayed by the `StatusIndicator` component based on
 * the success or failure of the fetch attempts.
 *
 * @dependencies
 * - react: For component structure and hooks (`useState`, `useEffect`, `useRef`).
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/hyperliquid-actions: Server Action to fetch Hyperliquid account info.
 * - @/components/ui/StatusIndicator: Reusable component to display status visually.
 * - @/lib/constants: Provides default settings values.
 * - @/types: Type definitions (AppSettings, HyperliquidAccountInfo, ActionState).
 *
 * @notes
 * - Fetches account info periodically based on the interval configured in settings.
 * - Maps the state (`isLoading`, `error`) from `usePeriodicFetcher` to the `StatusType`
 * required by `StatusIndicator` ('connecting', 'connected', 'error', 'idle').
 */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePeriodicFetcher } from '@/hooks/usePeriodicFetcher';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { fetchHyperliquidAccountInfoAction } from '@/actions/hyperliquid-actions';
import StatusIndicator, { StatusType } from '@/components/ui/StatusIndicator';
import { DEFAULT_APP_SETTINGS } from '@/lib/constants';
import type { AppSettings } from '@/types';

const HyperliquidStatusIndicator: React.FC = () => {
  // Get app settings from local storage, defaulting if not found
  const [settings] = useLocalStorage<AppSettings>(
    'alloraHyperliquidApp_settings',
    DEFAULT_APP_SETTINGS
  );

  // State to manage the derived status for the indicator
  const [indicatorStatus, setIndicatorStatus] = useState<StatusType>('idle');
  // Track if we've ever successfully loaded data
  const hasLoadedDataRef = useRef<boolean>(false);

  // Use the periodic fetcher hook to attempt fetching account info
  // We don't need the actual account data here, just the fetch status.
  const { isLoading, error, data } = usePeriodicFetcher(
    fetchHyperliquidAccountInfoAction, // The server action to call
    settings.accountRefreshInterval, // Interval from settings
    null // No initial data needed for status check
  );

  // Effect to update the indicator status based on fetcher state
  useEffect(() => {
    // Track if we've successfully loaded data
    if (data !== null) {
      hasLoadedDataRef.current = true;
    }

    // If we've successfully loaded data before and we're just refreshing,
    // show as connected unless there's an error
    if (hasLoadedDataRef.current) {
      if (error) {
        setIndicatorStatus('error');
      } else {
        // If we've successfully loaded data at least once, immediately show as connected
        // even if we're loading right now
        setIndicatorStatus('connected');
      }
      return;
    }

    // Standard status flow for initial load
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
      serviceName="Hyperliquid"
      className="text-xs" // Example: smaller text size
    />
  );
};

export default HyperliquidStatusIndicator; 