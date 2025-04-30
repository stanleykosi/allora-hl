/**
 * @description
 * Client Component: Provides the UI for staging a trade based on a selected Allora prediction.
 * Allows users to configure trade parameters (size, leverage), select templates, view estimates,
 * and initiate the trade review process via a confirmation modal.
 *
 * Key features:
 * - Displays details of the selected Allora prediction.
 * - Provides form inputs for trade size and leverage.
 * - Fetches and displays saved Trade Parameter Templates from the database.
 * - Periodically fetches the current market price for BTC.
 * - Suggests a trade direction (Long/Short) based on prediction vs. current price.
 * - Calculates and displays estimated margin requirement and liquidation price.
 * - Integrates with the master trade execution switch from settings.
 * - Enables a "Review Trade" button when inputs are valid and estimates are available.
 * - Opens the `ConfirmationModal` when "Review Trade" is clicked.
 *
 * @dependencies
 * - react: For component structure, state (`useState`, `useEffect`), and hooks.
 * - @/types: Provides type definitions (AlloraPrediction, TradeTemplate, AppSettings, ActionState).
 * - @/hooks/useLocalStorage: For accessing app settings (master trade switch).
 * - @/hooks/usePeriodicFetcher: For fetching current price periodically.
 * - @/hooks/use-toast: For displaying notifications.
 * - @/actions/template-actions: Server Action to fetch trade templates.
 * - @/actions/hyperliquid-actions: Server Action to fetch current market price.
 * - @/lib/constants: Provides default settings and constants (BTC symbol).
 * - @/lib/formatting: For formatting numbers (currency, decimals).
 * - @/lib/trading-calcs: For calculating estimated margin and liquidation price, suggesting direction.
 * - @/components/ui/*: Shadcn UI components (Card, Button, Input, Label, Select, Badge, Tooltip).
 * - @/components/ui/ConfirmationModal: The modal component for final trade confirmation.
 * - lucide-react: For icons (Info).
 *
 * @notes
 * - Leverage input is primarily for estimation; actual leverage is set per-asset on Hyperliquid.
 * - Margin and liquidation price calculations are simplified estimates.
 * - Assumes BTC is the target asset (using BTC_SYMBOL_UI and BTC_ASSET_INDEX).
 * - Error handling for template/price fetching is included.
 */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  AlloraPrediction,
  TradeTemplate,
  ActionState,
  AppSettings,
} from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePeriodicFetcher } from "@/hooks/usePeriodicFetcher";
import { useToast } from "@/hooks/use-toast";
import { getTemplatesAction } from "@/actions/template-actions";
import { fetchCurrentPriceAction } from "@/actions/hyperliquid-actions";
import { DEFAULT_APP_SETTINGS, BTC_SYMBOL_UI } from "@/lib/constants";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/formatting";
import {
  calculateEstimatedMargin,
  calculateEstimatedLiquidationPrice,
  suggestTradeDirection,
} from "@/lib/trading-calcs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Import the ConfirmationModal and its props type
import ConfirmationModal, { TradeConfirmationDetails } from "@/components/ui/ConfirmationModal";
// Import the ApiStatusIndicator
import ApiStatusIndicator from "@/components/ui/ApiStatusIndicator";

interface TradePanelProps {
  selectedPrediction: AlloraPrediction | null;
}

type TradeDirection = "long" | "short";

