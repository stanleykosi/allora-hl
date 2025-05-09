/**
 * @description
 * Client Component responsible for displaying the user's Hyperliquid account summary.
 * Receives account information, loading state, and error state via props.
 * Formats and presents key metrics like total equity and available margin.
 *
 * Key features:
 * - Displays formatted account balance/equity/margin.
 * - Shows loading state using LoadingSpinner.
 * - Shows error state using ErrorDisplay.
 * - Uses responsive grid for better layout.
 * - Improved styling for clarity and visual hierarchy.
 * - Includes tooltips for potentially confusing terms.
 *
 * @dependencies
 * - react: For component structure.
 * - @/types: Provides HyperliquidAccountInfo type definition.
 * - @/lib/formatting: Utility functions for formatting numbers as currency.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/LoadingSpinner: Component to display loading state.
 * - @/components/ui/ErrorDisplay: Component to display error messages.
 * - @/components/ui/tooltip: Shadcn Tooltip components.
 * - lucide-react: For icons (InfoIcon).
 *
 * @notes
 * - This component is purely presentational. Data fetching and state management
 * (isLoading, error, data) are handled by its parent component (DashboardClientContent).
 * - Assumes HyperliquidAccountInfo contains relevant fields like `marginSummary.accountValue` and `withdrawable`.
 * The exact fields might need adjustment based on the final SDK response structure.
 */
"use client";

import React from "react";
import type { HyperliquidAccountInfo } from "@/types";
import { formatCurrency } from "@/lib/formatting";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

/**
 * Props for the AccountSummary component.
 * @property {HyperliquidAccountInfo | null} currentAccountInfo - The latest fetched account information, or null if not yet fetched or on error.
 * @property {boolean} isLoading - Indicates if the account information is currently being fetched.
 * @property {string | null} error - An error message if the last fetch failed, otherwise null.
 */
interface AccountSummaryProps {
  currentAccountInfo: HyperliquidAccountInfo | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Renders the account summary section of the dashboard.
 * @param {AccountSummaryProps} props - Component props.
 * @returns {React.ReactElement} The rendered account summary component.
 */
const AccountSummary: React.FC<AccountSummaryProps> = ({
  currentAccountInfo,
  isLoading,
  error,
}): React.ReactElement => {
  // Safely extract values with default fallbacks
  const getAccountValue = () => {
    try {
      return currentAccountInfo?.marginSummary?.accountValue ?? "0";
    } catch (e) {
      console.error("Error getting account value:", e);
      return "0";
    }
  };

  const getWithdrawable = () => {
    try {
      // Check if the withdrawable field exists directly on account info
      if (currentAccountInfo?.withdrawable !== undefined) {
        return currentAccountInfo.withdrawable;
      } else if (currentAccountInfo?.marginSummary) {
        // Calculate withdrawable as accountValue minus totalMarginUsed
        const accountValue = currentAccountInfo.marginSummary.accountValue || "0";
        const marginUsed = currentAccountInfo.marginSummary.totalMarginUsed || "0";

        // Simple calculation of available margin (this may need to be refined based on exact Hyperliquid logic)
        const available = (parseFloat(accountValue) - parseFloat(marginUsed)).toString();
        return available;
      } else {
        console.warn("Available margin field (withdrawable) not found in API response", currentAccountInfo);
        return "0"; // Fallback if neither field is found
      }
    } catch (e) {
      console.error("Error getting withdrawable:", e);
      return "0";
    }
  };


  const getMarginUsed = () => {
    try {
      return currentAccountInfo?.marginSummary?.totalMarginUsed ?? "0";
    } catch (e) {
      console.error("Error getting margin used:", e);
      return "0";
    }
  };

  const getPositionValue = () => {
    try {
      // totalNtlPos seems most appropriate for total position value (notional)
      return currentAccountInfo?.marginSummary?.totalNtlPos ?? "0";
    } catch (e) {
      console.error("Error getting position value (totalNtlPos):", e);
      return "0";
    }
  };

  // Check if data is stale (e.g., older than 1 minute) due to error
  const isDataStale = Boolean(
    error &&
    currentAccountInfo?.time &&
    (new Date().getTime() - new Date(currentAccountInfo.time).getTime()) > 60000
  );

  // Determine content based on loading, error, and data states
  const renderContent = () => {
    // Always render a div with consistent structure and minimum height
    return (
      <div className="min-h-[80px] flex flex-col justify-center">
        {isLoading && !currentAccountInfo && (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner />
          </div>
        )}

        {error && !currentAccountInfo && ( // Show primary error only if no stale data
          <div className="flex justify-center items-center h-full">
            <ErrorDisplay error={error} />
          </div>
        )}

        {!isLoading && !error && !currentAccountInfo && (
          <p className="text-muted-foreground text-sm text-center">No account data available.</p>
        )}

        {currentAccountInfo && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {/* Total Equity */}
            <div>
              <p className="text-muted-foreground">Total Equity</p>
              <p className="font-semibold text-lg">
                {formatCurrency(getAccountValue())}
              </p>
            </div>

            {/* Available Margin */}
            <div>
              <div className="flex items-center gap-1">
                <p className="text-muted-foreground">Available Margin</p>
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p>
                        Margin available to open new positions or withdraw.
                        It equals Equity minus Margin Used. Can be zero or negative
                        if maintenance margin requirements are high for open positions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-semibold text-lg">
                {formatCurrency(getWithdrawable())}
              </p>
            </div>

            {/* Margin Used */}
            <div>
              <div className="flex items-center gap-1">
                <p className="text-muted-foreground">Margin Used</p>
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p>
                        Total margin currently allocated to maintain your open positions (initial + maintenance).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-semibold">
                {formatCurrency(getMarginUsed())}
              </p>
            </div>

            {/* Total Position Value */}
            <div>
              <div className="flex items-center gap-1">
                <p className="text-muted-foreground">Total Position Value</p>
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p>
                        The total notional value of all your open positions (Sum of |Size * Mark Price|).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-semibold">
                {formatCurrency(getPositionValue())}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Account Summary</CardTitle>
        <CardDescription>
          Overview of your Hyperliquid account balance and margin.
          {isDataStale && (
            <span className="text-destructive font-medium ml-2">(Stale data)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3 pb-2">
        {renderContent()}
        {currentAccountInfo?.time && (
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date(currentAccountInfo.time).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountSummary;