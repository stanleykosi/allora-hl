/**
 * @description Server Actions for interacting with the Hyperliquid API.
 * These actions handle fetching account information, positions, asset context (price), and eventually executing trades.
 * They securely use the Hyperliquid client setup which reads API keys from environment variables server-side.
 *
 * @dependencies
 * - @/types: Provides ActionState and Hyperliquid-specific types.
 * - @/lib/hyperliquid-client: Provides the setupClients function to get configured clients.
 * - @/lib/constants: Provides constants like BTC_ASSET_INDEX.
 * - @nktkas/hyperliquid: The Hyperliquid SDK types might be indirectly used via our custom types.
 */
"use server";

import type {
  ActionState,
  HyperliquidAccountInfo,
  HyperliquidAssetCtx,
  HyperliquidPosition,
} from "@/types";
import { setupClients } from "@/lib/hyperliquid-client";
import { BTC_ASSET_INDEX } from "@/lib/constants"; // Assuming BTC asset index is defined here

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

/**
 * Fetches the current mark price for a specific asset from Hyperliquid.
 *
 * @param {number} [assetIndex=BTC_ASSET_INDEX] - The index of the asset to fetch the price for. Defaults to BTC.
 * @returns {Promise<ActionState<{ price: string; assetIndex: number }>>} An ActionState object containing the mark price string on success, or an error message on failure.
 */
export async function fetchCurrentPriceAction(
  assetIndex: number = BTC_ASSET_INDEX,
): Promise<ActionState<{ price: string; assetIndex: number }>> {
  console.log(`Executing fetchCurrentPriceAction for asset index: ${assetIndex}`);
  try {
    const { publicClient } = setupClients();

    // Fetch metadata and asset contexts
    const [meta, assetCtxs] = await publicClient.metaAndAssetCtxs();

    // Find the context for the requested asset index
    if (assetIndex < 0 || assetIndex >= assetCtxs.length) {
      console.error(`Invalid asset index requested: ${assetIndex}`);
      throw new Error(`Asset index ${assetIndex} out of bounds.`);
    }
    const assetCtx: HyperliquidAssetCtx | undefined = assetCtxs[assetIndex];

    if (!assetCtx) {
      console.error(`No asset context found for index: ${assetIndex}`);
      throw new Error(`Asset context not found for index ${assetIndex}.`);
    }

    // Extract the mark price
    const markPrice = assetCtx.markPx;
    console.log(`Successfully fetched mark price for asset ${assetIndex}: ${markPrice}`);

    return {
      isSuccess: true,
      message: `Successfully fetched current mark price for asset ${assetIndex}.`,
      data: { price: markPrice, assetIndex },
    };
  } catch (error: unknown) {
    console.error(
      `❌ Error fetching current price for asset index ${assetIndex}:`,
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch current price for asset ${assetIndex}: ${errorMessage}`,
      error: errorMessage,
    };
  }
}


// Placeholder for trade execution action - to be implemented later
// export async function placeMarketOrderAction(
//   params: { assetIndex: number; isBuy: boolean; size: number; priceLimit: string; /* maybe cloid? */ }
// ): Promise<ActionState<HyperliquidOrderResult>> {
//   // ... implementation using walletClient.order ...
// }