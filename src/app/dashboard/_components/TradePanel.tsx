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
 * - Includes API status indicator for trade readiness.
 * - Improved layout and styling for clarity and responsiveness.
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
 * - @/components/ui/ApiStatusIndicator: Component to show API configuration status.
 * - lucide-react: For icons (Info).
 *
 * @notes
 * - Leverage input is primarily for estimation; actual leverage is set per-asset on Hyperliquid.
 * - Margin and liquidation price calculations are simplified estimates.
 * - Assumes BTC is the target asset (using BTC_SYMBOL_UI and BTC_ASSET_INDEX).
 * - Error handling for template/price fetching is included.
 * - Added `ApiStatusIndicator` to show if trading API is configured.
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
import { Info, Target, CalendarClock } from "lucide-react";
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

  // Add lastValidPrice state to persist price between refreshes
  const [lastValidPrice, setLastValidPrice] = useState<number | null>(null);

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

  // Use lastValidPrice as fallback when current price is temporarily unavailable
  const currentPrice = useMemo(() => {
    const price = priceData?.price ? parseFloat(priceData.price) : null;
    // If we get a valid price, update our lastValidPrice
    if (price !== null && !isNaN(price)) {
      setLastValidPrice(price);
      return price;
    }
    // Otherwise return the last valid price we had
    return lastValidPrice;
  }, [priceData, lastValidPrice]);

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
    }
    // Only reset direction if we have no prediction - keep last direction during price updates
    else if (!selectedPrediction) {
      setDirection(null);
    }
  }, [selectedPrediction, currentPrice]);

  // Effect to recalculate estimates when inputs change
  useEffect(() => {
    const sizeNum = parseFloat(tradeSize);
    const leverageNum = parseFloat(leverage);
    const priceToUse = currentPrice ?? lastValidPrice; // Use current or fallback to last valid

    if (priceToUse && sizeNum > 0 && leverageNum > 0 && direction) {
      const margin = calculateEstimatedMargin(priceToUse, sizeNum, leverageNum);
      const liqPrice = calculateEstimatedLiquidationPrice(priceToUse, leverageNum, direction);
      setEstimatedMargin(margin);
      setEstimatedLiqPrice(liqPrice);
    } else {
      // Reset estimates if core inputs are invalid or price is unavailable
      setEstimatedMargin(null);
      setEstimatedLiqPrice(null);
    }
  }, [tradeSize, leverage, currentPrice, lastValidPrice, direction]);


  // Handler for template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "none") {
      // Optionally reset fields, or keep them if user might want to modify template values
      // setTradeSize("");
      // setLeverage("10"); // Reset to default leverage
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
    const priceAvailable = currentPrice !== null || lastValidPrice !== null;

    const conditions = {
      selectedPrediction: selectedPrediction !== null,
      sizeValid: sizeNum > 0,
      leverageValid: leverageNum > 0,
      priceAvailable,
      hasDirection: direction !== null,
      hasEstimatedMargin: estimatedMargin !== null,
      hasEstimatedLiqPrice: estimatedLiqPrice !== null,
      tradeSwitchEnabled: settings.tradeSwitchEnabled
    };

    // Log if disabled for easier debugging
    if (!Object.values(conditions).every(Boolean)) {
      console.debug("Review button disabled because:",
        Object.entries(conditions)
          .filter(([_, value]) => !value)
          .map(([key]) => key)
      );
    }

    return Object.values(conditions).every(Boolean);
  }, [
    selectedPrediction,
    tradeSize,
    leverage,
    currentPrice,
    lastValidPrice,
    direction,
    estimatedMargin,
    estimatedLiqPrice,
    settings.tradeSwitchEnabled,
  ]);

  const handleReviewTrade = () => {
    if (!isReviewEnabled) return;

    const sizeNum = parseFloat(tradeSize);
    let leverageNum = parseFloat(leverage);
    const priceToUse = currentPrice ?? lastValidPrice; // Use best available price

    // This should not happen if isReviewEnabled is true, but double-check
    if (!selectedPrediction || !priceToUse || !direction || estimatedMargin === null || estimatedLiqPrice === null) {
      toast({ title: "Error", description: "Missing required trade details. Please ensure a prediction is selected and inputs are valid.", variant: "destructive" });
      console.error("handleReviewTrade called with invalid state despite isReviewEnabled being true. State:", { selectedPrediction, priceToUse, direction, estimatedMargin, estimatedLiqPrice });
      return;
    }


    // Cap leverage if necessary
    if (leverageNum > 40) {
      leverageNum = 40;
      setLeverage("40"); // Update state for consistency
      toast({
        title: "Leverage Limit Applied",
        description: "Hyperliquid supports up to 40x leverage for BTC. Leverage capped at 40x.",
        variant: "destructive",
        duration: 5000,
      });
    }

    // Check minimum order value ($10)
    const orderValue = sizeNum * priceToUse;
    if (orderValue < 10) {
      toast({
        title: "Order Value Too Small",
        description: `Minimum order value is $10. Current estimated value: ${formatCurrency(orderValue)}. Please increase size.`,
        variant: "destructive",
      });
      return;
    }

    const suggestedDir = suggestTradeDirection(selectedPrediction.price, priceToUse);
    const isDirectionOverridden = suggestedDir !== direction;

    // Calculate a wide price limit for the market order (e.g., +/- 10%)
    const slippagePercent = 0.10; // 10%
    let rawPriceLimit = direction === 'long'
      ? priceToUse * (1 + slippagePercent) // Higher price for buys
      : priceToUse * (1 - slippagePercent); // Lower price for sells

    const TICK_SIZE = 0.5; // Assuming BTC tick size
    rawPriceLimit = Math.round(rawPriceLimit / TICK_SIZE) * TICK_SIZE;
    rawPriceLimit = Math.round(rawPriceLimit * 10) / 10; // Ensure one decimal

    // Final validation & correction
    if ((rawPriceLimit * 10) % 5 !== 0) {
      const correctedPrice = Math.round(rawPriceLimit / TICK_SIZE) * TICK_SIZE;
      rawPriceLimit = Math.round(correctedPrice * 10) / 10;
      console.warn(`Price limit emergency correction applied: ${rawPriceLimit}`);
    }

    const priceString = rawPriceLimit.toFixed(1);
    const finalPriceLimitValue = parseFloat(priceString); // Use the corrected, formatted value
    const formattedPriceLimit = '$' + finalPriceLimitValue.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const details: TradeConfirmationDetails = {
      symbol: BTC_SYMBOL_UI,
      currentMarketPrice: priceToUse,
      direction,
      size: sizeNum,
      leverage: leverageNum,
      estimatedMargin,
      estimatedLiqPrice,
      priceLimit: formattedPriceLimit,
      priceLimitValue: finalPriceLimitValue,
      isDirectionOverridden: isDirectionOverridden,
      suggestedDirection: suggestedDir || undefined
    };

    console.log("Opening confirmation modal with details:", details);
    setModalDetails(details);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="h-auto"> {/* Change from flex flex-col h-full to h-auto */}
        <CardHeader>
          <CardTitle>Trade Panel</CardTitle>
          <CardDescription>
            Configure and execute trades based on selected predictions.
          </CardDescription>
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {!settings.tradeSwitchEnabled && (
              <Badge variant="destructive" className="text-xs">Trading Disabled (Enable in Settings)</Badge>
            )}
            <ApiStatusIndicator />
          </div>
        </CardHeader>

        {/* Content Area */}
        <CardContent className="space-y-4"> {/* Remove flex-grow class */}
          {/* Selected Prediction Display */}
          <div className="p-3 rounded-xl ring-[3px] ring-inset ring-border bg-background min-h-[80px] flex flex-col justify-center overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <Target size={14} className="text-primary flex-shrink-0" />
                <Badge variant="secondary" className="text-xs font-medium">
                  {selectedPrediction ? `${selectedPrediction.timeframe} Target` : 'No Prediction'}
                </Badge>
              </div>
              {selectedPrediction && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarClock size={12} />
                  {formatDateTime(selectedPrediction.timestamp, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })}
                </span>
              )}
            </div>
            {selectedPrediction ? (
              <div className="text-sm">
                <span className="font-semibold text-lg text-foreground">
                  {formatCurrency(selectedPrediction.price, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Select a prediction from the feed.
              </p>
            )}
          </div>

          {/* Current Price Display */}
          <div className="min-h-[24px] flex items-center"> {/* Ensure consistent height */}
            {isLoadingPrice && !currentPrice && <LoadingSpinner size={16} />}
            {priceError && !isLoadingPrice && <ErrorDisplay error={`Price Error: ${priceError}`} className="text-xs p-1 text-destructive" />}
            {currentPrice !== null && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Market Price ({BTC_SYMBOL_UI.split('-')[0]}):</span>{' '}
                {formatCurrency(currentPrice)}
                {priceError && <span className="text-destructive ml-1">(Stale)</span>}
              </p>
            )}
            {!isLoadingPrice && currentPrice === null && !priceError && (
              <p className="text-sm text-muted-foreground">Fetching price...</p>
            )}
          </div>

          {/* Trade Configuration Form */}
          <div className="space-y-4 pt-4 border-t">
            {/* Suggested Direction & Override */}
            <div className="min-h-[40px]"> {/* Ensure consistent height */}
              {selectedPrediction && currentPrice && direction && (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Direction:</span>{" "}
                    <Badge variant={direction === 'long' ? 'default' : 'destructive'} className={`${direction === 'long' ? 'bg-green-600 hover:bg-green-700' : ''} text-white`}>
                      {direction.toUpperCase()}
                    </Badge>
                    {suggestTradeDirection(selectedPrediction.price, currentPrice) !== direction &&
                      <span className="text-xs text-orange-600 ml-2">(Overridden)</span>
                    }
                  </p>
                  {/* Add direction override buttons */}
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-muted-foreground">Override:</Label>
                    <Button variant={direction === 'long' ? 'default' : 'outline'} className={`${direction === 'long' ? 'bg-green-600 hover:bg-green-700' : ''} h-6 px-2 text-xs`} onClick={() => setDirection('long')}>LONG</Button>
                    <Button variant={direction === 'short' ? 'destructive' : 'outline'} className="h-6 px-2 text-xs" onClick={() => setDirection('short')}>SHORT</Button>
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent><p className="text-xs max-w-xs">Manually select trade direction.</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>

            {/* Template Selector */}
            <div className="space-y-1">
              <Label htmlFor="template">Trade Template <span className="text-muted-foreground">(Optional)</span></Label>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateChange}
                disabled={isLoadingTemplates || !selectedPrediction} // Disable if no prediction
              >
                <SelectTrigger id="template" disabled={isLoadingTemplates || templates.length === 0 || !selectedPrediction}>
                  <SelectValue placeholder={isLoadingTemplates ? "Loading..." : (templates.length === 0 ? "No templates found" : "Select template")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Manual Input)</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} (Size: {formatNumber(template.size, 4)}, Lev: {formatNumber(template.leverage, 1)}x)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateError && <ErrorDisplay error={`Template Error: ${templateError}`} className="text-xs p-1 mt-1 text-destructive" />}
            </div>

            {/* Trade Size Input */}
            <div className="space-y-1">
              <Label htmlFor="size">Size ({BTC_SYMBOL_UI.split('-')[0]})</Label>
              <Input
                id="size"
                type="number"
                placeholder="e.g., 0.1"
                value={tradeSize}
                onChange={(e) => setTradeSize(e.target.value)}
                min="0.00011" // Rough minimum based on $10 value
                step="any" // Allow any decimal input initially
                disabled={!selectedPrediction}
                className={parseFloat(tradeSize) <= 0 && tradeSize !== '' ? "border-destructive" : ""}
              />
              {/* Display approximate USD value */}
              {currentPrice && parseFloat(tradeSize) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Approx. Value: {formatCurrency(currentPrice * parseFloat(tradeSize))} (Min $10)
                </p>
              )}
              {!(currentPrice && parseFloat(tradeSize) > 0) && (
                <p className="text-xs text-muted-foreground mt-1">Minimum order value: $10</p>
              )}
            </div>

            {/* Leverage Input */}
            <div className="space-y-1">
              <Label htmlFor="leverage">Leverage <span className="text-muted-foreground">(for estimation)</span></Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="leverage"
                  type="number"
                  placeholder="e.g., 10"
                  value={leverage}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 40) setLeverage("40");
                    else if (!isNaN(numValue) && numValue < 1) setLeverage("1");
                    else setLeverage(value);
                  }}
                  min="1"
                  max="40"
                  step="any"
                  disabled={!selectedPrediction}
                  className={(parseFloat(leverage) <= 0 || parseFloat(leverage) > 40) && leverage !== '' ? "border-destructive" : ""}
                />
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" /></TooltipTrigger>
                    <TooltipContent><p className="text-xs max-w-xs">Hyperliquid sets leverage per-asset (Max 40x for BTC). This value is used for estimates.</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {(parseFloat(leverage) <= 0 || parseFloat(leverage) > 40) && leverage !== '' && (
                <p className="text-xs text-destructive mt-1">Leverage must be between 1 and 40.</p>
              )}
            </div>

            {/* Estimates Display */}
            <div className="min-h-[70px] flex flex-col justify-center"> {/* Reduced from 80px to 70px */}
              {(estimatedMargin !== null || estimatedLiqPrice !== null) && (
                <div className="space-y-1 text-sm border-t pt-3 text-muted-foreground">
                  <h4 className="font-medium text-foreground text-xs uppercase tracking-wider mb-1">Estimates:</h4>
                  <div className="flex justify-between">
                    <span>Required Margin:</span>
                    <span className="font-medium text-foreground">{estimatedMargin !== null ? formatCurrency(estimatedMargin) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidation Price:</span>
                    <span className="font-medium text-foreground">{estimatedLiqPrice !== null ? formatCurrency(estimatedLiqPrice) : "N/A"}</span>
                  </div>
                  <p className="text-xs italic text-center mt-1">Approximate values, excluding fees/funding.</p>
                </div>
              )}
              {!estimatedMargin && !estimatedLiqPrice && parseFloat(tradeSize) > 0 && parseFloat(leverage) > 0 && direction && currentPrice !== null && (
                <p className="text-xs text-muted-foreground text-center pt-4">Calculating estimates...</p>
              )}
            </div>
          </div>
        </CardContent>

        {/* Footer with Action Button */}
        <CardFooter className="border-t pt-4">
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