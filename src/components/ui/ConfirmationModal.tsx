/**
 * @description
 * Client Component: Renders a modal dialog for confirming a trade before execution.
 * Displays trade details, risk warnings, and handles the execution flow via Server Actions.
 *
 * Key features:
 * - Uses Shadcn AlertDialog for the modal structure.
 * - Displays details of the trade to be executed (symbol, direction, size, price, estimates).
 * - Includes prominent risk warnings.
 * - Confirmation button is disabled if the master trade switch (passed via props) is off or if execution is already in progress.
 * - On confirmation:
 * - Sets loading state.
 * - Calls `placeMarketOrderAction` Server Action.
 * - Handles success: Calls `logTradeAction`, shows success toast, refreshes data via `router.refresh()`, closes modal.
 * - Handles failure: Calls `logTradeAction` with error, shows error toast, resets loading state.
 *
 * @dependencies
 * - react: For component structure, state (useState).
 * - next/navigation: Provides `useRouter` for refreshing data on success.
 * - @/types: Provides type definitions (ActionState, HyperliquidOrderResult, TradeLogEntry).
 * - @/components/ui/alert-dialog: Shadcn AlertDialog components.
 * - @/components/ui/button: Shadcn Button component.
 * - @/components/ui/badge: Shadcn Badge component.
 * - @/hooks/use-toast: Hook for displaying notifications.
 * - @/actions/hyperliquid-actions: Server Action for placing the trade (`placeMarketOrderAction`).
 * - @/actions/log-actions: Server Action for logging the trade outcome (`logTradeAction`).
 * - @/lib/formatting: Utilities for formatting numbers/currency.
 * - @/lib/constants: Provides BTC symbol/index constants.
 * - lucide-react: For icons (AlertTriangle).
 *
 * @notes
 * - The component manages its own execution state (`isExecuting`, `errorMsg`).
 * - Assumes the `tradeDetails` prop contains all necessary information for display and execution.
 * - Relies on the parent component to control its visibility (`isOpen`, `onOpenChange`).
 */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionState, HyperliquidOrderResult, TradeLogEntry } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { placeMarketOrderAction } from "@/actions/hyperliquid-actions";
import { logTradeAction } from "@/actions/log-actions";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import { BTC_ASSET_INDEX, BTC_SYMBOL_UI } from "@/lib/constants"; // Assuming BTC for now
import { AlertTriangle } from "lucide-react";

/**
 * Details required for the trade confirmation modal.
 */
export interface TradeConfirmationDetails {
  symbol: string; // e.g., "BTC-PERP"
  direction: "long" | "short";
  size: number; // In base asset units (e.g., BTC amount)
  leverage: number; // Leverage used for estimation
  priceLimit: string; // Formatted price limit for display
  priceLimitValue: number; // Raw price limit value for calculations
  estimatedMargin: number;
  estimatedLiqPrice: number;
  currentMarketPrice: number; // Current price for reference
}

