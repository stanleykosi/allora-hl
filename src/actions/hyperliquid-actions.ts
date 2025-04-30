/**
 * @description Server Actions for interacting with the Hyperliquid API.
 * These actions handle fetching account information, positions, asset context (price), and eventually executing trades.
 * They securely use the Hyperliquid client setup which reads API keys from environment variables server-side.
 *
 * @dependencies
 * - @/types: Provides ActionState and Hyperliquid-specific types.
 * - @/lib/hyperliquid-client: Provides the setupClients function to get configured clients.
 * - @/lib/constants: Provides constants like BTC_ASSET_INDEX.
 * - @nktkas/hyperliquid: The Hyperliquid SDK for API interaction and types.
 * - viem: Provides utilities like `parseUnits` for formatting numbers to the required precision.
 */
"use server";

import type {
  ActionState,
  HyperliquidAccountInfo,
  HyperliquidAssetCtx,
  HyperliquidOrderResult,
  HyperliquidPosition,
} from "@/types";
import { setupClients } from "@/lib/hyperliquid-client";
import { BTC_ASSET_INDEX, BTC_SYMBOL_UI } from "@/lib/constants";
import { parseUnits, formatUnits } from "viem";

// Define our own types to replace the ones not exported by the library
type Hex = `0x${string}`;

/**
 * Represents an order request structure for the Hyperliquid API
 */
interface OrderRequest {
  action: {
    type: "order";
    orders: Array<{
      a: number; // Asset index
      b: boolean; // Buy/Sell flag (true for buy)
      p: string; // Price 
      s: string; // Size
      r: boolean; // Reduce-only flag
      t: {
        limit: {
          tif: "Ioc" | "Gtc" | "Alo"
        }
      } | {
        trigger: {
          isMarket: boolean,
          triggerPx: string,
          tpsl: "tp" | "sl"
        }
      };
      c?: Hex; // Optional client order ID
    }>;
    grouping: "na" | "normalTpsl" | "positionTpsl";
    builder?: {
      b: Hex; // builder address must be a Hex string
      f: number; // fee in tenths of a basis point
    };
  };
}

/**
 * Success response from a Hyperliquid order
 */
interface OrderResponseSuccess {
  status: "ok";
  response: {
    type: "order";
    data: {
      statuses: Array<{
        resting?: {
          oid: number;
          cloid?: Hex;
        };
        filled?: {
          totalSz: string;
          avgPx: string;
          oid: number;
          cloid?: Hex;
        };
        error?: string;
      }>;
    };
  };
}

/**
 * General response interface
 */
interface OrderResponse {
  status: string;
  response: any;
}

// Define the number of decimals used for sizing assets on Hyperliquid (e.g., BTC usually has 8)
// This should match the `szDecimals` for the specific asset from the `meta` endpoint.
// We'll fetch this dynamically later, but use a default for now.
const DEFAULT_ASSET_SIZE_DECIMALS = 8;
const DEFAULT_ASSET_PRICE_DECIMALS = 5; // Typical for USD price quotes

// Dynamic mapping for asset indices and decimals, will be populated after first API call
let assetDetails: { [key: string]: { index: number; szDecimals: number } } = {};

/**
 * Gets the asset index and size decimals for a given asset name.
 * Caches the details after the first fetch.
 * Useful for handling differences between testnet and mainnet and various assets.
 */
