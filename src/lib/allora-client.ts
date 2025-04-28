/**
 * @description
 * This module initializes and configures the client for interacting with the Allora API.
 * It handles the secure retrieval of the API key from environment variables and sets up
 * the AlloraAPIClient from the @alloralabs/allora-sdk.
 *
 * @dependencies
 * - `@alloralabs/allora-sdk`: The official SDK for the Allora network.
 * - `process.env`: Node.js environment variables for API secrets.
 *
 * @notes
 * - The ALLORA_API_KEY is accessed only on the server-side via `process.env`.
 * - Throws an error during initialization if the required `ALLORA_API_KEY` environment variable is missing.
 * - Provides a factory function `setupAlloraClient` to get a configured client instance.
 * - Defaults to using the Allora Testnet (`ChainSlug.TESTNET`).
 */

import { AlloraAPIClient, ChainSlug } from "@alloralabs/allora-sdk";

interface AlloraClientConfig {
  apiKey: string;
  chainSlug: ChainSlug;
  baseAPIUrl?: string; // Optional, defaults in the SDK
}

/**
 * Retrieves and validates Allora configuration from environment variables.
 *
 * This function is intended to be run server-side only.
 *
 * @returns {AlloraClientConfig} The configuration object.
 * @throws {Error} If ALLORA_API_KEY is missing.
 */
function getClientConfig(): AlloraClientConfig {
  const apiKey = process.env.ALLORA_API_KEY;

  if (!apiKey) {
    console.error("❌ ALLORA_API_KEY environment variable is not set.");
    throw new Error("ALLORA_API_KEY environment variable is not set.");
  }

  // Determine chain slug (defaulting to testnet for now)
  // Potentially add an env var like ALLORA_USE_MAINNET later if needed
  const chainSlug = ChainSlug.TESTNET;

  // Optional: Allow overriding base API URL via env var if needed
  // const baseAPIUrl = process.env.ALLORA_API_ENDPOINT;

  return {
    apiKey,
    chainSlug,
    // baseAPIUrl, // Uncomment if overriding base URL
  };
}

/**
 * Sets up and returns a configured Allora API Client instance.
 * Retrieves the API key securely from environment variables.
 *
 * This function should be called within server-side code (Server Actions, API Routes).
 *
 * @returns {AlloraAPIClient} A configured instance of the AlloraAPIClient.
 * @throws {Error} If the ALLORA_API_KEY environment variable is missing.
 */
export function setupAlloraClient(): AlloraAPIClient {
  const config = getClientConfig();

  try {
    const alloraClient = new AlloraAPIClient({
      chainSlug: config.chainSlug,
      apiKey: config.apiKey,
      // baseAPIUrl: config.baseAPIUrl, // Uncomment if overriding base URL
    });
    console.log(`✅ Allora client initialized for ${config.chainSlug}`);
    return alloraClient;
  } catch (error) {
    console.error("❌ Failed to initialize Allora API Client:", error);
    throw new Error(
      `Failed to initialize Allora API Client: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

// Example usage within a Server Action (do not uncomment here):
/*
"use server";
import { setupAlloraClient } from "@/lib/allora-client";
import { PriceInferenceToken, PriceInferenceTimeframe } from "@alloralabs/allora-sdk/v2";

export async function someAlloraAction() {
  try {
    const alloraClient = setupAlloraClient();

    // Use alloraClient for fetching predictions
    const inference = await alloraClient.getPriceInference(
      PriceInferenceToken.BTC,
      PriceInferenceTimeframe.FIVE_MIN
    );
    console.log("BTC 5min Inference:", inference);

  } catch (error) {
    console.error("Error in Allora action:", error);
    // Handle or return error state
  }
}
*/
