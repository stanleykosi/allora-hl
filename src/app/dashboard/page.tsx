/**
 * @description
 * The main page component for the dashboard route (`/dashboard`).
 * This async Server Component is responsible for fetching the initial data required
 * for the dashboard (account info, positions, predictions, trade logs) using Server Actions.
 * It then passes this initial data down to the `DashboardClientContent` client component for rendering and dynamic updates.
 *
 * @dependencies
 * - React: For component structure.
 * - @/actions/hyperliquid-actions: Server Actions for fetching Hyperliquid account info and positions.
 * - @/actions/allora-actions: Server Action for fetching Allora predictions.
 * - @/actions/log-actions: Server Action for fetching trade logs.
 * - @/app/dashboard/_components/DashboardClientContent: The client component that renders the dashboard UI.
 * - @/types: Type definitions for API responses and ActionState.
 *
 * @notes
 * - Uses `Promise.allSettled` to fetch initial data concurrently. This allows the page to load even if some initial fetches fail.
 * - Extracts data or error messages from the ActionState results and passes them as props.
 * - Renders `DashboardClientContent` with the initial data.
 */
import React from "react";
import {
  fetchHyperliquidAccountInfoAction,
  fetchHyperliquidPositionsAction,
} from "@/actions/hyperliquid-actions";
import { fetchAlloraPredictionsAction } from "@/actions/allora-actions";
import { fetchTradeLogAction } from "@/actions/log-actions";
import DashboardClientContent from "@/app/dashboard/_components/DashboardClientContent";
import type {
  HyperliquidAccountInfo,
  HyperliquidPosition,
  AlloraPrediction,
  TradeLogEntry,
} from "@/types";
import { Metadata } from "next";

/**
 * Renders the main dashboard page.
 * Fetches initial data required for the dashboard display server-side.
 * @returns {Promise<JSX.Element>} A promise resolving to the rendered dashboard page component.
 */
export default async function DashboardPage() {
  console.log("Fetching initial data for DashboardPage...");

  // Fetch initial data concurrently using Promise.allSettled
  const [
    accountInfoResult,
    positionsResult,
    predictionsResult,
    logsResult,
  ] = await Promise.allSettled([
    fetchHyperliquidAccountInfoAction(),
    fetchHyperliquidPositionsAction(),
    fetchAlloraPredictionsAction(),
    fetchTradeLogAction(),
  ]);

  // Helper function to extract data or null from settled promises
  function getDataOrNull<T>(
    result: PromiseSettledResult<{ isSuccess: boolean; data?: T; message?: string }>,
  ): T | null {
    return result.status === "fulfilled" && result.value.isSuccess
      ? (result.value.data as T)
      : null;
  }

  // Helper function to extract error message or null
  const getErrorOrNull = (
    result: PromiseSettledResult<{ isSuccess: boolean; message?: string; error?: string }>,
  ): string | null => {
    if (result.status === "rejected") {
      return result.reason instanceof Error
        ? result.reason.message
        : "Unknown error during fetch.";
    }
    if (!result.value.isSuccess) {
      return result.value.message || result.value.error || "Failed to fetch data.";
    }
    return null;
  };

  // Extract initial data and errors
  const initialAccountInfo = getDataOrNull<HyperliquidAccountInfo>(accountInfoResult);
  const initialAccountError = getErrorOrNull(accountInfoResult);

  const initialPositions = getDataOrNull<HyperliquidPosition[]>(positionsResult);
  const initialPositionsError = getErrorOrNull(positionsResult);

  const initialPredictions = getDataOrNull<AlloraPrediction[]>(predictionsResult);
  const initialPredictionsError = getErrorOrNull(predictionsResult);

  const initialLogs = getDataOrNull<TradeLogEntry[]>(logsResult);
  const initialLogsError = getErrorOrNull(logsResult);

  console.log("Initial data fetch complete.");
  console.log("Account Info:", initialAccountInfo ? "OK" : `Error: ${initialAccountError}`);
  console.log("Positions:", initialPositions ? "OK" : `Error: ${initialPositionsError}`);
  console.log("Predictions:", initialPredictions ? "OK" : `Error: ${initialPredictionsError}`);
  console.log("Logs:", initialLogs ? "OK" : `Error: ${initialLogsError}`);

  return (
    <DashboardClientContent
      initialAccountInfo={initialAccountInfo}
      initialAccountError={initialAccountError}
      initialPositions={initialPositions}
      initialPositionsError={initialPositionsError}
      initialPredictions={initialPredictions}
      initialPredictionsError={initialPredictionsError}
      initialLogs={initialLogs}
      initialLogsError={initialLogsError}
    />
  );
}