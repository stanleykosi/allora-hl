/**
 * @description
 * Helper functions to process Hyperliquid position data correctly across testnet and mainnet
 */

"use server";

import { setupClients } from "@/lib/hyperliquid-client";
import type { HyperliquidPosition, ActionState } from "@/types";

/**
 * Helper function to fetch and correctly map positions from Hyperliquid
 * This function handles differences between mainnet and testnet position structures
 * 
 * @returns {Promise<ActionState<HyperliquidPosition[]>>} An ActionState object containing the user's mapped positions
 */
export async function fetchAndMapPositions(): Promise<ActionState<HyperliquidPosition[]>> {
  try {
    const { publicClient, config } = setupClients();

    // Ensure the account is available
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

    // Fetch clearinghouse state which contains positions
    try {
      const clearinghouseState = await publicClient.clearinghouseState({
        user: userAddress,
      });

      // Extract asset positions from clearinghouse state
      const positions = clearinghouseState.assetPositions || [];

      console.log(`Found ${positions.length} positions`);

      // Check if there are any positions with non-zero size
      const nonZeroPositions = positions.filter(p => p && p.position && parseFloat(p.position.szi || "0") !== 0);
      console.log(`Found ${nonZeroPositions.length} positions with non-zero size`);

      return {
        isSuccess: true,
        message: "Successfully fetched Hyperliquid positions.",
        data: positions,
      };
    } catch (clearingError) {
      console.error("Error fetching clearinghouse state:", clearingError);

      // Specific error for clearinghouse state fetch failure
      return {
        isSuccess: false,
        message: `Failed to fetch clearinghouse state: ${clearingError instanceof Error ? clearingError.message : "Unknown error"}`,
        error: "API connection error. Please check your credentials.",
      };
    }
  } catch (error: unknown) {
    console.error("❌ Error fetching and mapping Hyperliquid positions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch and map Hyperliquid positions: ${errorMessage}`,
      error: errorMessage,
    };
  }
} 