const TradePanel: React.FC<TradePanelProps> = ({ selectedPrediction }) => {
  const { toast } = useToast();
  const [settings] = useLocalStorage<AppSettings>(
    "alloraHyperliquidApp_settings",
    DEFAULT_APP_SETTINGS,
  );

  // Form State
  const [tradeSize, setTradeSize] = useState<string>(""); // Size in base currency (e.g., BTC)
  const [leverage, setLeverage] = useState<string>("10"); // Default leverage
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [direction, setDirection] = useState<TradeDirection | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalDetails, setModalDetails] = useState<TradeConfirmationDetails | null>(null);

  // Price State
  const {
    data: priceData,
    isLoading: isLoadingPrice,
    error: priceError,
  } = usePeriodicFetcher(
    fetchCurrentPriceAction, // Fetches BTC price by default
    settings.accountRefreshInterval, // Use account refresh interval for price
    null, // No initial price needed from server prop
  );
  const currentPrice = useMemo(() => {
    return priceData?.price ? parseFloat(priceData.price) : null;
  }, [priceData]);

  // Estimate State
  const [estimatedMargin, setEstimatedMargin] = useState<number | null>(null);
  const [estimatedLiqPrice, setEstimatedLiqPrice] = useState<number | null>(
    null,
  );

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      setTemplateError(null);
      try {
        const result = await getTemplatesAction();
        if (result.isSuccess) {
          setTemplates(result.data);
        } else {
          setTemplateError(result.message);
          toast({
            title: "Error Loading Templates",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error loading templates.";
        setTemplateError(message);
        toast({
          title: "Error Loading Templates",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [toast]);

  // Effect to update suggested direction when prediction or price changes
  useEffect(() => {
    if (selectedPrediction && currentPrice) {
      const suggestedDir = suggestTradeDirection(selectedPrediction.price, currentPrice);
      setDirection(suggestedDir); // Allow user to override later if needed
    } else {
      setDirection(null); // Reset if prediction or price is missing
    }
  }, [selectedPrediction, currentPrice]);

  // Effect to recalculate estimates when inputs change
  useEffect(() => {
    const sizeNum = parseFloat(tradeSize);
    const leverageNum = parseFloat(leverage);

    if (currentPrice && sizeNum > 0 && leverageNum > 0 && direction) {
      const margin = calculateEstimatedMargin(currentPrice, sizeNum, leverageNum);
      const liqPrice = calculateEstimatedLiquidationPrice(currentPrice, leverageNum, direction);
      setEstimatedMargin(margin);
      setEstimatedLiqPrice(liqPrice);
    } else {
      setEstimatedMargin(null);
      setEstimatedLiqPrice(null);
    }
  }, [tradeSize, leverage, currentPrice, direction]);

  // Handler for template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "none") {
      setTradeSize("");
      setLeverage("10"); // Reset to default leverage
      return;
    }
    const selected = templates.find((t) => t.id === templateId);
    if (selected) {
      setTradeSize(String(selected.size));
      setLeverage(String(selected.leverage));
    }
  };

  // Validation for enabling the review button
  const isReviewEnabled = useMemo(() => {
    const sizeNum = parseFloat(tradeSize);
    const leverageNum = parseFloat(leverage);
    return (
      selectedPrediction !== null &&
      sizeNum > 0 &&
      leverageNum > 0 &&
      !isLoadingPrice &&
      currentPrice !== null &&
      direction !== null &&
      estimatedMargin !== null &&
      estimatedLiqPrice !== null &&
      settings.tradeSwitchEnabled // Master switch must be ON
    );
  }, [
    selectedPrediction,
    tradeSize,
    leverage,
    isLoadingPrice,
    currentPrice,
    direction,
    estimatedMargin,
    estimatedLiqPrice,
    settings.tradeSwitchEnabled,
  ]);

  const handleReviewTrade = () => {
    if (!isReviewEnabled) return;

    const sizeNum = parseFloat(tradeSize);
    const leverageNum = parseFloat(leverage);

    // Basic check to ensure required values are present
    if (!selectedPrediction || !currentPrice || !direction || estimatedMargin === null || estimatedLiqPrice === null) {
      toast({ title: "Error", description: "Missing required trade details.", variant: "destructive" });
      return;
    }

    // Calculate a wide price limit for the market order (e.g., +/- 10%)
    // This ensures the IOC order executes as a market order
    const slippagePercent = 0.10; // 10%
    const priceLimit = direction === 'long'
      ? formatNumber(currentPrice * (1 + slippagePercent), 2) // Use formatNumber for consistent string representation
      : formatNumber(currentPrice * (1 - slippagePercent), 2);

    const details: TradeConfirmationDetails = {
      symbol: BTC_SYMBOL_UI,
      // predictionPrice: selectedPrediction.price, // Not strictly needed by modal, but good for logging
      currentMarketPrice: currentPrice,
      direction,
      size: sizeNum,
      leverage: leverageNum, // Leverage used for estimation
      estimatedMargin,
      estimatedLiqPrice,
      priceLimit: priceLimit, // Pass calculated string limit
    };

    console.log("Opening confirmation modal with details:", details);
    setModalDetails(details); // Set details for the modal
    setIsModalOpen(true); // Open the modal
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trade Panel</CardTitle>
          <CardDescription>
            Configure and execute trades based on selected predictions.
          </CardDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            {!settings.tradeSwitchEnabled && (
              <Badge variant="destructive">Trading Disabled (Enable in Settings)</Badge>
            )}
            <ApiStatusIndicator />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Prediction Display */}
          <div className="p-3 border rounded-md bg-muted/50 min-h-[70px]"> {/* Added min-height */}
            <Label className="text-sm font-medium text-muted-foreground">Selected Prediction</Label>
            {selectedPrediction ? (
              <div className="mt-1 text-sm">
                <p>
                  <span className="font-semibold">Target:</span>{" "}
                  {formatCurrency(selectedPrediction.price)}{" "}
                  <Badge variant="outline">{selectedPrediction.timeframe}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Received: {formatDateTime(selectedPrediction.timestamp)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-1">
                No prediction selected. Click one from the feed.
              </p>
            )}
          </div>

          {/* Current Price Display */}
          <div className="min-h-[20px]"> {/* Added min-height */}
            {isLoadingPrice && !currentPrice && <LoadingSpinner size={16} />}
            {priceError && <ErrorDisplay error={`Price Error: ${priceError}`} className="text-xs p-1" />}
            {currentPrice !== null && (
              <p className="text-sm">
                <span className="font-medium">Current {BTC_SYMBOL_UI.split('-')[0]} Price:</span>{" "}
                {formatCurrency(currentPrice)}
              </p>
            )}
          </div>


          {/* Suggested Direction */}
          <div className="min-h-[20px]"> {/* Added min-height */}
            {direction && (
              <p className="text-sm">
                <span className="font-medium">Suggested Direction:</span>{" "}
                <Badge variant={direction === 'long' ? 'default' : 'destructive'} className={direction === 'long' ? 'bg-green-600 hover:bg-green-700' : ''}>
                  {direction.toUpperCase()}
                </Badge>
              </p>
            )}
          </div>

          {/* Trade Configuration Form */}
          <div className="space-y-4 pt-4 border-t">
            {/* Template Selector */}
            <div className="space-y-1">
              <Label htmlFor="template">Trade Template (Optional)</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateChange}
                disabled={isLoadingTemplates || templates.length === 0 || !selectedPrediction} // Disable if no prediction
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder={isLoadingTemplates ? "Loading..." : "Select a template"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} (Size: {formatNumber(template.size, 4)}, Lev: {formatNumber(template.leverage, 1)}x)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateError && <ErrorDisplay error={`Template Error: ${templateError}`} className="text-xs p-1 mt-1" />}
            </div>

            {/* Trade Size Input */}
            <div className="space-y-1">
              <Label htmlFor="size">Size ({BTC_SYMBOL_UI.split('-')[0]})</Label>
              <Input
                id="size"
                type="number"
                placeholder="e.g., 0.01"
                value={tradeSize}
                onChange={(e) => setTradeSize(e.target.value)}
                min="0"
                step="any"
                disabled={!selectedPrediction || !currentPrice} // Disable if no prediction or price
              />
            </div>

            {/* Leverage Input */}
            <div className="space-y-1">
              <Label htmlFor="leverage">Leverage (for estimation)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="leverage"
                  type="number"
                  placeholder="e.g., 10"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  min="1" // Minimum leverage is typically 1
                  step="any"
                  disabled={!selectedPrediction || !currentPrice} // Disable if no prediction or price
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">Leverage is set per-asset on Hyperliquid. This value is used for margin and liquidation price *estimation* only. Ensure your desired leverage is set correctly on the exchange itself.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

            </div>

            {/* Estimates Display */}
            <div className="min-h-[80px]"> {/* Added min-height */}
              {(estimatedMargin !== null || estimatedLiqPrice !== null) && (
                <div className="space-y-1 text-sm border-t pt-4 text-muted-foreground">
                  <h4 className="font-medium text-foreground mb-1">Estimates:</h4>
                  <div className="flex justify-between">
                    <span>Required Margin:</span>
                    <span className="font-medium text-foreground">{estimatedMargin !== null ? formatCurrency(estimatedMargin) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidation Price:</span>
                    <span className="font-medium text-foreground">{estimatedLiqPrice !== null ? formatCurrency(estimatedLiqPrice) : "N/A"}</span>
                  </div>
                  <p className="text-xs italic text-center mt-1">Estimates are approximate and do not include fees or funding.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleReviewTrade}
            disabled={!isReviewEnabled}
            aria-disabled={!isReviewEnabled}
          >
            {settings.tradeSwitchEnabled ? "Review Trade" : "Trading Disabled"}
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        tradeDetails={modalDetails}
        masterSwitchEnabled={settings.tradeSwitchEnabled}
      />
    </>
  );
};

export default TradePanel;