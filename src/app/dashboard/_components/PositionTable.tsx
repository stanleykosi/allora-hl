/**
 * @description
 * Client Component responsible for displaying the user's open Hyperliquid positions in a table.
 * It fetches position data periodically and handles loading, error, and empty states.
 * It now also accepts an alert status map to visually indicate positions that might contradict recent predictions.
 *
 * Key features:
 * - Fetches open positions periodically using `usePeriodicFetcher` and `WorkspaceHyperliquidPositionsAction`.
 * - Uses `useLocalStorage` to get the refresh interval from settings.
 * - Displays positions in a Shadcn `Table`.
 * - Formats numeric data (size, price, PnL) using `lib/formatting`.
 * - Handles loading, error, and empty states gracefully.
 * - Applies basic styling for PnL (green/red).
 * - Accepts `alertStatusMap` to visually highlight potentially contradictory positions.
 *
 * @dependencies
 * - react: For component structure and hooks (`useState`, `useEffect`, `useMemo`).
 * - @/types: Provides HyperliquidPosition, AppSettings type definitions.
 * - @/hooks/usePeriodicFetcher: Custom hook for periodic data fetching.
 * - @/hooks/useLocalStorage: Custom hook for accessing settings from localStorage.
 * - @/actions/hyperliquid-actions: Server Action for fetching Hyperliquid positions and current price.
 * - @/lib/formatting: Utility functions for formatting numbers.
 * - @/lib/constants: Provides default settings values and potentially asset details.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/table: Shadcn Table components for data display.
 * - @/components/ui/LoadingSpinner: Component to display loading state.
 * - @/components/ui/ErrorDisplay: Component to display error messages.
 * - clsx: Utility for conditional class names.
 * - lucide-react: For icons (AlertTriangle).
 *
 * @notes
 * - This component manages its own data fetching cycle after receiving initial data via props.
 * - Calculation of Unrealized PnL and Liquidation Price relies on data provided directly by the Hyperliquid API (`assetPositions` structure).
 * - Asset name mapping uses the 'coin' field from the position data.
 * - Alert display depends on the `alertStatusMap` prop passed from the parent component.
 */
"use client";

import React from "react";
import type { HyperliquidPosition, AppSettings } from "@/types";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { fetchHyperliquidPositionsAction, fetchCurrentPriceAction } from "@/actions/hyperliquid-actions";
import { formatCurrency, formatNumber } from "@/lib/formatting";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import clsx from "clsx";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


/**
 * Props for the PositionTable component.
 * @property {HyperliquidPosition[] | null} initialPositions - The initial position data fetched server-side.
 * @property {string | null} initialError - An error message if the initial fetch failed.
 * @property {Record<string, boolean>} [alertStatusMap] - Optional map where keys are asset names and values are true if an alert should be shown for that position.
 */
interface PositionTableProps {
  initialPositions: HyperliquidPosition[] | null;
  initialError: string | null;
  alertStatusMap?: Record<string, boolean>; // Added prop for alert status
}

/**
 * Renders a table displaying the user's open Hyperliquid positions.
 * @param {PositionTableProps} props - Component props.
 * @returns {React.ReactElement} The rendered position table component.
 */
