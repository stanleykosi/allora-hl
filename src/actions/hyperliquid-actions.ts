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

// Dynamic mapping for asset indices, will be populated after first API call
let assetIndices: { [key: string]: number } = {};

/**
 * Gets the asset index for a given asset name
 * Useful for handling differences between testnet and mainnet
 */
async function getAssetIndex(assetName: string = "BTC"): Promise<number> {
  // Return from cache if available
  if (Object.keys(assetIndices).length > 0 && assetIndices[assetName] !== undefined) {
    return assetIndices[assetName];
  }

  try {
    // Fetch metadata to build the mapping
    const { publicClient } = setupClients();
    const [meta, _] = await publicClient.metaAndAssetCtxs();

    // Build the mapping
    meta.universe.forEach((asset, index) => {
      assetIndices[asset.name] = index;
    });

    console.log("Asset indices mapping:", assetIndices);

    // Return the requested asset index or default to BTC_ASSET_INDEX
    return assetIndices[assetName] !== undefined ? assetIndices[assetName] : BTC_ASSET_INDEX;
  } catch (error) {
    console.error("Error building asset indices mapping:", error);
    return BTC_ASSET_INDEX;
  }
}

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
 * Uses a specialized helper function to correctly handle position data
 * differences between testnet and mainnet.
 *
 * @returns {Promise<ActionState<HyperliquidPosition[]>>} An ActionState object containing the user's open positions on success, or an error message on failure.
 */
export async function fetchHyperliquidPositionsAction(): Promise<
  ActionState<HyperliquidPosition[]>
> {
  console.log("Executing fetchHyperliquidPositionsAction");

  try {
    // Import the helper dynamically to avoid circular dependencies
    const { fetchAndMapPositions } = await import('./hyperliquid-positions-helper');

    // Use the helper function which handles testnet/mainnet differences
    const result = await fetchAndMapPositions();

    // Return the result directly
    return result;
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
 * @param {string} [assetName="BTC"] - The name of the asset to fetch price for, used for dynamic index lookup.
 * @returns {Promise<ActionState<{ price: string; assetIndex: number }>>} An ActionState object containing the mark price string on success, or an error message on failure.
 */
export async function fetchCurrentPriceAction(
  assetIndex: number = BTC_ASSET_INDEX,
  assetName: string = "BTC"
): Promise<ActionState<{ price: string; assetIndex: number }>> {
  console.log(`Executing fetchCurrentPriceAction for asset index: ${assetIndex}, name: ${assetName}`);
  try {
    // Get the dynamic asset index based on the environment (testnet/mainnet)
    const dynamicAssetIndex = await getAssetIndex(assetName);
    // Use the provided index if specified, otherwise use the dynamic one
    const finalAssetIndex = assetIndex !== BTC_ASSET_INDEX ? assetIndex : dynamicAssetIndex;

    console.log(`Using dynamic asset index: ${finalAssetIndex} for ${assetName}`);

    const { publicClient } = setupClients();

    // Fetch metadata and asset contexts
    const [meta, assetCtxs] = await publicClient.metaAndAssetCtxs();

    // Log all available assets and their indices for debugging
    console.log("Available assets:", meta.universe.map((asset, index) => ({
      index,
      name: asset.name
    })));

    // Find the correct asset index by name first
    let targetIndex = finalAssetIndex;
    const assetByName = meta.universe.findIndex(asset => asset.name === assetName);

    if (assetByName !== -1) {
      console.log(`Found asset ${assetName} at index ${assetByName}`);
      targetIndex = assetByName;
    } else {
      console.log(`Asset ${assetName} not found by name, using index ${targetIndex}`);
    }

    // Find the context for the requested asset index
    if (targetIndex < 0 || targetIndex >= assetCtxs.length) {
      console.error(`Invalid asset index requested: ${targetIndex}`);
      throw new Error(`Asset index ${targetIndex} out of bounds.`);
    }

    const assetCtx: HyperliquidAssetCtx | undefined = assetCtxs[targetIndex];

    if (!assetCtx) {
      console.error(`No asset context found for index: ${targetIndex}`);
      throw new Error(`Asset context not found for index ${targetIndex}.`);
    }

    // Extract the mark price
    const markPrice = assetCtx.markPx;
    console.log(`Successfully fetched mark price for asset ${targetIndex}: ${markPrice}`);

    return {
      isSuccess: true,
      message: `Successfully fetched current mark price for asset ${assetName} (index ${targetIndex}).`,
      data: { price: markPrice, assetIndex: targetIndex },
    };
  } catch (error: unknown) {
    console.error(
      `❌ Error fetching current price for asset ${assetName}:`,
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch current price for asset ${assetName}: ${errorMessage}`,
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