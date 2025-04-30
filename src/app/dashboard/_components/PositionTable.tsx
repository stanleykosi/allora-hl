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
import { fetchHyperliquidPositionsAction, fetchCurrentPriceAction } from "@/actions/hyperliquid-actions";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import { DEFAULT_APP_SETTINGS, BTC_ASSET_INDEX } from "@/lib/constants"; // Assuming BTC is index 0 for now
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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

  // State to store current mark prices
  const [markPrices, setMarkPrices] = React.useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = React.useState<boolean>(false);

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

  // Helper function to get mark price for an asset
  const getMarkPrice = async (assetName: string) => {
    try {
      setIsLoadingPrices(true);
      const result = await fetchCurrentPriceAction(assetName);
      if (result.isSuccess && result.data) {
        setMarkPrices(prev => ({
          ...prev,
          [assetName]: parseFloat(result.data.price)
        }));
      }
    } catch (e) {
      console.error(`Error fetching mark price for ${assetName}:`, e);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Fetch mark prices for each unique asset when positions change
  React.useEffect(() => {
    if (!currentPositions || currentPositions.length === 0) return;

    // Get unique assets from positions
    const uniqueAssets = new Set<string>();
    currentPositions.forEach(position => {
      try {
        const assetName = getAssetName(position);
        if (assetName && assetName !== "Unknown Asset" && assetName !== "Error") {
          uniqueAssets.add(assetName);
        }
      } catch (e) {
        console.error("Error getting asset name:", e);
      }
    });

    // Fetch mark price for each unique asset
    uniqueAssets.forEach(assetName => {
      getMarkPrice(assetName);
    });
  }, [currentPositions]);

  // Helper function to determine PnL color
  const getPnlColor = (pnlValue: number): string => {
    if (pnlValue > 0) return "text-green-500";
    if (pnlValue < 0) return "text-red-500";
    return "text-muted-foreground"; // Neutral color for zero PnL
  };

  // Helper function to get asset name with improved error handling
  const getAssetName = (position: HyperliquidPosition): string => {
    try {
      // Try to extract the coin name from different possible structures
      if (position.position?.coin) {
        return position.position.coin;
      } else if (typeof position.position === 'object' && 'asset' in position.position) {
        // @ts-ignore - Handling potential different structure
        return position.position.asset;
      } else if (typeof position === 'object' && 'coin' in position) {
        // @ts-ignore - Handling potential different structure
        return position.coin;
      } else {
        return "Unknown Asset";
      }
    } catch (e) {
      console.error("Error getting asset name:", e);
      return "Error";
    }
  };

  // Filter for positions with non-zero size with improved error handling
  const openPositions = React.useMemo(() => {
    if (!currentPositions) return [];

    try {
      // Debug: Log the entire positions structure to inspect
      console.log("Debug - Full positions structure:", JSON.stringify(currentPositions, null, 2));

      return currentPositions.filter((p) => {
        // Check for required properties
        if (!p || !p.position) {
          return false;
        }

        // Try to extract size from different possible structures
        let size = 0;
        if (p.position.szi !== undefined) {
          size = parseFloat(p.position.szi || "0");
        } else if (typeof p.position === 'object' && 'size' in p.position) {
          // @ts-ignore - Handling potential different structure
          size = parseFloat(p.position.size || "0");
        }

        return size !== 0;
      });
    } catch (e) {
      console.error("Error filtering positions:", e);
      return [];
    }
  }, [currentPositions]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Open Positions</CardTitle>
          <CardDescription>
            Your current open positions on Hyperliquid.
            {error && currentPositions && (
              <>
                {currentPositions[0]?.time && new Date().getTime() - new Date(currentPositions[0].time).getTime() > 60000 && (
                  <span className="text-red-600 ml-2">(Stale data due to error)</span>
                )}
              </>
            )}
          </CardDescription>
        </div>
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
                  {openPositions.map((position, idx) => {
                    try {
                      // Debug: Log the individual position structure
                      console.log(`Debug - Position ${idx}:`, position);

                      const assetName = getAssetName(position);
                      // Extract values with fallbacks
                      const size = parseFloat(position.position?.szi || "0");
                      const entryPrice = parseFloat(position.position?.entryPx || "0");
                      // Try to get mark price from our dynamic fetching first, fall back to position data
                      const isMarkPriceDynamic = !!markPrices[assetName];
                      const markPrice = markPrices[assetName] || parseFloat(position.position?.markPx || "0");
                      // Get unrealized PnL from the position data
                      const reportedUnrealizedPnl = parseFloat(position.position?.unrealizedPnl || "0");

                      // Calculate our own unrealized PnL if we have mark prices
                      let calculatedUnrealizedPnl = reportedUnrealizedPnl;
                      if (markPrices[assetName] && entryPrice && size) {
                        // Basic PnL calculation: (current price - entry price) * size
                        // Positive size means long, negative means short
                        calculatedUnrealizedPnl = (markPrice - entryPrice) * size;
                      }

                      // Use calculated PnL if available, otherwise use reported PnL
                      const unrealizedPnl = markPrices[assetName] ? calculatedUnrealizedPnl : reportedUnrealizedPnl;

                      // Debug: Log the extracted values
                      console.log(`Debug - Extracted values for ${assetName}:`, {
                        size,
                        entryPrice,
                        markPrice,
                        unrealizedPnl
                      });

                      return (
                        <TableRow key={`${assetName}-${idx}`}>
                          <TableCell>{assetName}</TableCell>
                          <TableCell>{formatNumber(size)}</TableCell>
                          <TableCell>{formatCurrency(entryPrice)}</TableCell>
                          <TableCell>
                            {formatCurrency(markPrice)}
                            {isMarkPriceDynamic && (
                              <span className="ml-2 text-xs text-green-500">•</span>
                            )}
                          </TableCell>
                          <TableCell className={clsx("text-right", getPnlColor(unrealizedPnl))}>
                            {formatCurrency(unrealizedPnl)}
                            {isMarkPriceDynamic && (
                              <span className="ml-2 text-xs text-green-500">•</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    } catch (e) {
                      console.error("Error rendering position:", e, position);
                      return null; // Skip this position on error
                    }
                  })}
                </TableBody>
              </Table>
              <div className="mt-3 text-xs text-muted-foreground flex items-center">
                <span className="text-green-500 mr-1">•</span>
                <span>Indicates values calculated with real-time mark prices</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionTable;