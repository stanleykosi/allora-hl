/**
 * @description
 * Client Component: Renders a modal dialog for final trade confirmation.
 * Displays a summary of the trade details, risk warnings, and requires explicit user confirmation.
 * Interacts with the master trade switch setting and handles the trade execution via Server Action.
 * Provides feedback on execution success or failure using toasts.
 *
 * Key features:
 * - Uses Shadcn UI Dialog for the modal.
 * - Displays clear summary of trade parameters (Symbol, Direction, Size, Leverage, Estimates).
 * - Includes prominent risk warnings.
 * - Checks the `masterSwitchEnabled` prop before enabling the confirmation button.
 * - Calls `placeMarketOrderAction` on confirmation.
 * - Calls `logTradeAction` to record the attempt (success or failure).
 * - Shows success/error toasts using `useToast`.
 * - Refreshes page data using `router.refresh()` on successful trade.
 * - Improved layout and styling for clarity.
 *
 * @dependencies
 * - react: For component structure and hooks (useState).
 * - next/navigation: Provides `useRouter` for page refresh.
 * - @/types: Provides ActionState, HyperliquidOrderResult, TradeLogEntry type definitions.
 * - @/components/ui/dialog: Shadcn Dialog components.
 * - @/components/ui/button: Shadcn Button component.
 * - @/components/ui/badge: Shadcn Badge component.
 * - @/components/ui/separator: Shadcn Separator component.
 * - @/components/ui/toast: Provides toast elements via useToast hook.
 * - @/hooks/use-toast: Hook to trigger toasts.
 * - @/actions/hyperliquid-actions: Server Action to place market orders.
 * - @/actions/log-actions: Server Action to log trade attempts.
 * - lucide-react: For icons (TriangleAlert).
 * - @/lib/formatting: Utility functions for formatting numbers.
 * - clsx: Utility for conditional class names.
 *
 * @notes
 * - The component receives all necessary trade details via the `tradeDetails` prop.
 * - It manages its own `isExecuting` and `errorMsg` state during the action call.
 * - `router.refresh()` is called on success to update potentially changed data like positions and balance.
 */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  ActionState,
  HyperliquidOrderResult,
  TradeLogEntry,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Added DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { placeMarketOrderAction } from "@/actions/hyperliquid-actions";
import { logTradeAction } from "@/actions/log-actions";
import { TriangleAlert } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatting";
import { BTC_ASSET_INDEX } from "@/lib/constants"; // Assuming BTC asset index is constant
import clsx from "clsx";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";

/**
 * Details required for the trade confirmation modal.
 */
export interface TradeConfirmationDetails {
  symbol: string;
  direction: "long" | "short";
  size: number;
  leverage: number; // For display/estimation context
  estimatedMargin: number;
  estimatedLiqPrice: number;
  currentMarketPrice: number; // Current price when review was clicked
  priceLimit: string; // Calculated wide limit price string for IOC order
  priceLimitValue: number; // Raw numeric limit price for calculations/logging
  isDirectionOverridden?: boolean; // Optional flag
  suggestedDirection?: 'long' | 'short'; // Optional suggested direction
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tradeDetails: TradeConfirmationDetails | null;
  masterSwitchEnabled: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onOpenChange,
  tradeDetails,
  masterSwitchEnabled,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setIsExecuting(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isExecuting || !tradeDetails) return;
    setIsExecuting(true);
    setErrorMsg(null);

    // Initialize logging variables
    let logStatus = "pending";
    let logOrderId = null;
    let logEntryPrice = tradeDetails.currentMarketPrice; // Use estimated price initially
    let logErrorMessage = null;

