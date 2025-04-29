/**
 * @description
 * This file defines TypeScript types related to application settings,
 * particularly those managed by the user via the UI and potentially stored locally.
 *
 * @dependencies
 * - None
 *
 * @notes
 * - The `AppSettings` interface defines the structure for settings like refresh intervals
 * and feature toggles. These will likely be managed using the `useLocalStorage` hook.
 */

/**
 * Represents the structure of application settings configurable by the user.
 * These settings control various aspects of the application's behavior,
 * such as data fetching frequency and alert preferences.
 *
 * @property {number} predictionRefreshInterval - Interval (in milliseconds) for fetching Allora predictions.
 * @property {number} accountRefreshInterval - Interval (in milliseconds) for fetching Hyperliquid account info and positions.
 * @property {boolean} alertsEnabled - Flag to enable or disable contradictory prediction alerts.
 * @property {boolean} tradeSwitchEnabled - Flag representing the state of the master trade execution switch.
 */
export interface AppSettings {
  predictionRefreshInterval: number;
  accountRefreshInterval: number;
  alertsEnabled: boolean;
  tradeSwitchEnabled: boolean;
}