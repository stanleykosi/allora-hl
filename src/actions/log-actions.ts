/**
 * @description Server Actions for managing Trade Log entries stored in the database.
 * These actions interact with the Prisma client to create and retrieve records from the TradeLog model.
 *
 * @dependencies
 * - @/types: Provides ActionState and TradeLogEntry types.
 * - @/lib/prisma: Provides the singleton Prisma client instance for database access.
 * - @prisma/client: For Prisma-related types and potential errors.
 */
"use server";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { ActionState, TradeLogEntry } from "@/types";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Creates a new Trade Log entry in the database.
 * This action is typically called after a trade attempt (successful or failed).
 *
 * @param {Omit<TradeLogEntry, 'id' | 'timestamp'>} data - The details of the trade to log.
 * Includes symbol, direction, size, entryPrice, status, and optionally hyperliquidOrderId and errorMessage.
 * @returns {Promise<ActionState<TradeLogEntry>>} An ActionState object containing the created log entry on success, or an error message on failure.
 */
export async function logTradeAction(
  data: Omit<TradeLogEntry, "id" | "timestamp">,
): Promise<ActionState<TradeLogEntry>> {
  console.log("Executing logTradeAction with data:", data);
  try {
    // Basic validation (more specific validation might happen before calling this action)
    if (
      !data.symbol ||
      !data.direction ||
      typeof data.size !== "number" ||
      typeof data.entryPrice !== "number" || // entryPrice might be 0 or NaN if trade failed before execution attempt
      !data.status
    ) {
      throw new Error("Missing required fields for trade log entry.");
    }

    // Sanitize optional fields to ensure they are null if undefined or empty string
    const entryData = {
        ...data,
        hyperliquidOrderId: data.hyperliquidOrderId || null,
        errorMessage: data.errorMessage || null,
    };


    const newLogEntry = await prisma.tradeLog.create({
      data: entryData,
    });

    console.log(
      `Successfully logged trade entry ID: ${newLogEntry.id} with status: ${newLogEntry.status}`,
    );
    return {
      isSuccess: true,
      message: `Trade logged successfully with status: ${newLogEntry.status}.`,
      data: newLogEntry,
    };
  } catch (error: unknown) {
    console.error("❌ Error logging trade entry:", error);
    let errorMessage = "An unknown error occurred while logging the trade.";
    let detailedError = errorMessage;

    if (error instanceof PrismaClientKnownRequestError) {
      detailedError = `Prisma error (${error.code}): ${error.message}`;
      errorMessage = "Database error occurred while logging trade.";
    } else if (error instanceof Error) {
      detailedError = error.message;
      // Keep a more generic user message unless it's our validation error
      if (!error.message.includes("Missing required fields")) {
         errorMessage = "Failed to log trade entry due to an error.";
      } else {
         errorMessage = error.message; // Use the validation error message directly
      }
    }

    return {
      isSuccess: false,
      message: errorMessage,
      error: detailedError,
    };
  }
}

/**
 * Fetches recent Trade Log entries from the database.
 *
 * @param {number} [limit=50] - The maximum number of log entries to fetch. Defaults to 50.
 * @returns {Promise<ActionState<TradeLogEntry[]>>} An ActionState object containing an array of log entries on success, or an error message on failure.
 */
export async function fetchTradeLogAction(
  limit: number = 50,
): Promise<ActionState<TradeLogEntry[]>> {
  console.log(`Executing fetchTradeLogAction with limit: ${limit}`);
  try {
    // Validate limit
    if (typeof limit !== "number" || limit <= 0 || !Number.isInteger(limit)) {
        console.warn(`Invalid limit provided: ${limit}. Using default limit of 50.`);
        limit = 50;
    }


    const logEntries = await prisma.tradeLog.findMany({
      take: limit,
      orderBy: {
        timestamp: "desc", // Fetch the most recent entries first
      },
    });

    console.log(`Successfully fetched ${logEntries.length} trade log entries.`);
    return {
      isSuccess: true,
      message: "Successfully fetched trade log entries.",
      data: logEntries,
    };
  } catch (error: unknown) {
    console.error("❌ Error fetching trade log entries:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch trade log entries: ${errorMessage}`,
      error: errorMessage,
    };
  }
}