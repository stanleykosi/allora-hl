/**
 * @description
 * Client Component responsible for displaying the user's open Hyperliquid positions in a table.
 * It fetches position data periodically and handles loading, error, and empty states.
 *
 * Key features:
 * - Fetches open positions periodically using `usePeriodicFetcher` and `fetchHyperliquidPositionsAction`.
 * - Uses `useLocalStorage` to get the refresh interval from settings.
 * - Displays positions in a Shadcn `Table`.
 * - Formats numeric data (size, price, PnL) using `lib/formatting`.
 * - Handles loading, error, and empty states gracefully.
 * - Applies basic styling for PnL (green/red).
 *
 * @dependencies
 * - react: For component structure and hooks (`useState`).
 * - @/types: Provides HyperliquidPosition, AppSettings type definitions.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/hyperliquid-actions: Server Action for fetching Hyperliquid positions.
 * - @/lib/formatting: Utility functions for formatting numbers.
 * - @/lib/constants: Provides default settings values and potentially asset details.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/table: Shadcn Table components for data display.
 * - @/components/ui/LoadingSpinner: Component to display loading state.
 * - @/components/ui/ErrorDisplay: Component to display error messages.
 * - clsx: Utility for conditional class names.
 *
 * @notes
 * - This component manages its own data fetching cycle after receiving initial data via props.
 * - Calculation of Unrealized PnL and Liquidation Price relies on data provided directly by the Hyperliquid API (`assetPositions` structure). More complex client-side calculations might be added later if needed.
 * - The specific asset name mapping (e.g., index 0 to 'BTC') might need adjustment based on `meta` endpoint data.
 */
"use client";

import React from "react";
import type { HyperliquidPosition, AppSettings } from "@/types";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchHyperliquidPositionsAction } from "@/actions/hyperliquid-actions";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import { DEFAULT_APP_SETTINGS, BTC_ASSET_INDEX } from "@/lib/constants"; // Assuming BTC is index 0 for now
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
import clsx from "clsx";

/**
 * Props for the PositionTable component.
 * @property {HyperliquidPosition[] | null} initialPositions - The initial position data fetched server-side.
 * @property {string | null} initialError - An error message if the initial fetch failed.
 */
interface PositionTableProps {
  initialPositions: HyperliquidPosition[] | null;
  initialError: string | null;
}

/**
 * Renders a table displaying the user's open Hyperliquid positions.
 * @param {PositionTableProps} props - Component props.
 * @returns {React.ReactElement} The rendered position table component.
 */
const PositionTable: React.FC<PositionTableProps> = ({
  initialPositions,
  initialError,
}): React.ReactElement => {
  // Get app settings from local storage for refresh interval
  const [settings] = useLocalStorage<AppSettings>(
    "alloraHyperliquidApp_settings",
    DEFAULT_APP_SETTINGS,
  );

  // Fetch positions periodically using the custom hook
  const {
    data: positions,
    isLoading,
    error,
    refresh,
  } = usePeriodicFetcher(
    fetchHyperliquidPositionsAction,
    settings.accountRefreshInterval,
    initialPositions,
  );

  // Use the initial error from props if the first client-side fetch hasn't happened yet or if fetcher has no error yet
  const currentError = positions === null && !isLoading ? initialError : error;
  // Prefer fresh data from the fetcher, fallback to initial data if fetcher hasn't populated yet
  const currentPositions = positions ?? initialPositions;

  // Helper function to determine PnL color
  const getPnlColor = (pnlValue: number): string => {
    if (pnlValue > 0) return "text-green-500";
    if (pnlValue < 0) return "text-red-500";
    return "text-muted-foreground"; // Neutral color for zero PnL
  };

  // Helper function to get asset name (placeholder logic)
  const getAssetName = (position: HyperliquidPosition): string => {
    return position.position.coin || `Asset ${position.position.coin}`;
  };

  // Filter for positions with non-zero size
  const openPositions = currentPositions?.filter(
    (p) => parseFloat(p.position.szi) !== 0,
  ) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
        <CardDescription>
          Your current open positions on Hyperliquid.
          {isLoading && currentPositions && (
            <span className="text-yellow-600 ml-2">(Updating...)</span>
          )}
          {error && currentPositions && (
            <span className="text-red-600 ml-2">(Stale data due to error)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="min-h-[200px]">
          {isLoading && !currentPositions && (
            <div className="flex justify-center items-center h-40">
              <LoadingSpinner />
            </div>
          )}

          {currentError && !currentPositions && (
            <ErrorDisplay error={currentError} />
          )}

          {!isLoading && !currentError && (!currentPositions || openPositions.length === 0) && (
            <p className="text-muted-foreground text-center py-10">
              No open positions.
            </p>
          )}

          {openPositions.length > 0 && (
            <div className="w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Mark Price</TableHead>
                    <TableHead className="text-right">Unrealized PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPositions.map((position) => {
                    const assetName = getAssetName(position);
                    const size = parseFloat(position.position.szi);
                    const entryPrice = parseFloat(position.position.entryPx);
                    const markPrice = parseFloat(position.position.markPx);
                    const unrealizedPnl = parseFloat(position.position.unrealizedPnl);

                    return (
                      <TableRow key={position.position.coin}>
                        <TableCell>{assetName}</TableCell>
                        <TableCell>{formatNumber(size)}</TableCell>
                        <TableCell>{formatCurrency(entryPrice)}</TableCell>
                        <TableCell>{formatCurrency(markPrice)}</TableCell>
                        <TableCell className={clsx("text-right", getPnlColor(unrealizedPnl))}>
                          {formatCurrency(unrealizedPnl)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionTable;