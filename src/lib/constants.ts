/**
 * @description
 * This file defines application-wide constants.
 * Centralizing constants here improves maintainability and consistency.
 *
 * @notes
 * - Includes default refresh intervals for periodic data fetching.
 * - Can be expanded later to include other constants like API URLs (if not env-specific),
 * default trade parameters, asset identifiers (e.g., Hyperliquid BTC asset index), etc.
 */

// Default refresh intervals (in milliseconds)
/** Default interval for fetching Allora predictions (e.g., 60 seconds). */
export const DEFAULT_PREDICTION_INTERVAL = 60000;
/** Default interval for fetching Hyperliquid account info and positions (e.g., 30 seconds). */
export const DEFAULT_ACCOUNT_INTERVAL = 30000;

// Default Application Settings
/** Default values for AppSettings, used by useLocalStorage hook if no settings are found. */
export const DEFAULT_APP_SETTINGS = {
  predictionRefreshInterval: DEFAULT_PREDICTION_INTERVAL,
  accountRefreshInterval: DEFAULT_ACCOUNT_INTERVAL,
  alertsEnabled: true, // Default alerts to enabled
  tradeSwitchEnabled: false, // Default master trade switch to disabled for safety
};

// Asset Constants (Example - Needs confirmation)
/** Hyperliquid Asset Index for BTC perpetuals (Needs confirmation from Hyperliquid API/Meta). */
export const BTC_ASSET_INDEX = 0; // Assuming BTC is index 0, CONFIRM THIS
/** Symbol for Bitcoin perpetuals used in UI and potentially logging. */
export const BTC_SYMBOL_UI = "BTC-PERP";

// Add other constants as needed...