async function getAssetDetails(
  assetName: string = "BTC",
): Promise<{ index: number; szDecimals: number }> {
  // Return from cache if available
  if (
    Object.keys(assetDetails).length > 0 &&
    assetDetails[assetName] !== undefined
  ) {
    return assetDetails[assetName];
  }

  try {
    // Fetch metadata to build the mapping
    console.log("Fetching asset metadata to get index and decimals...");
    const { publicClient } = setupClients();
    const [meta, _] = await publicClient.metaAndAssetCtxs();

    // Build the mapping
    meta.universe.forEach((asset, index) => {
      assetDetails[asset.name] = { index, szDecimals: asset.szDecimals };
    });

    console.log("Asset details mapping built:", assetDetails);

    // Return the requested asset index or default to BTC details if not found
    const details = assetDetails[assetName];
    if (!details) {
      console.warn(`Asset ${assetName} not found in metadata, using default BTC details.`);
      return { index: BTC_ASSET_INDEX, szDecimals: DEFAULT_ASSET_SIZE_DECIMALS };
    }
    return details;
  } catch (error) {
    console.error("Error building asset details mapping:", error);
    // Fallback to default BTC details on error
    return { index: BTC_ASSET_INDEX, szDecimals: DEFAULT_ASSET_SIZE_DECIMALS };
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

    // Log the structure of the clearinghouse state for debugging
    console.log("Clearinghouse state structure:", {
      withdrawable: clearinghouseState.withdrawable,
      marginSummary: clearinghouseState.marginSummary,
      accountValue: clearinghouseState.marginSummary?.accountValue,
      totalMarginUsed: clearinghouseState.marginSummary?.totalMarginUsed,
      fullStructure: JSON.stringify(clearinghouseState, null, 2)
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
    // Import the helper dynamically to avoid circular dependencies if needed
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
 * @param {string} [assetName="BTC"] - The name of the asset to fetch price for (e.g., "BTC", "ETH").
 * @returns {Promise<ActionState<{ price: string; assetIndex: number }>>} An ActionState object containing the mark price string and asset index on success, or an error message on failure.
 */
export async function fetchCurrentPriceAction(
  assetName: string = "BTC",
): Promise<ActionState<{ price: string; assetIndex: number }>> {
  console.log(`Executing fetchCurrentPriceAction for asset: ${assetName}`);
  try {
    // Get the dynamic asset index based on the environment (testnet/mainnet)
    const details = await getAssetDetails(assetName);
    const finalAssetIndex = details.index;

    console.log(`Using asset index: ${finalAssetIndex} for ${assetName}`);

    const { publicClient } = setupClients();

    // Fetch metadata and asset contexts
    const [meta, assetCtxs] = await publicClient.metaAndAssetCtxs();

    // Log all available assets and their indices for debugging
    console.log("Available assets in meta:", meta.universe.map((asset, index) => ({
      index,
      name: asset.name
    })));

    // Find the context for the requested asset index
    if (finalAssetIndex < 0 || finalAssetIndex >= assetCtxs.length) {
      console.error(`Invalid asset index determined or used: ${finalAssetIndex}`);
      const validNames = meta.universe.map(a => a.name).join(", ");
      throw new Error(`Asset index ${finalAssetIndex} out of bounds. Valid assets: ${validNames}`);
    }

    const assetCtx: HyperliquidAssetCtx | undefined = assetCtxs[finalAssetIndex];

    if (!assetCtx) {
      console.error(`No asset context found for index: ${finalAssetIndex}`);
      throw new Error(`Asset context not found for index ${finalAssetIndex}.`);
    }

    // Extract the mark price
    const markPrice = assetCtx.markPx;
    console.log(`Successfully fetched mark price for asset ${assetName} (index ${finalAssetIndex}): ${markPrice}`);

    return {
      isSuccess: true,
      message: `Successfully fetched current mark price for asset ${assetName} (index ${finalAssetIndex}).`,
      data: { price: markPrice, assetIndex: finalAssetIndex },
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

// Add a simple log trade function to record trade outcomes
async function logTradeAction(params: {
  symbol: string;
  direction: 'long' | 'short';
  size: number;
  entryPrice: number;
  status: string;
  hyperliquidOrderId: string;
  errorMessage?: string;
}): Promise<void> {
  // Just log to console for now - could be expanded to record to database
  console.log('Trade logged:', params);
  // This function could be replaced with a proper implementation later
}

/**
 * Places a market order on Hyperliquid for a specified asset.
 * Uses an Immediate-or-Cancel (IOC) limit order with a wide price tolerance to simulate a market order.
 *
 * @param {object} params - Parameters for the market order.
 * @param {string} params.assetName - The symbol/name of the asset to trade (e.g., "BTC").
 * @param {boolean} params.isBuy - True for a buy (long) order, false for a sell (short) order.
 * @param {number} params.size - The size of the order in the base asset units (e.g., BTC amount).
 * @param {number} params.slippage Bps - The allowed slippage percentage (e.g., 0.05 for 5% slippage) to set the limit price boundary. Default 1000 Bps (10%)
 * @param {string | null} [params.cloid] - Optional Client Order ID (must be a 16-byte hex string if provided).
 * @returns {Promise<ActionState<HyperliquidOrderResult>>} An ActionState object containing the simplified order result on success, or an error message on failure.
 */
export async function placeMarketOrderAction(params: {
  assetName: string;
  isBuy: boolean;
  size: number;
  slippageBps?: number; // Added slippage parameter
  cloid?: Hex | null;
}): Promise<ActionState<HyperliquidOrderResult>> {
  const { assetName, isBuy, size, slippageBps = 1000, cloid } = params; // Default slippage 10%
  console.log(`Executing placeMarketOrderAction for ${assetName}: ${isBuy ? "BUY" : "SELL"} ${size}`);

  try {
    const { walletClient, config } = setupClients();

    // Ensure wallet client is available (API secret must be configured)
    if (!walletClient || !config.account) {
      console.error("Hyperliquid WalletClient not configured. API Secret is required for trading.");
      return {
        isSuccess: false,
        message: "Hyperliquid WalletClient not configured. Check API secret.",
        error: "Wallet client setup failed.",
      };
    }

    // Get dynamic asset details (index and decimals)
    const assetDetails = await getAssetDetails(assetName);
    const assetIndex = assetDetails.index;
    const szDecimals = assetDetails.szDecimals;
    console.log(`Using asset index ${assetIndex} with ${szDecimals} size decimals for ${assetName}`);

    // Fetch the current price to set the limit boundary
    const priceActionResult = await fetchCurrentPriceAction(assetName);
    if (!priceActionResult.isSuccess || !priceActionResult.data?.price) {
      console.error("Failed to fetch current price before placing market order:", priceActionResult.message);
      return {
        isSuccess: false,
        message: `Failed to fetch current price for ${assetName}: ${priceActionResult.message}`,
        error: priceActionResult.error ?? "Price fetch failed.",
      };
    }
    const currentPrice = parseFloat(priceActionResult.data.price);

    // Calculate price limit based on slippage
    const slippageFactor = (slippageBps ?? 1000) / 10000; // Convert Bps to decimal
    const limitPx = isBuy
      ? currentPrice * (1 + slippageFactor)
      : currentPrice * (1 - slippageFactor);
    // Format price to appropriate decimals (assuming 5 for USD pairs)
    const formattedLimitPx = limitPx.toFixed(DEFAULT_ASSET_PRICE_DECIMALS);

    // Format size according to asset's szDecimals using BigInt
    const sizeInSmallestUnit = parseUnits(size.toString(), szDecimals);
    const formattedSize = sizeInSmallestUnit.toString(); // The SDK expects the size as a string representing the integer in the smallest unit

    console.log(`Formatted Order Details: AssetIndex=${assetIndex}, IsBuy=${isBuy}, Size=${formattedSize} (smallest units), LimitPx=${formattedLimitPx} (Slippage: ${slippageBps} Bps)`);

    // Construct the order payload for an IOC limit order (simulating market)
    const order: OrderRequest["action"]["orders"][0] = {
      a: assetIndex, // Asset index
      b: isBuy,      // Buy/Sell flag
      p: formattedLimitPx, // Limit price boundary
      s: formattedSize,    // Size in smallest units as string
      r: false,       // Reduce-only flag (false for opening/increasing)
      t: { limit: { tif: "Ioc" } }, // Order type: Limit, Time-in-force: Immediate-or-Cancel
    };

    // Add cloid if provided and valid
    if (cloid) {
      if (/^0x[a-fA-F0-9]{32}$/.test(cloid)) {
        order.c = cloid;
      } else {
        console.warn(`Provided cloid "${cloid}" is invalid. It must be a 16-byte hex string (0x...). Ignoring cloid.`);
      }
    }

    const orderPayload: OrderRequest["action"] = {
      type: "order",
      orders: [order],
      grouping: "na", // No grouping needed for single market order
    };

    console.log("Sending order to Hyperliquid:", JSON.stringify(orderPayload, null, 2));

    // Place the order using the wallet client
    const orderResponse = await walletClient.order(orderPayload); // Pass payload directly

    console.log("Hyperliquid Order Response:", JSON.stringify(orderResponse, null, 2));

    // Process the response - expecting OrderResponseSuccess type on success
    const statusData = (orderResponse as OrderResponseSuccess).response.data.statuses[0]; // Assuming single order placement

    let resultData: HyperliquidOrderResult;

    if (statusData && "resting" in statusData && statusData.resting) {
      // Order is resting (partially filled or not filled by IOC) - treat as potentially failed market order
      const oid = statusData.resting.oid;
      console.warn(`Market order for ${size} ${assetName} resulted in a resting order (oid: ${oid}). IOC might not have filled fully.`);
      resultData = {
        oid: oid,
        cloid: statusData.resting.cloid,
        status: 'resting', // Indicate it didn't fill fully as expected
      };
      // Log this specific outcome for potential debugging
      await logTradeAction({
        symbol: assetName,
        direction: isBuy ? 'long' : 'short',
        size: size,
        entryPrice: 0, // Or parse from potential partial fill if available
        status: 'resting_ioc', // Custom status
        hyperliquidOrderId: oid.toString(),
        errorMessage: 'IOC order did not fill immediately.',
      });
    } else if (statusData && "filled" in statusData && statusData.filled) {
      // Order filled successfully
      const filledData = statusData.filled;
      console.log(`Market order filled: oid=${filledData.oid}, avgPx=${filledData.avgPx}, totalSz=${filledData.totalSz}`);
      resultData = {
        oid: filledData.oid,
        cloid: filledData.cloid,
        status: 'filled',
        totalSz: formatUnits(BigInt(filledData.totalSz), szDecimals), // Convert back to standard units
        avgPx: filledData.avgPx,
      };
    } else {
      // Should not happen if validation worked, but handle defensively
      console.error("Unexpected order status structure in response:", statusData);
      throw new Error("Unexpected order status structure received from API.");
    }

    return {
      isSuccess: true,
      message: `Market order ${resultData.status === 'filled' ? 'filled' : 'placed (IOC, potentially partial/no fill)'} successfully for ${assetName}.`,
      data: resultData,
    };

  } catch (error: unknown) {
    console.error(`❌ Error placing market order for ${assetName}:`, error);
    let errorMessage = "Failed to place market order.";
    let errorDetails = errorMessage;

    // Check for specific Hyperliquid API errors if possible (depends on SDK error structure)
    if (error instanceof Error) {
      errorDetails = error.message;
      if (error.message.includes("Insufficient margin") || error.message.includes("insufficient collateral")) {
        errorMessage = "Insufficient margin to place the order.";
      } else if (error.message.includes("abs_value") || error.message.includes("too small")) {
        errorMessage = "Order size is too small.";
      } else if (error.message.includes("leverage is too high")) {
        errorMessage = "Leverage limit exceeded.";
      } else if (error.message.includes("Request timed out")) {
        errorMessage = "Request timed out. Please try again.";
      }
      // Add more specific error mappings based on observed API responses
    }

    return {
      isSuccess: false,
      message: errorMessage,
      error: errorDetails,
    };
  }
}