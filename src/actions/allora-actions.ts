/**
 * @description Server Actions for interacting with the Allora API.
 * This action handles fetching price predictions for specified assets and timeframes.
 * It securely uses the Allora client setup which reads the API key from environment variables server-side.
 *
 * @dependencies
 * - @/types: Provides ActionState and Allora-specific types (AlloraPrediction).
 * - @/lib/allora-client: Provides the setupAlloraClient function to get a configured client.
 * - @alloralabs/allora-sdk: The SDK for interacting with the Allora network, specifically for fetching inferences.
 */
"use server";

import type { ActionState, AlloraPrediction } from "@/types";
import { setupAlloraClient } from "@/lib/allora-client";
import {
  PriceInferenceToken,
  PriceInferenceTimeframe,
  type AlloraInference,
  AlloraTopic,
} from "@alloralabs/allora-sdk";

// Define the supported timeframes for easy mapping and type safety
type SupportedTimeframe = "5m" | "8h";
const timeframeMap: Record<SupportedTimeframe, PriceInferenceTimeframe> = {
  "5m": PriceInferenceTimeframe.FIVE_MIN,
  "8h": PriceInferenceTimeframe.EIGHT_HOURS,
};

/**
 * Fetches Bitcoin price predictions from the Allora network for the specified timeframes.
 *
 * @param {SupportedTimeframe[]} [timeframes=['5m', '8h']] - An array of timeframes ('5m', '8h') to fetch predictions for. Defaults to ['5m', '8h'].
 * @returns {Promise<ActionState<AlloraPrediction[]>>} An ActionState object containing an array of parsed Allora predictions on success, or an error message on failure.
 */
