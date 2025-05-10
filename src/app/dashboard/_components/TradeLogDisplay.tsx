/**
 * @description
 * Client Component: Displays a table of recent trade log entries fetched from the database.
 * Handles periodic fetching (or manual refresh) and displays loading, error, and empty states.
 *
 * Key features:
 * - Fetches trade logs using `usePeriodicFetcher` and `WorkspaceTradeLogAction`.
 * - Displays log entries in a Shadcn `Table`.
 * - Includes columns for Timestamp, Symbol, Direction, Size, Entry Price, Status, Order ID, and Error Message.
 * - Formats data using `lib/formatting`.
 * - Provides a manual refresh button.
 * - Handles loading, error, and empty states gracefully.
 *
 * @dependencies
 * - react: For component structure and hooks (useState, useCallback).
 * - @/types: Provides TradeLogEntry, AppSettings type definitions.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings (not strictly needed here, but consistent pattern).
 * - @/actions/log-actions: Server Action for fetching trade logs (`WorkspaceTradeLogAction`).
 * - @/lib/formatting: Utility functions for formatting dates and numbers.
 * - @/lib/constants: Provides default settings values.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/table: Shadcn Table components for data display.
 * - @/components/ui/LoadingSpinner: Component to display loading state.
 * - @/components/ui/ErrorDisplay: Component to display error messages.
 * - @/components/ui/button: Shadcn Button component for refresh.
 * - lucide-react: For the RefreshCw icon.
 * - clsx: Utility for conditional class names.
 *
 * @notes
 * - Receives initial data via props from the parent server component.
 * - Manages its own data fetching cycle after the initial load.
 * - Uses a manual refresh button as logs typically only change when a trade occurs.
 * Periodic fetching might be less necessary compared to price/balance data.
 */
"use client";

import React, { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import type { TradeLogEntry, AppSettings, ActionState } from "@/types";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchTradeLogAction } from "@/actions/log-actions";
import { formatDateTime, formatNumber, formatCurrency } from "@/lib/formatting";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";

/**
 * Props for the TradeLogDisplay component.
 * @property {TradeLogEntry[] | null} initialLogEntries - The initial log data fetched server-side.
 * @property {string | null} initialError - An error message if the initial fetch failed.
 */
interface TradeLogDisplayProps {
  initialLogEntries: TradeLogEntry[] | null;
  initialError: string | null;
}

/**
 * Interface for the methods exposed by the component ref
 */
export interface TradeLogDisplayRef {
  refresh: () => Promise<void>;
}

