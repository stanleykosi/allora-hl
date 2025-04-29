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
    refresh, // Function to manually trigger refresh if needed
  } = usePeriodicFetcher(
    fetchHyperliquidPositionsAction,
    settings.accountRefreshInterval, // Use the account refresh interval from settings
    initialPositions, // Use initial data from server
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
  // TODO: Replace with actual logic using meta data if available
  const getAssetName = (position: HyperliquidPosition): string => {
    // Example placeholder: Use the coin name directly if present, otherwise use index
    return position.position.coin || `Asset ${position.position.coin}`; // Adapt based on actual data structure
  };

  const renderContent = () => {
    if (isLoading && !currentPositions) {
      // Show loading spinner only if there's no stale data
      return (
        <div className="flex justify-center items-center h-40">
          <LoadingSpinner />
        </div>
      );
    }

    if (currentError && !currentPositions) {
      // Show error only if there's no stale data
      return <ErrorDisplay error={currentError} />;
    }

    if (!currentPositions || currentPositions.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-10">
          No open positions.
        </p>
      );
    }

    // Filter for positions with non-zero size
    const openPositions = currentPositions.filter(
      (p) => parseFloat(p.position.szi) !== 0,
    );

    if (openPositions.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-10">
          No open positions.
        </p>
      );
    }

    return (
      <Table>
        <TableCaption>Your currently open positions on Hyperliquid.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Entry Price</TableHead>
            <TableHead className="text-right">Unrealized PnL</TableHead>
            <TableHead className="text-right">Margin Used</TableHead>
            <TableHead className="text-right">Est. Liq. Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {openPositions.map((pos, index) => {
            const positionDetails = pos.position;
            const positionSize = parseFloat(positionDetails.szi);
            const direction = positionSize > 0 ? "Long" : "Short";
            const entryPrice = parseFloat(positionDetails.entryPx || "0");
            const unrealizedPnl = parseFloat(positionDetails.unrealizedPnl || "0");
            const marginUsed = parseFloat(positionDetails.marginUsed || "0");
            const liquidationPrice = parseFloat(
              positionDetails.liquidationPx || "0",
            );
            const pnlColor = getPnlColor(unrealizedPnl);

            return (
              <TableRow key={`${positionDetails.coin}-${index}`}>
                <TableCell className="font-medium">
                  {getAssetName(pos)}
                </TableCell>
                <TableCell
                  className={clsx(
                    direction === "Long" ? "text-green-600" : "text-red-600",
                  )}
                >
                  {direction}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(Math.abs(positionSize), 4)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entryPrice)}
                </TableCell>
                <TableCell className={clsx("text-right font-medium", pnlColor)}>
                  {formatCurrency(unrealizedPnl)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(marginUsed)}
                </TableCell>
                <TableCell className="text-right">
                  {liquidationPrice > 0 ? formatCurrency(liquidationPrice) : "N/A"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
        <CardDescription>
          Real-time overview of your open positions on Hyperliquid.
          {isLoading && currentPositions && (
            <span className="text-yellow-600 ml-2">(Updating...)</span>
          )}
          {error && currentPositions && (
            <span className="text-red-600 ml-2">(Stale data due to error)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};

export default PositionTable;