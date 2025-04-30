/**
 * @description
 * This file defines TypeScript types related to the Hyperliquid API interactions.
 * It uses types imported from the `@nktkas/hyperliquid` SDK where possible
 * and defines custom types for structured data used within the application,
 * particularly for Server Action return values.
 */

import type {
  AssetPosition,
  Hex,
  OrderResponse,
  PerpsAssetCtx,
  PerpsClearinghouseState,
} from "@nktkas/hyperliquid";

/**
  * Represents the user's account information fetched from Hyperliquid ClearinghouseState.
  * Contains details about margins, positions, and overall account value.
  *
  * @alias PerpsClearinghouseState from `@nktkas/hyperliquid`
  */
export type HyperliquidAccountInfo = PerpsClearinghouseState;

/**
  * Represents a single open position for a specific asset held by the user.
  * Contains details like entry price, size, leverage, PnL, and liquidation price.
  *
  * @alias AssetPosition from `@nktkas/hyperliquid`
  */
export type HyperliquidPosition = AssetPosition;

/**
  * Represents the simplified result of placing an order via a Server Action.
  * This structure is derived from the first status entry in the SDK's `OrderResponseSuccess.response.data.statuses` array.
  * It provides the order ID, client order ID (if provided), the final status ('resting' or 'filled'),
  * and potential fill details if the status is 'filled'.
  * This structure is used within the `ActionState.data` field for order placement actions.
  *
  * @property {number} oid - The unique Order ID assigned by Hyperliquid.
  * @property {Hex | null | undefined} cloid - The Client Order ID (cloid) if it was provided during placement and returned by the API.
  * @property {'resting' | 'filled'} status - The status of the order after the placement attempt. 'resting' means the order was placed but not fully filled immediately (e.g., standard limit order or partially filled IOC). 'filled' means the order was fully filled immediately.
  * @property {string | undefined} totalSz - The total size filled (in standard units, e.g., BTC). Only present if status is 'filled'.
  * @property {string | undefined} avgPx - The average fill price. Only present if status is 'filled'.
  */
export interface HyperliquidOrderResult {
  oid: number;
  cloid?: Hex | null; // Optional Client Order ID
  status: 'resting' | 'filled';
  totalSz?: string; // Optional: Total size filled (string representation of float)
  avgPx?: string;   // Optional: Average fill price (string representation of float)
}

/**
  * Represents the context for a specific perpetual asset from Hyperliquid.
  * Includes details like mark price, funding rate, open interest, etc.
  *
  * @alias PerpsAssetCtx from `@nktkas/hyperliquid`
  */
export type HyperliquidAssetCtx = PerpsAssetCtx;

// Note: The raw response type from the SDK's walletClient.order method is `OrderResponse`.
// If successful (`status: "ok"`), the response contains `response.data.statuses`, which is an array.
// The `HyperliquidOrderResult` defined above is a *processed* type intended for use
// within the `ActionState<T>` returned by our `placeMarketOrderAction`.
// The action itself receives `OrderResponse` and maps the relevant data
// (typically from the first element of `response.data.statuses`) into `HyperliquidOrderResult`.
// Example raw status from SDK's OrderResponse['response']['data']['statuses'][number]:
// type RawOrderStatus =
//   | { resting: { oid: number; cloid?: Hex } }
//   | { filled: { totalSz: string; avgPx: string; oid: number; cloid?: Hex } }; // Note: totalSz is string int here
//   | { error: string };