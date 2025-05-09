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
import type { TradeLogEntry, AppSettings } from "@/types";
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
  // Use a long interval or null to primarily rely on manual refresh for logs
  // Logs only change when trades happen, so frequent polling isn't essential.
  const LOG_REFRESH_INTERVAL = null; // Set to null to disable periodic fetching, rely on manual refresh

  // State for manual refresh loading indicator
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Add state to track last update time for debugging
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');

  // Create a custom fetcher function that includes timestamp to avoid caching
  const customFetcher = useCallback(async () => {
    return fetchTradeLogAction(100, Date.now());
  }, []);

  // Fetch logs using the hook with the customFetcher
  const {
    data: logs,
    isLoading: isPeriodicLoading, // Loading state from the hook (covers initial load)
    error,
    refresh,
  } = usePeriodicFetcher(
    customFetcher, // Use our custom fetcher that includes a timestamp
    LOG_REFRESH_INTERVAL, // Interval (null disables periodic)
    initialLogEntries, // Initial data
  );

  // Combine loading states: true if either periodic or manual refresh is happening
  const isLoading = isPeriodicLoading || isManualLoading;

  // Fix error handling - don't show error if we have logs or are loading
  const currentError = (!isLoading && ((logs && logs.length === 0) || logs === null)) ? error : null;

  // Prefer fresh data from the fetcher, fallback to initial data if fetcher hasn't populated yet
  const currentLogs = logs ?? initialLogEntries;

  // Enhanced refresh function with better error handling
  const performRefresh = useCallback(async () => {
    if (isManualLoading) return; // Prevent multiple clicks

    setIsManualLoading(true);

    try {
      const now = new Date();
      console.log(`Starting trade log refresh at ${now.toISOString()}...`);
      console.log(`Current browser time: ${now.toString()}`);

      // Force cache invalidation by passing a timestamp parameter
      // This ensures we're not getting cached results from previous requests
      const fetchResult = await fetchTradeLogAction(100, Date.now());

      // Log the results to help debug
      if (fetchResult.isSuccess && fetchResult.data) {
        console.log(`Fetched ${fetchResult.data.length} trade logs, newest timestamp:`,
          fetchResult.data.length > 0 ? new Date(fetchResult.data[0].timestamp).toISOString() : 'No logs');

        // Log the first few entries to see their timestamps
        const recentLogs = fetchResult.data.slice(0, 5);
        console.log('Most recent logs:', recentLogs.map(log => ({
          timestamp: new Date(log.timestamp).toISOString(),
          symbol: log.symbol,
          direction: log.direction,
          status: log.status
        })));
      } else {
        console.error('Error fetching trade logs:', fetchResult.message);
      }

      console.log('Trade log refresh completed successfully');

      // Update last refresh time
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error during trade log refresh:', error);
    } finally {
      setIsManualLoading(false);
    }
  }, [refresh, isManualLoading]);

  // Expose the refresh method via ref with better implementation
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      try {
        console.log('External refresh request received');
        await performRefresh();
        console.log('External refresh completed');
        return Promise.resolve();
      } catch (error) {
        console.error('Error in external refresh:', error);
        return Promise.resolve();
      }
    }
  }), [performRefresh]);

  // Add effect to log when data changes
  useEffect(() => {
    if (logs) {
      console.log(`Logs updated, count: ${logs.length}`);
    }
  }, [logs]);

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