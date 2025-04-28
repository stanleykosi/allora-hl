/**
 * @description
 * This file defines TypeScript types related to the Allora API interactions,
 * specifically focusing on the structure of prediction data used within the application.
 *
 * @dependencies
 * - `@alloralabs/allora-sdk`: Interfaces like `AlloraInferenceData` from the SDK might inform this structure.
 */

import { type AlloraInferenceData } from "@alloralabs/allora-sdk";

/**
 * Represents a parsed price prediction fetched from the Allora network.
 * This interface standardizes the prediction data format used within the application.
 *
 * @property {number} topicId - The ID of the Allora topic the prediction belongs to. Parsed from `AlloraInferenceData['topic_id']`.
 * @property {number} price - The predicted price value. Parsed as a number from `AlloraInferenceData['network_inference']`.
 * @property {number} timestamp - The timestamp when the inference was generated (in milliseconds since epoch). Derived from `AlloraInferenceData['timestamp']`.
 * @property {string} timeframe - The timeframe associated with this prediction (e.g., '5m', '8h'). This is added for UI clarity and filtering.
 * @property {number[] | undefined} confidenceIntervalValues - Optional: The raw confidence interval values (parsed as numbers) if available and needed.
 * @property {string[] | undefined} confidenceIntervalPercentiles - Optional: The corresponding percentiles for the confidence interval values.
 */
export interface AlloraPrediction {
  topicId: number;
  price: number;
  timestamp: number; // Unix timestamp in milliseconds
  timeframe: string; // e.g., '5m', '8h' - added for application use
  confidenceIntervalValues?: number[];
  confidenceIntervalPercentiles?: string[];
}

// Note: The raw response from the SDK `client.getPriceInference` returns `AlloraInference`,
// which contains `inference_data: AlloraInferenceData`.
// The Server Action (`fetchAlloraPredictionsAction`) will be responsible for:
// 1. Calling `client.getPriceInference`.
// 2. Parsing `inference_data.topic_id` (string) into `topicId` (number).
// 3. Parsing `inference_data.network_inference` (string) into `price` (number).
// 4. Potentially multiplying `inference_data.timestamp` (seconds) by 1000 if needed for milliseconds.
// 5. Parsing `inference_data.confidence_interval_values` (strings) into numbers if used.
// 6. Adding the requested `timeframe` string.
// 7. Mapping this parsed data into the `AlloraPrediction` interface defined above.
