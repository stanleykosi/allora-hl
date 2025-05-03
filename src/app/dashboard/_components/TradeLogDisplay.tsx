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

import React, { useState, useCallback } from "react";
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

const TradeLogDisplay: React.FC<TradeLogDisplayProps> = ({
  initialLogEntries,
  initialError,
}) => {
  // Use a long interval or null to primarily rely on manual refresh for logs
  // Logs only change when trades happen, so frequent polling isn't essential.
  const LOG_REFRESH_INTERVAL = null; // Set to null to disable periodic fetching, rely on manual refresh

  // State for manual refresh loading indicator
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Fetch logs using the hook
  const {
    data: logs,
    isLoading: isPeriodicLoading, // Loading state from the hook (covers initial load)
    error,
    refresh,
  } = usePeriodicFetcher(
    fetchTradeLogAction, // Action to fetch logs
    LOG_REFRESH_INTERVAL, // Interval (null disables periodic)
    initialLogEntries, // Initial data
  );

  // Combine loading states: true if either periodic or manual refresh is happening
  const isLoading = isPeriodicLoading || isManualLoading;

  // Use the initial error from props if the first client-side fetch hasn't happened yet or if fetcher has no error yet
  const currentError = logs === null && !isLoading ? initialError : error;
  // Prefer fresh data from the fetcher, fallback to initial data if fetcher hasn't populated yet
  const currentLogs = logs ?? initialLogEntries;

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsManualLoading(true);
    await refresh();
    setIsManualLoading(false);
  }, [refresh]);

  const renderTableContent = () => {
    // Prioritize showing loading state
    if (isLoading && (!currentLogs || currentLogs.length === 0)) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-40 text-center">
            <LoadingSpinner />
          </TableCell>
        </TableRow>
      );
    }

    // Show error if it occurred and we have no data
    if (currentError && (!currentLogs || currentLogs.length === 0)) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-24 text-center">
            <ErrorDisplay error={currentError} />
          </TableCell>
        </TableRow>
      );
    }

    // Show empty state if no logs and no error/loading
    if (!currentLogs || currentLogs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
            No trade logs found. Trades executed via this app will appear here.
          </TableCell>
        </TableRow>
      );
    }

    // Display log entries
    return currentLogs.map((log) => (
      <TableRow key={log.id}>
        <TableCell className="text-xs">
          {formatDateTime(log.timestamp)}
        </TableCell>
        <TableCell>{log.symbol}</TableCell>
        <TableCell>
          <span
            className={clsx({
              "text-green-600": log.direction.toLowerCase() === "long",
              "text-red-600": log.direction.toLowerCase() === "short",
            })}
          >
            {log.direction.toUpperCase()}
          </span>
        </TableCell>
        <TableCell className="text-right">{formatNumber(log.size, 6)}</TableCell>
        <TableCell className="text-right">
          {log.status === 'filled' || log.status === 'partially_filled' ? formatCurrency(log.entryPrice) : 'N/A'}
        </TableCell>
        <TableCell>
          <span
            className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", {
              "bg-green-100 text-green-800": log.status === "filled",
              "bg-yellow-100 text-yellow-800": log.status === "resting_ioc" || log.status === "partially_filled",
              "bg-red-100 text-red-800": log.status === "failed",
              "bg-gray-100 text-gray-800": log.status !== "filled" && log.status !== "failed" && log.status !== "resting_ioc" && log.status !== "partially_filled", // Fallback for other statuses
            })}
          >
            {log.status}
          </span>
        </TableCell>
        <TableCell className="text-xs font-mono">
          {log.hyperliquidOrderId || "N/A"}
        </TableCell>
        <TableCell className="text-xs text-destructive max-w-[150px] truncate" title={log.errorMessage ?? ''}>
          {log.errorMessage || "None"}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Trade Log</CardTitle>
          <CardDescription>
            History of trades executed through this application.
            {currentError && currentLogs && (
                <span className="text-red-600 ml-2">(Error loading updates)</span>
            )}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={clsx("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh Logs
        </Button>
      </CardHeader>
      <CardContent>
        <div className="min-h-[200px]">
          <Table>
            <TableHeader>
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
      </CardContent>
    </Card>
  );
};

export default TradeLogDisplay;