const PositionTable: React.FC<PositionTableProps> = ({
  initialPositions,
  initialError,
  alertStatusMap = {}, // Default to empty object
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
  } = usePeriodicFetcher(
    fetchHyperliquidPositionsAction,
    settings.accountRefreshInterval,
    initialPositions,
  );

  // Use the initial error from props if the first client-side fetch hasn't happened yet or if fetcher has no error yet
  const currentError = positions === null && !isLoading ? initialError : error;
  // Prefer fresh data from the fetcher, fallback to initial data if fetcher hasn't populated yet
  const currentPositions = positions ?? initialPositions;

  /**
   * Helper function to get asset name from position data, handling potential variations.
   * @param {HyperliquidPosition} position - The position data object.
   * @returns {string} The asset name (e.g., "BTC") or a fallback string ("Unknown Asset", "Error").
   */
  const getAssetName = React.useCallback((position: HyperliquidPosition): string => {
    try {
      // Safely access nested properties
      const coin = position?.position?.coin;
      if (typeof coin === 'string' && coin) {
        return coin;
      }
      // Add fallbacks for other possible structures if necessary
      // else if (typeof position?.asset === 'string' && position.asset) { return position.asset; }
      console.warn("Could not determine asset name from position data:", position);
      return "Unknown Asset";
    } catch (e) {
      console.error("Error getting asset name:", e, position);
      return "Error";
    }
  }, []);


  // Helper function to fetch mark price for a specific asset
  const fetchMarkPrice = React.useCallback(async (assetName: string) => {
    // Avoid fetching if already loading for this asset or if asset name is invalid
    if (!assetName || assetName === "Unknown Asset" || assetName === "Error") return;

    try {
      setIsLoadingPrices(true); // Consider setting loading per-asset if needed
      const result = await fetchCurrentPriceAction(assetName);
      if (result.isSuccess && result.data?.price) {
        const price = parseFloat(result.data.price);
        if (!isNaN(price)) {
          setMarkPrices(prev => ({
            ...prev,
            [assetName]: price,
          }));
        } else {
          console.error(`Received non-numeric price for ${assetName}:`, result.data.price);
        }
      } else if (!result.isSuccess) {
        console.error(`Failed to fetch mark price for ${assetName}:`, result.message);
      }
    } catch (e) {
      console.error(`Error fetching mark price for ${assetName}:`, e);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []); // No dependencies here to avoid recreating this function

  // Fetch mark prices for each unique asset when positions change or periodically
  React.useEffect(() => {
    if (!currentPositions || currentPositions.length === 0) return;

    const uniqueAssets = new Set<string>();
    currentPositions.forEach(position => {
      const assetName = getAssetName(position);
      if (assetName && assetName !== "Unknown Asset" && assetName !== "Error") {
        uniqueAssets.add(assetName);
      }
    });

    // Create a separate effect for the interval to avoid dependency issues
    let priceRefreshInterval: NodeJS.Timeout | null = null;

    // Initial fetch for prices not yet loaded
    Array.from(uniqueAssets).forEach(assetName => {
      if (markPrices[assetName] === undefined) {
        fetchMarkPrice(assetName);
      }
    });

    // Set up periodic refresh only if we have assets to refresh
    if (uniqueAssets.size > 0) {
      priceRefreshInterval = setInterval(() => {
        Array.from(uniqueAssets).forEach(fetchMarkPrice);
      }, settings.accountRefreshInterval);
    }

    return () => {
      if (priceRefreshInterval) clearInterval(priceRefreshInterval);
    };
  }, [currentPositions, getAssetName, fetchMarkPrice, settings.accountRefreshInterval]); // Intentionally exclude markPrices


  // Helper function to determine PnL color
  const getPnlColor = (pnlValue: number): string => {
    if (pnlValue > 0) return "text-green-600 dark:text-green-500";
    if (pnlValue < 0) return "text-red-600 dark:text-red-500";
    return "text-muted-foreground"; // Neutral color for zero PnL
  };


  // Filter for positions with non-zero size with improved error handling
  const openPositions = React.useMemo(() => {
    if (!currentPositions) return [];

    try {
      return currentPositions.filter((p) => {
        // Check for required properties safely
        const szi = p?.position?.szi;
        if (szi === undefined || szi === null) {
          return false;
        }
        const size = parseFloat(String(szi));
        return !isNaN(size) && size !== 0;
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
            {currentError && currentPositions && (
              <span className="text-red-600 ml-2">(Error fetching updates)</span>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[150px]"> {/* Adjusted min-height */}
          {isLoading && !currentPositions && ( // Show loading only if no stale data
            <div className="flex justify-center items-center h-40">
              <LoadingSpinner />
            </div>
          )}

          {currentError && !currentPositions && ( // Show error only if no stale data
            <ErrorDisplay error={currentError} />
          )}

          {/* Handle case where there are no open positions */}
          {!isLoading && !currentError && openPositions.length === 0 && (
            <p className="text-muted-foreground text-center py-10">
              No open positions.
            </p>
          )}

          {/* Render table only if there are open positions */}
          {openPositions.length > 0 && (
            <div className="w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20px]">Alert</TableHead> {/* Alert Column */}
                    <TableHead>Asset</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Mark Price</TableHead>
                    <TableHead className="text-right">Unrealized PnL</TableHead>
                    {/* Add other relevant columns like Margin, Liq. Price if available directly */}
                    {/* <TableHead>Margin</TableHead> */}
                    {/* <TableHead>Liq. Price</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openPositions.map((position, idx) => {
                    try {
                      const assetName = getAssetName(position);
                      // Safely extract values with fallbacks, converting to number where appropriate
                      const size = parseFloat(position.position?.szi || "0");
                      const entryPrice = parseFloat(position.position?.entryPx || "0");
                      const markPrice = markPrices[assetName] ?? parseFloat(position.position?.entryPx || "0"); // Use dynamic price if available, fallback to entry price
                      const unrealizedPnl = parseFloat(position.position?.unrealizedPnl || "0");
                      const isAlertActive = !!alertStatusMap?.[assetName]; // Check alert status

                      return (
                        <TableRow key={`${assetName}-${idx}`} className={clsx(isAlertActive && "bg-yellow-100/50 dark:bg-yellow-900/30")}>
                          <TableCell className="text-center">
                            {isAlertActive ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-center items-center">
                                      <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs max-w-xs">Warning: A new prediction contradicts the basis of this position.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </TableCell>
                          <TableCell>{assetName}</TableCell>
                          <TableCell>{formatNumber(size)}</TableCell>
                          <TableCell>{formatCurrency(entryPrice)}</TableCell>
                          <TableCell>
                            {formatCurrency(markPrice)}
                            {markPrices[assetName] !== undefined && (
                              <span className="ml-1 text-xs text-green-500 dark:text-green-400" title="Real-time Mark Price">•</span>
                            )}
                          </TableCell>
                          <TableCell className={clsx("text-right", getPnlColor(unrealizedPnl))}>
                            {formatCurrency(unrealizedPnl)}
                          </TableCell>
                          {/* Render other columns if data exists */}
                          {/* <TableCell>{formatCurrency(position.position?.marginUsed || '0')}</TableCell> */}
                          {/* <TableCell>{formatCurrency(position.position?.liquidationPx || '0')}</TableCell> */}
                        </TableRow>
                      );
                    } catch (e) {
                      console.error("Error rendering position row:", e, position);
                      // Render a row indicating error for this specific position
                      return (
                        <TableRow key={`error-${idx}`}>
                          <TableCell colSpan={6} className="text-center text-red-600 text-xs">
                            Error rendering position data. See console for details.
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })}
                </TableBody>
              </Table>
              <div className="mt-2 text-xs text-muted-foreground flex items-center justify-end space-x-2">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400" title="Real-time Mark Price"></span>
                  <span>Real-time Mark Price</span>
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <span>Contradiction Alert</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionTable;