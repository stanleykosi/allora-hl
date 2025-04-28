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
   * Represents the result of placing an order via a Server Action.
   * Provides a simplified structure containing the order ID, client order ID (if provided),
   * final status (resting or filled), and potential fill details.
   * This structure is typically used within the `ActionState.data` field.
   */
  export interface HyperliquidOrderResult {
    /** The unique Order ID assigned by Hyperliquid. */
    oid: number;
    /** The Client Order ID (cloid) if provided during placement. */
    cloid?: Hex | null;
    /** The status of the order after the placement attempt ('resting' or 'filled'). */
    status: 'resting' | 'filled';
    /** The total size filled (available if status is 'filled'). */
    totalSz?: string;
    /** The average fill price (available if status is 'filled'). */
    avgPx?: string;
  }
  
  /**
   * Represents the context for a specific perpetual asset from Hyperliquid.
   * Includes details like mark price, funding rate, open interest, etc.
   *
   * @alias PerpsAssetCtx from `@nktkas/hyperliquid`
   */
  export type HyperliquidAssetCtx = PerpsAssetCtx;
  
  // Note: The raw response type from the SDK's walletClient.order method is `OrderResponseSuccess`.
  // The `HyperliquidOrderResult` defined above is a *processed* type intended for use
  // within the `ActionState<T>` returned by our `placeMarketOrderAction`.
  // The action itself will receive `OrderResponseSuccess` and map the relevant data
  // (likely from the first element of `response.data.statuses`) into `HyperliquidOrderResult`.
  // Example raw status from SDK's OrderResponseSuccess['response']['data']['statuses'][number]:
  // type RawOrderStatus =
  //   | { resting: { oid: number; cloid?: Hex } }
  //   | { filled: { totalSz: string; avgPx: string; oid: number; cloid?: Hex } };
  
  