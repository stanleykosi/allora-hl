/**
 * @description
 * This library file provides utility functions for trading-related calculations,
 * such as estimating margin requirements and liquidation prices.
 *
 * @dependencies
 * - None
 *
 * @notes
 * - **Estimates Only:** The calculations provided here are simplified estimates and
 * may not perfectly match Hyperliquid's internal calculations due to factors like
 * funding rates, fees, maintenance margin ratios, and specific contract mechanics.
 * Always refer to Hyperliquid's official documentation and UI for precise figures.
 * - Leverage is typically set per-asset on Hyperliquid, not per-order. The leverage
 * parameter here is used primarily for estimation purposes based on user input.
 */

/**
 * Estimates the required margin for a trade based on price, size, and leverage.
 * **This is a simplified estimate.**
 *
 * Formula: Margin = (Position Size * Entry Price) / Leverage
 *
 * @param {number} price - The estimated entry price of the trade.
 * @param {number} size - The size of the trade (in base currency, e.g., BTC).
 * @param {number} leverage - The leverage to be used for the trade.
 * @returns {number} The estimated margin required in quote currency (e.g., USD), or 0 if inputs are invalid.
 */
export function calculateEstimatedMargin(
  price: number | null | undefined,
  size: number | null | undefined,
  leverage: number | null | undefined,
): number {
  if (
    typeof price !== "number" ||
    typeof size !== "number" ||
    typeof leverage !== "number" ||
    isNaN(price) || isNaN(size) || isNaN(leverage) ||
    price <= 0 || size <= 0 || leverage <= 0
  ) {
    return 0; // Return 0 for invalid inputs
  }

  const positionValue = size * price;
  const estimatedMargin = positionValue / leverage;

  return estimatedMargin;
}

/**
 * Estimates the liquidation price for a position.
 * **This is a simplified estimate** and does not account for fees, funding,
 * or maintenance margin requirements, which significantly affect the actual liquidation price.
 *
 * Simplified Formula (Cross Margin assumption for simplicity):
 * Liq Price (Long) ≈ Entry Price * (1 - 1 / Leverage)
 * Liq Price (Short) ≈ Entry Price * (1 + 1 / Leverage)
 *
 * For Isolated Margin, the formula is more complex involving maintenance margin fraction (MMF):
 * Liq Price (Long) ≈ Entry Price * (1 - 1/Leverage + MMF)
 * Liq Price (Short) ≈ Entry Price * (1 + 1/Leverage - MMF)
 * Since MMF varies, we use the simpler cross-margin approximation here.
 *
 * @param {number} entryPrice - The entry price of the position.
 * @param {number} leverage - The leverage used for the position.
 * @param {'long' | 'short'} direction - The direction of the position.
 * @returns {number} The estimated liquidation price, or 0 if inputs are invalid.
 */
export function calculateEstimatedLiquidationPrice(
  entryPrice: number | null | undefined,
  leverage: number | null | undefined,
  direction: "long" | "short" | null | undefined,
): number {
  if (
    typeof entryPrice !== "number" ||
    typeof leverage !== "number" ||
    !direction ||
    isNaN(entryPrice) || isNaN(leverage) ||
    entryPrice <= 0 || leverage <= 0
  ) {
    return 0; // Return 0 for invalid inputs
  }

  let estimatedLiqPrice = 0;
  const inverseLeverage = 1 / leverage;

  if (direction === "long") {
    // Simplified formula for Long liquidation
    estimatedLiqPrice = entryPrice * (1 - inverseLeverage);
  } else if (direction === "short") {
    // Simplified formula for Short liquidation
    estimatedLiqPrice = entryPrice * (1 + inverseLeverage);
  }

  // Liquidation price cannot be negative
  return Math.max(0, estimatedLiqPrice);
}

/**
 * Suggests a trade direction based on a prediction target price and the current market price.
 *
 * @param {number | null | undefined} predictionPrice - The predicted target price.
 * @param {number | null | undefined} currentPrice - The current market price.
 * @returns {'long' | 'short' | null} Suggested direction ('long' if prediction > current, 'short' if prediction < current), or null if prices are invalid or equal.
 */
export function suggestTradeDirection(
    predictionPrice: number | null | undefined,
    currentPrice: number | null | undefined,
): 'long' | 'short' | null {
    if (
        typeof predictionPrice !== 'number' || typeof currentPrice !== 'number' ||
        isNaN(predictionPrice) || isNaN(currentPrice) ||
        predictionPrice <= 0 || currentPrice <= 0
    ) {
        return null;
    }

    if (predictionPrice > currentPrice) {
        return 'long';
    } else if (predictionPrice < currentPrice) {
        return 'short';
    } else {
        return null; // Prices are equal, no clear direction
    }
}