interface ConfirmationModalProps {
  tradeDetails: TradeConfirmationDetails | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void; // Function to control modal visibility from parent
  masterSwitchEnabled: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  tradeDetails,
  isOpen,
  onOpenChange,
  masterSwitchEnabled,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when modal is closed or tradeDetails change
  useEffect(() => {
    if (!isOpen) {
      setIsExecuting(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    // Prevent closing while executing
    if (!isExecuting) {
      onOpenChange(false);
    }
  };

  const handleConfirm = async () => {
    // Don't execute if the master trade switch is disabled
    if (!masterSwitchEnabled || !tradeDetails) return;

    setIsExecuting(true);
    setErrorMsg(null);

    // Variables for logging, initialized with defaults
    let logEntryPrice = 0;
    let logStatus = "failed";
    let logOrderId = "";
    let logErrorMessage = "";

    try {
      // Extract key trade parameters
      const isBuy = tradeDetails.direction === "long"; // true for long, false for short

      // CRITICAL FIX: Try several different tick sizes with automatic retry
      // Common tick sizes in crypto markets
      const POSSIBLE_TICK_SIZES = [0.5, 0.1, 1.0, 5.0, 10.0];
      let orderResult = null;
      let successfulTickSize = null;
      let lastError = "";

      for (const tick of POSSIBLE_TICK_SIZES) {
        try {
          console.log(`Trying to place order with tick size: ${tick}`);

          // Calculate price using this tick size
          const rawPriceLimit = tradeDetails.priceLimitValue;
          const tickAdjustedPrice = Math.round(rawPriceLimit / tick) * tick;

          // Format as needed - make sure we have the right precision based on tick size
          const decimalPlaces = tick < 1 ? 1 : 0;
          const priceString = tickAdjustedPrice.toFixed(decimalPlaces);

          console.log(`Price adjustment for tick ${tick}: ${rawPriceLimit} → ${tickAdjustedPrice} (${priceString})`);

          // Call the Server Action to place the order with this tick-adjusted price
          const result = await placeMarketOrderAction({
            assetName: tradeDetails.symbol,
            isBuy,
            size: tradeDetails.size,
            leverage: tradeDetails.leverage,
            slippageBps: 200, // 2% slippage
            overridePriceString: priceString // Pass the manually formatted price
          });

          if (result.isSuccess) {
            orderResult = result;
            successfulTickSize = tick;
            console.log(`Order successfully placed with tick size ${tick}`);
            break; // Exit the loop on success
          }
        } catch (tickError: any) {
          const errorMessage = tickError instanceof Error ? tickError.message : String(tickError);
          lastError = errorMessage;

          // Only continue retrying if this was a tick size error
          if (!errorMessage.includes("tick size")) {
            throw tickError; // Re-throw other errors
          }

          console.warn(`Failed with tick size ${tick}: ${errorMessage}`);
          // Continue to the next tick size
        }
      }

      // Process the result if we found a working tick size
      if (orderResult && orderResult.isSuccess) {
        const result = orderResult;
        console.log(`Trade executed successfully with tick size: ${successfulTickSize}`);

        logOrderId = result.data.oid.toString();
        if (result.data.status === 'filled' && result.data.avgPx) {
          logStatus = 'filled';
          logEntryPrice = parseFloat(result.data.avgPx); // Use actual fill price
          logErrorMessage = ""; // No error on success
          toast({
            title: "Trade Executed Successfully",
            description: `Order ID: ${result.data.oid}. Average Fill Price: ${formatCurrency(logEntryPrice)}.`,
            variant: "default", // Use default for success
          });
        } else {
          // Handle cases like 'resting' IOC (partial/no fill)
          logStatus = 'resting_ioc';
          logErrorMessage = result.message; // Provide context from the action
          toast({
            title: "Trade Placed (IOC)",
            description: `Order ID: ${result.data.oid}. Status: ${result.data.status}. ${result.message}`,
            variant: "default", // Still default style, but message indicates potential issue
          });
        }
        router.refresh(); // Refresh server data (positions, balance)
      } else {
        // All tick sizes failed
        setErrorMsg(`Failed to place order with any tick size: ${lastError}`);
        toast({
          title: "Trade Execution Failed",
          description: `Tried multiple tick sizes but all failed: ${lastError}`,
          variant: "destructive",
        });
      }

      // Call log action
      const logResult = await logTradeAction({
        symbol: tradeDetails.symbol,
        direction: tradeDetails.direction,
        size: tradeDetails.size,
        entryPrice: logEntryPrice, // Use actual fill price or 0 if failed/resting
        status: logStatus,
        hyperliquidOrderId: logOrderId,
        errorMessage: logErrorMessage,
      });

      if (!logResult.isSuccess) {
        // Log the logging failure, but don't necessarily block the user flow
        console.error("Failed to log trade outcome:", logResult.message);
        toast({
          title: "Logging Error",
          description: "Failed to save trade log entry: " + logResult.message,
          variant: "destructive",
        });
      }

      // Close modal only on successful fill or placement, keep open on direct failure to show error
      if (orderResult && orderResult.isSuccess) {
        onOpenChange(false);
      }

    } catch (error: unknown) {
      // Catch unexpected errors during the process
      console.error("Unexpected error during trade confirmation:", error);

      // Capture the full error details for display
      let errorMsg = "An unknown error occurred";
      let errorDetail = "";

      if (error instanceof Error) {
        errorMsg = error.message;
        errorDetail = error.stack || "";

        // Try to extract more specific error information if it's wrapped in another message
        if (errorMsg.includes("API rejected") && errorMsg.includes(":")) {
          const parts = errorMsg.split(":");
          if (parts.length > 1) {
            errorDetail = parts.slice(1).join(":").trim();
          }
        }
      } else {
        errorMsg = String(error);
      }

      // Set a more detailed error message for the UI
      setErrorMsg(`${errorMsg}\n\nFull error details: ${errorDetail || errorMsg}`);

      toast({
        title: "Trading Error",
        description: errorMsg,
        variant: "destructive",
      });

      // Log this unexpected failure too
      await logTradeAction({
        symbol: tradeDetails.symbol,
        direction: tradeDetails.direction,
        size: tradeDetails.size,
        entryPrice: 0,
        status: 'failed',
        hyperliquidOrderId: '', // Empty string instead of null
        errorMessage: `Unexpected error during confirmation: ${errorMsg}`,
      });
    } finally {
      // Only set executing to false if the component is still mounted and the modal didn't close
      if (isOpen) { // Check if modal is still intended to be open
        setIsExecuting(false);
      }
    }
  };

  if (!tradeDetails) {
    return null; // Don't render if no details are provided
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" /> Confirm Trade Execution
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please carefully review the details below before executing the trade.
            Market orders execute immediately at the best available price and may experience slippage.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Trade Details Section */}
        <div className="my-4 space-y-2 border-t border-b py-4">
          <h4 className="font-semibold text-lg mb-2">Trade Details:</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Asset:</span>
            <span className="font-medium">{tradeDetails.symbol}</span>

            <span className="text-muted-foreground">Direction:</span>
            <span className={`font-medium ${tradeDetails.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>
              {tradeDetails.direction.toUpperCase()}
            </span>

            <span className="text-muted-foreground">Size:</span>
            <span className="font-medium">{formatNumber(tradeDetails.size, 6)} {tradeDetails.symbol.split('-')[0]}</span>

            <span className="text-muted-foreground">Leverage (Est.):</span>
            <span className="font-medium">{formatNumber(tradeDetails.leverage, 1)}x</span>

            <span className="text-muted-foreground">Current Price:</span>
            <span className="font-medium">{formatCurrency(tradeDetails.currentMarketPrice)}</span>

            <span className="text-muted-foreground">Order Type:</span>
            <span className="font-medium">Market (IOC Limit)</span>

            <span className="text-muted-foreground">Limit Price Boundary:</span>
            <span className="font-medium">{tradeDetails.priceLimit}</span>
          </div>
          <div className="mt-3 space-y-1 border-t pt-2 text-muted-foreground text-xs">
            <h5 className="font-medium text-foreground mb-1">Estimates (Approximate):</h5>
            <div className="flex justify-between">
              <span>Required Margin:</span>
              <span className="font-medium text-foreground">{formatCurrency(tradeDetails.estimatedMargin)}</span>
            </div>
            <div className="flex justify-between">
              <span>Liquidation Price:</span>
              <span className="font-medium text-foreground">{formatCurrency(tradeDetails.estimatedLiqPrice)}</span>
            </div>
            <p className="text-xs italic text-center pt-1">Estimates exclude fees, funding, and slippage.</p>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="text-sm text-destructive font-medium p-3 border border-destructive bg-destructive/10 rounded-md">
          <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={16} /> Risk Warning!</p>
          Trading perpetual futures with leverage is highly risky and can result in losses exceeding your initial margin. You are solely responsible for managing your risk and the consequences of this trade. Ensure the master trade switch is intentionally enabled.
        </div>

        {/* Display Execution Error */}
        {errorMsg && (
          <div className="text-sm text-destructive mt-2 p-3 border border-destructive rounded-md bg-destructive/10">
            <strong className="flex items-center gap-1 mb-1">
              <AlertTriangle size={16} /> Execution Failed:
            </strong>
            <p>{errorMsg}</p>
            {errorMsg.includes("API secret") && (
              <div className="mt-2 text-xs">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc pl-4 mt-1">
                  <li>Ensure your HYPERLIQUID_API_SECRET is correctly set in your environment variables</li>
                  <li>The API key should be a 64-character hexadecimal string (with or without 0x prefix)</li>
                  <li>Check server logs for more details about the configuration issue</li>
                </ul>
              </div>
            )}

            {errorMsg.includes("tick size") && (
              <div className="mt-2 text-xs">
                <strong>Price Tick Size Error:</strong>
                <ul className="list-disc pl-4 mt-1">
                  <li>Hyperliquid requires prices to be in specific increments (tick sizes)</li>
                  <li>This error typically occurs due to rounding or precision issues</li>
                  <li>Try again with a slightly different size or using one of the templates</li>
                  <li>For BTC, prices must typically be in increments of 0.5 (e.g., 96500.0, 96500.5, 96501.0)</li>
                </ul>
              </div>
            )}
          </div>
        )}


        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isExecuting}>
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={!masterSwitchEnabled || isExecuting}
            aria-disabled={!masterSwitchEnabled || isExecuting}
            className={!masterSwitchEnabled ? "bg-gray-500 hover:bg-gray-500 cursor-not-allowed" : "bg-primary hover:bg-primary/90"}
            variant={!masterSwitchEnabled ? "secondary" : "default"}
          >
            {isExecuting
              ? "Executing..."
              : !masterSwitchEnabled
                ? "Trading Disabled"
                : "Confirm Trade"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;