    try {
      console.log("[TradeModal] Starting trade execution with details:", {
        symbol: tradeDetails.symbol,
        direction: tradeDetails.direction,
        size: tradeDetails.size,
        leverage: tradeDetails.leverage,
        entryPrice: tradeDetails.currentMarketPrice
      });

      // Execute the trade
      const actionResult = await placeMarketOrderAction({
        assetName: tradeDetails.symbol,
        isBuy: tradeDetails.direction === "long",
        size: tradeDetails.size,
        leverage: tradeDetails.leverage,
      });

      console.log("[TradeModal] Trade execution result:", {
        success: actionResult.isSuccess,
        status: actionResult.data?.status,
        message: actionResult.message,
        error: actionResult.error
      });

      // Update logging variables based on trade result
      if (actionResult.isSuccess) {
        logStatus = actionResult.data.status; // 'filled' or 'resting'
        logOrderId = String(actionResult.data.oid);
        if (actionResult.data.status === 'filled' && actionResult.data.avgPx) {
          logEntryPrice = parseFloat(actionResult.data.avgPx); // Use actual fill price if available
        }
        toast({
          title: "Trade Submitted Successfully",
          description: `Order Status: ${logStatus}. Order ID: ${logOrderId}`,
        });
        router.refresh(); // Refresh data (positions, balance, logs)
        onOpenChange(false); // Close modal on success
      } else {
        logStatus = "failed";
        logErrorMessage = actionResult.message; // Capture error message from ActionState
        setErrorMsg(actionResult.message); // Display error within the modal
        toast({
          title: "Trade Execution Failed",
          description: actionResult.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[TradeModal] Error during trade execution:", error);
      logStatus = "failed";
      logErrorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setErrorMsg(logErrorMessage);
      toast({
        title: "Trade Execution Failed",
        description: logErrorMessage,
        variant: "destructive",
      });
    }

    // Log the trade attempt regardless of success/failure
    // Moved outside the main try-catch to ensure it always executes
    try {
      console.log("[TradeModal] Preparing to log trade with data:", {
        symbol: tradeDetails.symbol,
        direction: tradeDetails.direction,
        size: tradeDetails.size,
        entryPrice: logEntryPrice,
        status: logStatus,
        hyperliquidOrderId: logOrderId,
        errorMessage: logErrorMessage
      });

      const logData: Omit<TradeLogEntry, "id" | "timestamp"> = {
        symbol: tradeDetails.symbol,
        direction: tradeDetails.direction,
        size: tradeDetails.size,
        entryPrice: logEntryPrice,
        status: logStatus,
        hyperliquidOrderId: logOrderId,
        errorMessage: logErrorMessage,
      };

      const logResult = await logTradeAction(logData);
      console.log("[TradeModal] Trade log result:", {
        success: logResult.isSuccess,
        message: logResult.message,
        error: logResult.error
      });

      if (!logResult.isSuccess) {
        console.error("[TradeModal] Failed to log trade:", logResult.error);
        // Show a secondary toast for log failure
        toast({
          title: "Warning: Trade Logging Failed",
          description: "The trade was executed but could not be logged. Please check the logs.",
          variant: "destructive",
        });
      }
    } catch (logError) {
      console.error("[TradeModal] Error during trade logging:", logError);
      toast({
        title: "Warning: Trade Logging Failed",
        description: "The trade was executed but could not be logged. Please check the logs.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!tradeDetails) return null; // Don't render if details aren't ready

  const canConfirm = masterSwitchEnabled && !isExecuting;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">Confirm Trade Order</DialogTitle>
          <DialogDescription className="text-sm">
            Please review the details carefully before confirming.
          </DialogDescription>
        </DialogHeader>

        {/* Trade Details Summary */}
        <div className="space-y-2 py-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Asset:</span>
            <span className="font-medium">{tradeDetails.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Direction:</span>
            <Badge variant={tradeDetails.direction === 'long' ? 'default' : 'destructive'} className={clsx("text-sm", tradeDetails.direction === 'long' ? 'bg-green-600 hover:bg-green-700' : '')}>
              {tradeDetails.direction.toUpperCase()}
            </Badge>
          </div>
          {tradeDetails.isDirectionOverridden && (
            <div className="text-xs text-orange-600 text-center py-1 px-2 rounded bg-orange-100 border border-orange-200">
              Note: Direction manually overridden from suggested ({tradeDetails.suggestedDirection?.toUpperCase()}).
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Size:</span>
            <span className="font-medium">{formatNumber(tradeDetails.size, 6)} {tradeDetails.symbol.split('-')[0]}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Leverage Used:</span>
            <span className="font-medium">{formatNumber(tradeDetails.leverage, 1)}x</span>
          </div>

          <Separator className="my-3" />

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Market Price:</span>
            <span className="font-medium">{formatCurrency(tradeDetails.currentMarketPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Est. Margin Req.:</span>
            <span className="font-medium">{formatCurrency(tradeDetails.estimatedMargin)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Est. Liq. Price:</span>
            <span className="font-medium">{formatCurrency(tradeDetails.estimatedLiqPrice)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Order Type:</span>
            <span className="font-medium">Market (IOC Limit)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Limit Price Boundary:</span>
            <span className="font-medium text-xs">{tradeDetails.priceLimit}</span>
          </div>
        </div>

        {/* Display Execution Error */}
        {errorMsg && (
          <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
            <ErrorDisplay error={errorMsg} className="text-sm text-destructive" />
          </div>
        )}

        {/* Risk Warning */}
        <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TriangleAlert className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-destructive text-sm">Risk Warning</span>
          </div>
          <p className="text-xs text-destructive/90">
            Trading perpetual futures involves significant risk and can result in losses exceeding your deposit. This order will be executed as a market order.
          </p>
        </div>

        <DialogFooter className="mt-3 sm:justify-between gap-2">
          {/* Optional: Close button if needed, or rely on top-right X */}
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isExecuting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={clsx("w-full sm:w-auto", !masterSwitchEnabled && "opacity-50 cursor-not-allowed")}
          >
            {isExecuting ? (
              <><LoadingSpinner className="mr-2 h-4 w-4 border-white" /> Executing...</>
            ) : masterSwitchEnabled ? (
              "Confirm & Execute Trade"
            ) : (
              "Trading Disabled"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;