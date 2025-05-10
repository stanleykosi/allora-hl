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
  const startTime = Date.now();
  console.log("[TradeLog] Starting to log trade with data:", JSON.stringify(data, null, 2));

  try {
    // Test database connection first
    try {
      await prisma.$connect();
      console.log("[TradeLog] Database connection successful");
    } catch (connError) {
      console.error("[TradeLog] Database connection failed:", connError);
      throw new Error(`Database connection failed: ${connError instanceof Error ? connError.message : 'Unknown error'}`);
    }

    // Basic validation
    if (
      !data.symbol ||
      !data.direction ||
      typeof data.size !== "number" ||
      typeof data.entryPrice !== "number" ||
      !data.status
    ) {
      console.error("[TradeLog] Validation failed:", {
        symbol: data.symbol,
        direction: data.direction,
        size: data.size,
        entryPrice: data.entryPrice,
        status: data.status
      });
      throw new Error("Missing required fields for trade log entry.");
    }

    // Sanitize optional fields
    const entryData = {
      ...data,
      hyperliquidOrderId: data.hyperliquidOrderId || null,
      errorMessage: data.errorMessage || null,
    };

    console.log("[TradeLog] Attempting to create entry with data:", JSON.stringify(entryData, null, 2));

    const newLogEntry = await prisma.tradeLog.create({
      data: entryData,
    });

    const logTime = Date.now() - startTime;
    console.log(
      `[TradeLog] Successfully created entry in ${logTime}ms:`,
      JSON.stringify({
        id: newLogEntry.id,
        timestamp: new Date(newLogEntry.timestamp).toISOString(),
        symbol: newLogEntry.symbol,
        direction: newLogEntry.direction,
        status: newLogEntry.status,
        hyperliquidOrderId: newLogEntry.hyperliquidOrderId,
        errorMessage: newLogEntry.errorMessage
      }, null, 2)
    );

    return {
      isSuccess: true,
      message: `Trade logged successfully with status: ${newLogEntry.status}.`,
      data: newLogEntry,
    };
  } catch (error: unknown) {
    const logTime = Date.now() - startTime;
    console.error(`[TradeLog] Failed to create entry after ${logTime}ms:`, error);

    let errorMessage = "An unknown error occurred while logging the trade.";
    let detailedError = errorMessage;

    if (error instanceof PrismaClientKnownRequestError) {
      detailedError = `Prisma error (${error.code}): ${error.message}`;
      errorMessage = "Database error occurred while logging trade.";
      console.error("[TradeLog] Prisma error details:", {
        code: error.code,
        message: error.message,
        meta: error.meta
      });
    } else if (error instanceof Error) {
      detailedError = error.message;
      if (!error.message.includes("Missing required fields")) {
        errorMessage = "Failed to log trade entry due to an error.";
      } else {
        errorMessage = error.message;
      }
      console.error("[TradeLog] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    return {
      isSuccess: false,
      message: errorMessage,
      error: detailedError,
    };
  } finally {
    try {
      await prisma.$disconnect();
      console.log("[TradeLog] Database connection closed");
    } catch (disconnError) {
      console.error("[TradeLog] Error closing database connection:", disconnError);
    }
  }
}

/**
 * Fetches recent Trade Log entries from the database.
 *
 * @param {number} [limit=50] - The maximum number of log entries to fetch. Defaults to 50.
 * @param {number} [timestamp] - Optional timestamp to help invalidate cache between requests.
 * @returns {Promise<ActionState<TradeLogEntry[]>>} An ActionState object containing an array of log entries on success, or an error message on failure.
 */
export async function fetchTradeLogAction(
  limit: number = 50,
  timestamp?: number, // Optional timestamp to force fresh fetch
): Promise<ActionState<TradeLogEntry[]>> {
  const startTime = Date.now();
  console.log(`[TradeLog] Starting fetch at ${new Date().toISOString()}`);

  try {
    // Validate limit
    if (typeof limit !== "number" || limit <= 0 || !Number.isInteger(limit)) {
      console.warn(`Invalid limit provided: ${limit}. Using default limit of 50.`);
      limit = 50;
    }

    // Log server time to help debug timezone issues
    console.log(`[TradeLog] Server time before DB query: ${new Date().toISOString()}`);

    const logEntries = await prisma.tradeLog.findMany({
      take: limit,
      orderBy: {
        timestamp: "desc", // Fetch the most recent entries first
      },
    });

    // Log timing and results
    const fetchTime = Date.now() - startTime;
    console.log(`[TradeLog] Fetch completed in ${fetchTime}ms`);

    if (logEntries.length > 0) {
      console.log(`[TradeLog] Found ${logEntries.length} entries`);
      console.log(`[TradeLog] Newest entry: ${new Date(logEntries[0].timestamp).toISOString()}`);
      console.log(`[TradeLog] Oldest entry: ${new Date(logEntries[logEntries.length - 1].timestamp).toISOString()}`);
    } else {
      console.log(`[TradeLog] No entries found`);
    }

    return {
      isSuccess: true,
      message: "Successfully fetched trade log entries.",
      data: logEntries,
    };
  } catch (error: unknown) {
    const fetchTime = Date.now() - startTime;
    console.error(`[TradeLog] Fetch failed after ${fetchTime}ms:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch trade log entries: ${errorMessage}`,
      error: errorMessage,
    };
  }
}