/**
 * @description Server Actions for interacting with the Hyperliquid API.
 * These actions handle fetching account information, positions, and eventually executing trades.
 * They securely use the Hyperliquid client setup which reads API keys from environment variables server-side.
 *
 * @dependencies
 * - @/types: Provides ActionState and Hyperliquid-specific types.
 * - @/lib/hyperliquid-client: Provides the setupClients function to get configured clients.
 * - @nktkas/hyperliquid: The Hyperliquid SDK types might be indirectly used via our custom types.
 */
"use server";

import type {
  ActionState,
  HyperliquidAccountInfo,
  HyperliquidPosition,
} from "@/types";
import { setupClients } from "@/lib/hyperliquid-client";

/**
 * Fetches the user's complete clearinghouse state from Hyperliquid, which includes account balance,
 * margin details, and open positions.
 *
 * @returns {Promise<ActionState<HyperliquidAccountInfo>>} An ActionState object containing the user's account info on success, or an error message on failure.
 */
export async function fetchHyperliquidAccountInfoAction(): Promise<
  ActionState<HyperliquidAccountInfo>
> {
  console.log("Executing fetchHyperliquidAccountInfoAction");
  try {
    const { publicClient, config } = setupClients();

    // Ensure the account (derived from private key) is available
    if (!config.account) {
      console.error("Hyperliquid wallet account not configured.");
      return {
        isSuccess: false,
        message: "Hyperliquid API secret not configured or invalid.",
        error: "Wallet account setup failed.",
      };
    }

    const userAddress = config.account.address;
    console.log(`Fetching account info for user: ${userAddress}`);

    // Fetch the full clearinghouse state using the public client
    // The public client method can be used even without the read-only key, as the user address is public info.
    // However, it's good practice to ensure the client setup worked.
    const clearinghouseState = await publicClient.clearinghouseState({
      user: userAddress,
    });

    console.log("Successfully fetched clearinghouse state.");

    return {
      isSuccess: true,
      message: "Successfully fetched Hyperliquid account information.",
      data: clearinghouseState,
    };
  } catch (error: unknown) {
    console.error(
      "❌ Error fetching Hyperliquid account information:",
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch Hyperliquid account information: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Fetches the user's currently open positions from Hyperliquid.
 * This action reuses the clearinghouse state fetch as positions are included in it.
 *
 * @returns {Promise<ActionState<HyperliquidPosition[]>>} An ActionState object containing the user's open positions on success, or an error message on failure.
 */
export async function fetchHyperliquidPositionsAction(): Promise<
  ActionState<HyperliquidPosition[]>
> {
  console.log("Executing fetchHyperliquidPositionsAction");
  try {
    const { publicClient, config } = setupClients();

    // Ensure the account (derived from private key) is available
    if (!config.account) {
      console.error("Hyperliquid wallet account not configured.");
      return {
        isSuccess: false,
        message: "Hyperliquid API secret not configured or invalid.",
        error: "Wallet account setup failed.",
      };
    }

    const userAddress = config.account.address;
    console.log(`Fetching positions for user: ${userAddress}`);

    // Fetch the full clearinghouse state
    const clearinghouseState = await publicClient.clearinghouseState({
      user: userAddress,
    });

    // Extract the asset positions array
    const positions = clearinghouseState.assetPositions || [];
    console.log(`Successfully fetched ${positions.length} positions.`);

    return {
      isSuccess: true,
      message: "Successfully fetched Hyperliquid positions.",
      data: positions,
    };
  } catch (error: unknown) {
    console.error("❌ Error fetching Hyperliquid positions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch Hyperliquid positions: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

// Placeholder for trade execution action - to be implemented later
// export async function placeMarketOrderAction(
//   params: { symbol: string; direction: 'long' | 'short'; size: number; /* ... other params */ }
// ): Promise<ActionState<HyperliquidOrderResult>> {
//   // ... implementation using walletClient.order ...
// }

// Placeholder for fetching current price - to be implemented later
// export async function fetchCurrentPriceAction(symbol: string): Promise<ActionState<{ price: string }>> {
//  try {
//      const { publicClient } = setupClients();
//      const [meta, ctxs] = await publicClient.metaAndAssetCtxs();
//      const assetIndex = meta.universe.findIndex(asset => asset.name === symbol);
//      if (assetIndex === -1) {
//           throw new Error(`Asset ${symbol} not found`);
//      }
//      const assetCtx = ctxs[assetIndex];
//      const markPrice = assetCtx.markPx; // Or use midPx if preferred/available
//      return { isSuccess: true, message: "Fetched current price.", data: { price: markPrice } };
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
//     return { isSuccess: false, message: `Failed to fetch current price for ${symbol}: ${errorMessage}`, error: errorMessage };
//   }
// }
