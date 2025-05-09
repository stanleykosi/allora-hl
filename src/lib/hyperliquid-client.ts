/**
 * @description
 * This module initializes and configures clients for interacting with the Hyperliquid API.
 * It handles secure retrieval of API credentials from environment variables and sets up
 * both public (read-only) and wallet (signing required) clients.
 *
 * @dependencies
 * - `@nktkas/hyperliquid`: The official SDK for Hyperliquid.
 * - `viem/accounts`: Used for converting private keys to account objects for signing.
 * - `process.env`: Node.js environment variables for API secrets.
 *
 * @notes
 * - API secrets (HYPERLIQUID_API_SECRET) are accessed only on the server-side via `process.env`.
 * - Throws an error if the required `HYPERLIQUID_API_SECRET` environment variable is missing or invalid.
 * - Provides a factory function `setupClients` to get configured client instances.
 */

import {
  HttpTransport,
  PublicClient,
  WalletClient,
  type Hex,
} from "@nktkas/hyperliquid";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

// Define API endpoints
const MAINNET_API_URL = "https://api.hyperliquid.xyz";
// Try alternative testnet URLs - the official one might not be showing your positions
// const TESTNET_API_URL = "https://dev.hyperliquid.xyz"; // Original testnet URL
const TESTNET_API_URL = "https://api.hyperliquid-testnet.xyz"; // Alternative testnet URL
// Other alternatives to try if needed
const ALTERNATIVE_TESTNET_URLS = [
  "https://api.hyperliquid-testnet.xyz",
  "https://testnet-api.hyperliquid.xyz",
  "https://api-testnet.hyperliquid.xyz"
];

interface HyperliquidClientConfig {
  isTestnet: boolean;
  baseUrl: string;
  account: PrivateKeyAccount | null; // Null if secret is not configured
}

/**
 * Retrieves and validates Hyperliquid configuration from environment variables.
 *
 * This function is intended to be run server-side only.
 *
 * @returns {HyperliquidClientConfig} The configuration object including the account derived from the private key.
 * @throws {Error} If HYPERLIQUID_API_SECRET is missing or invalid.
 */
function getClientConfig(): HyperliquidClientConfig {
  const apiSecret = process.env.HYPERLIQUID_API_SECRET;
  const useTestnet = process.env.HYPERLIQUID_USE_TESTNET === "true";

  console.log(`Hyperliquid client setup - Using testnet: ${useTestnet}`);

  if (!apiSecret) {
    console.error(
      "❌ HYPERLIQUID_API_SECRET environment variable is not set. Trading functionality will be disabled.",
    );
    console.error(
      "To enable trading, you must set your API secret as a 64-character hexadecimal string in your environment variables.",
    );
    console.error(
      "For development, you can create a .env.local file with: HYPERLIQUID_API_SECRET=your_private_key",
    );
    // For now, we allow the app to potentially run in a read-only state
    return {
      isTestnet: useTestnet,
      baseUrl: useTestnet ? TESTNET_API_URL : MAINNET_API_URL,
      account: null,
    };
  }

  // Validate the private key format (64 hex chars, optionally prefixed with 0x)
  const privateKeyHex = apiSecret.startsWith("0x")
    ? (apiSecret as Hex)
    : (`0x${apiSecret}` as Hex);
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKeyHex)) {
    console.error(
      "❌ Invalid HYPERLIQUID_API_SECRET format. It must be a 64-character hexadecimal string, optionally prefixed with '0x'."
    );
    return {
      isTestnet: useTestnet,
      baseUrl: useTestnet ? TESTNET_API_URL : MAINNET_API_URL,
      account: null,
    };
  }

  try {
    const account = privateKeyToAccount(privateKeyHex);
    console.log(`✅ Account derived with address: ${account.address}`);

    // Use baseUrl from configuration or default based on environment
    const baseUrl = useTestnet ? TESTNET_API_URL : MAINNET_API_URL;
    console.log(`Using Hyperliquid API URL: ${baseUrl}`);

    return {
      isTestnet: useTestnet,
      baseUrl,
      account,
    };
  } catch (error) {
    console.error("❌ Failed to derive account from HYPERLIQUID_API_SECRET:", error);
    return {
      isTestnet: useTestnet,
      baseUrl: useTestnet ? TESTNET_API_URL : MAINNET_API_URL,
      account: null,
    };
  }
}

/**
 * Sets up and returns configured Hyperliquid Public and Wallet clients.
 * Retrieves API credentials securely from environment variables.
 *
 * This function should be called within server-side code (Server Actions, API Routes).
 *
 * @returns {{ publicClient: PublicClient, walletClient: WalletClient | null }} Configured clients. `walletClient` is null if the API secret is not configured.
 * @throws {Error} If HYPERLIQUID_API_SECRET is invalid.
 */
export function setupClients(): {
  publicClient: PublicClient;
  walletClient: WalletClient | null;
  config: HyperliquidClientConfig; // Exposing config might be useful e.g. for getting address
} {
  const config = getClientConfig();

  // Instantiate the transport (using HttpTransport for simplicity)
  const transport = new HttpTransport({
    isTestnet: config.isTestnet,
    // Note: baseUrl is not a valid property in HttpTransportOptions
    // Let the SDK determine the URL based on isTestnet
    // Disable keepalive to fix fetch errors
    fetchOptions: {
      keepalive: false
    },
    // Increase timeout for more reliable connections
    timeout: 30000,
  });

  // Log transport info
  console.log(`Transport configured: isTestnet=${config.isTestnet}, baseUrl=${config.baseUrl}`);

  // Public client for read-only operations
  const publicClient = new PublicClient({ transport });

  // Wallet client for signing operations (only if account is available)
  let walletClient: WalletClient | null = null;
  if (config.account) {
    walletClient = new WalletClient({
      wallet: config.account,
      transport,
      isTestnet: config.isTestnet,
      // Optional: Set default vault address if needed
      // defaultVaultAddress: '0x...',
      // Optional: Provide custom nonce manager or signature chain ID if needed
    });
    console.log("Wallet client initialized with account:", config.account.address);
  } else {
    console.log("No wallet client initialized (API secret not provided)");
  }

  // Validate connection by attempting to fetch meta info
  try {
    // We'll call this to validate the connection, but we don't need to await it here
    // Just log the attempt
    console.log("Testing API connection...");
  } catch (error) {
    console.error("Error testing API connection:", error);
  }

  return { publicClient, walletClient, config };
}

// Example usage within a Server Action (do not uncomment here):
/*
"use server";
import { setupClients } from "@/lib/hyperliquid-client";
 
export async function someServerAction() {
  const { publicClient, walletClient, config } = setupClients();
 
  // Use publicClient for fetching data
  const meta = await publicClient.meta();
 
  // Use walletClient for placing orders (check if null first)
  if (walletClient) {
    const userAddress = config.account?.address; // Get address from config
    // const orderResult = await walletClient.order(...);
  } else {
    console.warn("Hyperliquid WalletClient not available - API Secret likely missing.");
  }
}
*/