const TradeLogDisplay = forwardRef<TradeLogDisplayRef, TradeLogDisplayProps>(({
  initialLogEntries,
  initialError,
}, ref) => {
  // Use a longer interval for periodic fetching
  const LOG_REFRESH_INTERVAL = 30000; // Set to 30 seconds to reduce server load

  // State for manual refresh loading indicator
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create a custom fetcher function that includes timestamp to avoid caching
  const customFetcher = useCallback(async () => {
    if (isRefreshing) {
      console.log('[TradeLogDisplay] Skipping fetch - already in progress');
      return {
        isSuccess: true,
        message: "Skipped refresh - already in progress",
        data: null
      } as ActionState<TradeLogEntry[] | null>;
    }

    console.log('[TradeLogDisplay] Fetching trade logs...');
    setIsRefreshing(true);

    try {
      const result = await fetchTradeLogAction(100, Date.now());
      console.log('[TradeLogDisplay] Fetch result:', {
        success: result.isSuccess,
        count: result.data?.length || 0,
        error: result.error
      });
      return result;
    } catch (error) {
      console.error('[TradeLogDisplay] Error in customFetcher:', error);
      return {
        isSuccess: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
        error: error instanceof Error ? error.message : "An unknown error occurred"
      } as ActionState<TradeLogEntry[] | null>;
    } finally {
      setIsRefreshing(false);
      console.log('[TradeLogDisplay] Fetch completed, refreshing state reset');
    }
  }, [isRefreshing]);

  // Fetch logs using the hook with the customFetcher
  const {
    data: logs,
    isLoading: isPeriodicLoading,
    error,
    refresh,
  } = usePeriodicFetcher(
    customFetcher,
    LOG_REFRESH_INTERVAL,
    initialLogEntries,
  );

  // Combine loading states
  const isLoading = isPeriodicLoading || isManualLoading || isRefreshing;

  // Fix error handling - don't show error if we have logs or are loading
  const currentError = (!isLoading && ((logs && logs.length === 0) || logs === null)) ? error : null;

  // Prefer fresh data from the fetcher, fallback to initial data if fetcher hasn't populated yet
  const currentLogs = logs ?? initialLogEntries;

  // Enhanced refresh function with better error handling and debouncing
  const performRefresh = useCallback(async () => {
    if (isManualLoading || isRefreshing) {
      console.log('[TradeLogDisplay] Skipping refresh - already in progress');
      return;
    }

    setIsManualLoading(true);
    console.log('[TradeLogDisplay] Starting manual refresh...');

    try {
      const now = new Date();
      console.log(`[TradeLogDisplay] Refresh started at ${now.toISOString()}`);

      // Force cache invalidation by passing a timestamp parameter
      const fetchResult = await fetchTradeLogAction(100, Date.now());

      // Log the results to help debug
      if (fetchResult.isSuccess && fetchResult.data) {
        console.log(`[TradeLogDisplay] Fetched ${fetchResult.data.length} trade logs`);
        if (fetchResult.data.length > 0) {
          console.log('[TradeLogDisplay] Most recent log:', {
            timestamp: new Date(fetchResult.data[0].timestamp).toISOString(),
            symbol: fetchResult.data[0].symbol,
            direction: fetchResult.data[0].direction,
            status: fetchResult.data[0].status
          });
        }
      } else {
        console.error('[TradeLogDisplay] Error fetching trade logs:', fetchResult.message);
      }

      // Update last refresh time
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('[TradeLogDisplay] Error during refresh:', error);
    } finally {
      // Always reset the loading state, even if there's an error
      setIsManualLoading(false);
      console.log('[TradeLogDisplay] Refresh completed, loading state reset');
    }
  }, [isManualLoading, isRefreshing]);

  // Expose the refresh method via ref with better implementation
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      try {
        console.log('[TradeLogDisplay] External refresh requested');
        await performRefresh();
        console.log('[TradeLogDisplay] External refresh completed');
        return Promise.resolve();
      } catch (error) {
        console.error('[TradeLogDisplay] Error in external refresh:', error);
        // Ensure loading state is reset even if there's an error
        setIsManualLoading(false);
        return Promise.resolve();
      }
    }
  }), [performRefresh]);

  // Add effect to log when data changes
  useEffect(() => {
    if (logs) {
      console.log(`[TradeLogDisplay] Logs updated, count: ${logs.length}`);
      if (logs.length > 0) {
        console.log('[TradeLogDisplay] Most recent log:', {
          timestamp: new Date(logs[0].timestamp).toISOString(),
          symbol: logs[0].symbol,
          direction: logs[0].direction,
          status: logs[0].status
        });
      }
      // Reset loading states when new data arrives
      setIsManualLoading(false);
      setIsRefreshing(false);
    }
  }, [logs]);

  // Add effect to refresh logs when the component mounts
  useEffect(() => {
    console.log('[TradeLogDisplay] Component mounted, performing initial refresh');
    performRefresh();
  }, [performRefresh]);

  const renderTableContent = () => {
    // Prioritize showing loading state
    if (isLoading && (!currentLogs || currentLogs.length === 0)) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-32 text-center">
            <div className="flex justify-center items-center">
              <LoadingSpinner />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // Show error if it occurred and we have no data
    if (currentError && (!currentLogs || currentLogs.length === 0)) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-32 text-center">
            <div className="flex justify-center items-center">
              <ErrorDisplay error={currentError} />
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // Show empty state if no logs and no error/loading
    if (!currentLogs || currentLogs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-32 text-center">
            <div className="flex justify-center items-center text-muted-foreground">
              No trade logs found. Trades executed via this app will appear here.
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // Display log entries
    return currentLogs.map((log) => (
      <TableRow key={log.id}>
        <TableCell className="text-xs whitespace-nowrap">
          {formatDateTime(log.timestamp)}
        </TableCell>
        <TableCell className="font-medium">{log.symbol}</TableCell>
        <TableCell>
          <span
            className={clsx("font-medium", {
              "text-green-600": log.direction.toLowerCase() === "long",
              "text-red-600": log.direction.toLowerCase() === "short",
            })}
          >
            {log.direction.toUpperCase()}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono text-sm">{formatNumber(log.size, 6)}</TableCell>
        <TableCell className="text-right font-mono text-sm">
          {log.status === 'filled' || log.status === 'partially_filled' ? formatCurrency(log.entryPrice) : 'N/A'}
        </TableCell>
        <TableCell>
          <span
            className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", {
              "bg-green-100 text-green-800": log.status === "filled",
              "bg-yellow-100 text-yellow-800": log.status === "resting_ioc" || log.status === "partially_filled",
              "bg-red-100 text-red-800": log.status === "failed",
              "bg-gray-100 text-gray-800": log.status !== "filled" && log.status !== "failed" && log.status !== "resting_ioc" && log.status !== "partially_filled",
            })}
          >
            {log.status}
          </span>
        </TableCell>
        <TableCell className="text-xs font-mono truncate max-w-[120px]" title={log.hyperliquidOrderId || "N/A"}>
          {log.hyperliquidOrderId || "N/A"}
        </TableCell>
        <TableCell className="text-xs text-destructive truncate max-w-[120px]" title={log.errorMessage ?? ''}>
          {log.errorMessage || "None"}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Trade Log</CardTitle>
          <CardDescription>
            History of trades executed through this application.
            {currentError && (
              <span className="text-red-600 ml-2">(Error loading updates)</span>
            )}
            {lastRefreshTime && !isLoading && (
              <span className="text-xs ml-2 text-muted-foreground">(Last refreshed: {lastRefreshTime})</span>
            )}
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={performRefresh}
          disabled={isManualLoading}
        >
          <RefreshCw className={clsx("h-4 w-4 mr-2", isManualLoading && "animate-spin")} />
          {isManualLoading ? 'Refreshing...' : 'Refresh Logs'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border rounded-md">
          <div className="overflow-auto max-h-[300px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background border-b z-10">
                <TableRow>
                  <TableHead className="w-[150px]">Timestamp</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Entry Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead className="w-[150px]">Error Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableContent()}</TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default TradeLogDisplay;