export async function fetchAlloraPredictionsAction(
  timeframes: SupportedTimeframe[] = ["5m", "8h"],
): Promise<ActionState<AlloraPrediction[]>> {
  console.log(
    `Executing fetchAlloraPredictionsAction for timeframes: ${timeframes.join(", ")}`,
  );

  try {
    // Setup the Allora client (handles API key retrieval from env vars)
    const alloraClient = setupAlloraClient();

    // Fetch predictions for each requested timeframe concurrently
    const predictionPromises = timeframes.map(async (tf) => {
      const timeframeEnum = timeframeMap[tf];
      if (!timeframeEnum) {
        console.warn(`Unsupported timeframe requested: ${tf}`);
        return null; // Skip unsupported timeframes gracefully
      }

      console.log(`Fetching ${tf} BTC prediction from Allora...`);
      try {
        // Use the SDK to get the price inference for Bitcoin (BTC)
        const inferenceResult: AlloraInference =
          await alloraClient.getPriceInference(
            PriceInferenceToken.BTC,
            timeframeEnum,
            // Optional: Specify signature format if needed, defaults should work
            // SignatureFormat.ETHEREUM_SEPOLIA
          );

        console.log(`Raw ${tf} BTC inference data:`, inferenceResult);

        // Validate the received data structure before parsing
        if (
          !inferenceResult?.inference_data?.network_inference ||
          !inferenceResult?.inference_data?.topic_id ||
          inferenceResult?.inference_data?.timestamp == null // Check for null or undefined
        ) {
          console.error(
            `❌ Invalid or incomplete inference data received for ${tf} timeframe.`,
            inferenceResult,
          );
          throw new Error(
            `Incomplete inference data received for ${tf} timeframe.`,
          );
        }

        // Parse the raw inference data into our application's standard format
        const parsedPrediction: AlloraPrediction = {
          topicId: parseInt(inferenceResult.inference_data.topic_id, 10), // Parse topic_id string to number
          price: parseFloat(inferenceResult.inference_data.network_inference), // Parse inference string to number
          timestamp: inferenceResult.inference_data.timestamp * 1000, // Convert seconds to milliseconds
          timeframe: tf, // Add the requested timeframe string for UI use
          // Optional: Include confidence interval data if available and needed by the UI
          confidenceIntervalValues:
            inferenceResult.inference_data.confidence_interval_values?.map(
              (v) => parseFloat(v), // Parse confidence values string to number
            ),
          confidenceIntervalPercentiles:
            inferenceResult.inference_data.confidence_interval_percentiles,
        };

        // Validate parsed numbers
        if (
          isNaN(parsedPrediction.topicId) ||
          isNaN(parsedPrediction.price) ||
          isNaN(parsedPrediction.timestamp)
        ) {
          console.error(
            `❌ Failed to parse numeric values from inference data for ${tf}.`,
            inferenceResult.inference_data,
          );
          throw new Error(`Failed to parse numeric data for ${tf} timeframe.`);
        }
        if (
          parsedPrediction.confidenceIntervalValues &&
          parsedPrediction.confidenceIntervalValues.some(isNaN)
        ) {
          console.warn(
            `⚠️ Failed to parse some confidence interval values for ${tf}.`,
            inferenceResult.inference_data.confidence_interval_values,
          );
          // Decide how to handle partially failed parsing: nullify or keep partially parsed? Nullify for safety.
          parsedPrediction.confidenceIntervalValues = undefined;
          parsedPrediction.confidenceIntervalPercentiles = undefined;
        }

        console.log(`Successfully parsed ${tf} BTC prediction.`);
        return parsedPrediction;
      } catch (fetchError) {
        console.error(
          `❌ Error fetching prediction for timeframe ${tf}:`,
          fetchError,
        );
        // Re-throw to be caught by the outer Promise.all catch block
        // Attach timeframe info for better context in the final error message
        throw new Error(
          `Failed for timeframe ${tf}: ${
            fetchError instanceof Error ? fetchError.message : String(fetchError)
          }`,
        );
      }
    });

    // Wait for all prediction fetches to complete
    const results = await Promise.allSettled(predictionPromises);

    // Process results, filtering out nulls (unsupported timeframes) and gathering successful predictions
    const successfulPredictions: AlloraPrediction[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      const timeframe = timeframes[index];
      if (result.status === "fulfilled") {
        if (result.value !== null) {
          // Successfully fetched and parsed prediction
          successfulPredictions.push(result.value);
        }
        // Null values (skipped timeframes) are ignored silently
      } else {
        // An error occurred during fetch/parse for this timeframe
        console.error(
          `Promise rejected for timeframe ${timeframe}:`,
          result.reason,
        );
        // Use the error message attached in the inner catch block if available
        const errorMessage = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
        errors.push(errorMessage);
      }
    });

    // If any fetch failed, return a failure state with combined error messages
    if (errors.length > 0) {
      const combinedErrorMessage = `Failed to fetch some Allora predictions: ${errors.join("; ")}`;
      console.error("❌ fetchAlloraPredictionsAction failed:", combinedErrorMessage);
      return {
        isSuccess: false,
        message: combinedErrorMessage,
        error: combinedErrorMessage,
        // Optionally return partial data if needed, but typically safer not to
        // data: successfulPredictions.length > 0 ? successfulPredictions : undefined,
      };
    }

    // If all requested timeframes were processed successfully (or skipped)
    if (successfulPredictions.length === 0 && timeframes.length > 0) {
      // This case might happen if all requested timeframes were unsupported or failed silently before parsing
      console.warn(
        "⚠️ fetchAlloraPredictionsAction completed but yielded no predictions.",
      );
      return {
        isSuccess: false, // Consider this a failure if predictions were expected
        message: "No valid prediction data could be fetched.",
        error: "No predictions returned or parsed successfully.",
      };
    }

    console.log(
      `✅ Successfully fetched ${successfulPredictions.length} Allora predictions.`,
    );
    return {
      isSuccess: true,
      message: "Successfully fetched Allora predictions.",
      data: successfulPredictions,
    };
  } catch (error: unknown) {
    // Catch errors from setupAlloraClient or other unexpected issues
    console.error("❌ Error in fetchAlloraPredictionsAction:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch Allora predictions: ${errorMessage}`,
      error: errorMessage,
    };
  }
}