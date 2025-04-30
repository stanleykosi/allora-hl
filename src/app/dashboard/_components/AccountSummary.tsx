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
 *
 * @dependencies
 * - react: For component structure.
 * - @/types: Provides HyperliquidAccountInfo type definition.
 * - @/lib/formatting: Utility functions for formatting numbers as currency.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/LoadingSpinner: Component to display loading state.
 * - @/components/ui/ErrorDisplay: Component to display error messages.
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
      return currentAccountInfo?.marginSummary?.accountValue || "0";
    } catch (e) {
      console.error("Error getting account value:", e);
      return "0";
    }
  };

  const getWithdrawable = () => {
    try {
      return currentAccountInfo?.withdrawable || "0";
    } catch (e) {
      console.error("Error getting withdrawable:", e);
      return "0";
    }
  };

  const getMarginUsed = () => {
    try {
      return currentAccountInfo?.marginSummary?.totalMarginUsed || "0";
    } catch (e) {
      console.error("Error getting margin used:", e);
      return "0";
    }
  };

  const getPositionValue = () => {
    try {
      return currentAccountInfo?.marginSummary?.totalNtlPos || "0";
    } catch (e) {
      console.error("Error getting position value:", e);
      return "0";
    }
  };

  // Determine content based on loading, error, and data states
  const renderContent = () => {
    // Always render a div with consistent structure
    return (
      <div className="min-h-[120px]">
        {isLoading && !currentAccountInfo && (
          <div className="flex justify-center items-center h-20">
            <LoadingSpinner />
          </div>
        )}

        {error && !currentAccountInfo && (
          <ErrorDisplay error={error} />
        )}

        {!isLoading && !error && !currentAccountInfo && (
          <p className="text-muted-foreground text-sm">No account data available.</p>
        )}

        {currentAccountInfo && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Equity</p>
              <p className="font-semibold text-lg">
                {formatCurrency(getAccountValue())}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available Margin</p>
              <p className="font-semibold text-lg">
                {formatCurrency(getWithdrawable())}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Margin Used</p>
              <p className="font-semibold">
                {formatCurrency(getMarginUsed())}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Position Value</p>
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
      <CardHeader>
        <CardTitle>Account Summary</CardTitle>
        <CardDescription>
          Overview of your Hyperliquid account balance and margin.
          {error && currentAccountInfo && (
            <span className="text-red-600 ml-2">(Stale data due to error)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
        {currentAccountInfo?.time && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {new Date(currentAccountInfo.time).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountSummary;