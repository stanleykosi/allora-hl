/**
 * @description Server Actions for managing Trade Parameter Templates stored in the database.
 * These actions interact with the Prisma client to perform CRUD operations on the TradeTemplate model.
 *
 * @dependencies
 * - @/types: Provides ActionState and TradeTemplate types.
 * - @/lib/prisma: Provides the singleton Prisma client instance for database access.
 * - @prisma/client: Specifically for handling Prisma-related errors like unique constraint violations.
 */
"use server";

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from "@prisma/client";
import type { ActionState, TradeTemplate } from "@/types";
import prisma from "@/lib/prisma";

/**
 * Fetches all saved Trade Parameter Templates from the database.
 *
 * @returns {Promise<ActionState<TradeTemplate[]>>} An ActionState object containing an array of templates on success, or an error message on failure.
 */
export async function getTemplatesAction(): Promise<ActionState<TradeTemplate[]>> {
  console.log("Executing getTemplatesAction");
  try {
    const templates = await prisma.tradeTemplate.findMany({
      orderBy: {
        name: "asc", // Order templates alphabetically by name
      },
    });

    console.log(`Successfully fetched ${templates.length} templates.`);
    return {
      isSuccess: true,
      message: "Successfully fetched trade templates.",
      data: templates,
    };
  } catch (error: unknown) {
    console.error("❌ Error fetching trade templates:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      isSuccess: false,
      message: `Failed to fetch trade templates: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Creates a new Trade Parameter Template in the database.
 *
 * @param {Omit<TradeTemplate, 'id' | 'createdAt' | 'updatedAt'>} data - The data for the new template (name, size, leverage).
 * @returns {Promise<ActionState<TradeTemplate>>} An ActionState object containing the created template on success, or an error message on failure.
 */
export async function createTemplateAction(
  data: Omit<TradeTemplate, "id" | "createdAt" | "updatedAt">,
): Promise<ActionState<TradeTemplate>> {
  console.log("Executing createTemplateAction with data:", data);
  try {
    // Validate input data (basic validation)
    if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
      throw new Error("Template name is required.");
    }
    if (typeof data.size !== "number" || data.size <= 0) {
      throw new Error("Template size must be a positive number.");
    }
    if (typeof data.leverage !== "number" || data.leverage <= 0) {
      throw new Error("Template leverage must be a positive number.");
    }

    const newTemplate = await prisma.tradeTemplate.create({
      data: {
        name: data.name.trim(), // Trim whitespace from name
        size: data.size,
        leverage: data.leverage,
      },
    });

    console.log(`Successfully created template: ${newTemplate.name}`);
    return {
      isSuccess: true,
      message: `Template "${newTemplate.name}" created successfully.`,
      data: newTemplate,
    };
  } catch (error: unknown) {
    console.error("❌ Error creating trade template:", error);
    let errorMessage = "An unknown error occurred";
    let userMessage = "Failed to create trade template.";

    if (error instanceof PrismaClientKnownRequestError) {
      // Handle potential unique constraint violation on the 'name' field
      if (error.code === "P2002") {
        userMessage =
          'Failed to create template: A template with this name already exists. Please choose a unique name.';
        errorMessage = `Unique constraint violation on field: ${error.meta?.target}`;
      } else {
        errorMessage = `Prisma error (${error.code}): ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      // Use specific validation messages if thrown
      if (
        errorMessage.includes("name is required") ||
        errorMessage.includes("size must be") ||
        errorMessage.includes("leverage must be")
      ) {
        userMessage = `Failed to create template: ${errorMessage}`;
      }
    }

    return {
      isSuccess: false,
      message: userMessage,
      error: errorMessage,
    };
  }
}

/**
 * Updates an existing Trade Parameter Template in the database.
 *
 * @param {string} id - The ID of the template to update.
 * @param {Partial<Omit<TradeTemplate, 'id' | 'createdAt' | 'updatedAt'>>} data - The data fields to update (name, size, leverage).
 * @returns {Promise<ActionState<TradeTemplate>>} An ActionState object containing the updated template on success, or an error message on failure.
 */
export async function updateTemplateAction(
  id: string,
  data: Partial<Omit<TradeTemplate, "id" | "createdAt" | "updatedAt">>,
): Promise<ActionState<TradeTemplate>> {
  console.log(`Executing updateTemplateAction for ID: ${id} with data:`, data);
  try {
    // Validate input data (if provided)
    if (data.name !== undefined && (typeof data.name !== "string" || data.name.trim() === "")) {
        throw new Error("Template name cannot be empty.");
    }
    if (data.size !== undefined && (typeof data.size !== 'number' || data.size <= 0)) {
        throw new Error("Template size must be a positive number.");
    }
    if (data.leverage !== undefined && (typeof data.leverage !== 'number' || data.leverage <= 0)) {
        throw new Error("Template leverage must be a positive number.");
    }

    // Prepare data for update, trimming name if present
    const updateData = { ...data };
    if (updateData.name) {
        updateData.name = updateData.name.trim();
    }


    const updatedTemplate = await prisma.tradeTemplate.update({
      where: { id },
      data: updateData,
    });

    console.log(`Successfully updated template: ${updatedTemplate.name}`);
    return {
      isSuccess: true,
      message: `Template "${updatedTemplate.name}" updated successfully.`,
      data: updatedTemplate,
    };
  } catch (error: unknown) {
    console.error(`❌ Error updating trade template ID ${id}:`, error);
    let errorMessage = "An unknown error occurred";
    let userMessage = "Failed to update trade template.";

    if (error instanceof PrismaClientKnownRequestError) {
      // Handle potential unique constraint violation on the 'name' field if it's being updated
      if (error.code === "P2002" && data.name !== undefined) {
        userMessage =
          'Failed to update template: A template with this name already exists. Please choose a unique name.';
        errorMessage = `Unique constraint violation on field: ${error.meta?.target}`;
      } else if (error.code === 'P2025'){
        // Handle case where the template to update doesn't exist
        userMessage = "Failed to update template: Template not found.";
        errorMessage = `Record to update not found (ID: ${id})`;
      }
       else {
        errorMessage = `Prisma error (${error.code}): ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
       // Use specific validation messages if thrown
       if (
        errorMessage.includes("name cannot be empty") ||
        errorMessage.includes("size must be") ||
        errorMessage.includes("leverage must be")
      ) {
        userMessage = `Failed to update template: ${errorMessage}`;
      }
    }

    return {
      isSuccess: false,
      message: userMessage,
      error: errorMessage,
    };
  }
}

/**
 * Deletes a Trade Parameter Template from the database.
 *
 * @param {string} id - The ID of the template to delete.
 * @returns {Promise<ActionState<{ id: string }>>} An ActionState object containing the deleted template's ID on success, or an error message on failure.
 */
export async function deleteTemplateAction(
  id: string,
): Promise<ActionState<{ id: string }>> {
  console.log(`Executing deleteTemplateAction for ID: ${id}`);
  try {
    const deletedTemplate = await prisma.tradeTemplate.delete({
      where: { id },
      select: { id: true, name: true }, // Select name for logging/message
    });

    console.log(`Successfully deleted template: ${deletedTemplate.name} (ID: ${id})`);
    return {
      isSuccess: true,
      message: `Template "${deletedTemplate.name}" deleted successfully.`,
      data: { id }, // Return the ID of the deleted item
    };
  } catch (error: unknown) {
    console.error(`❌ Error deleting trade template ID ${id}:`, error);
     let errorMessage = "An unknown error occurred";
    let userMessage = "Failed to delete trade template.";

    if (error instanceof PrismaClientKnownRequestError) {
       if (error.code === 'P2025'){
        // Handle case where the template to delete doesn't exist
        userMessage = "Failed to delete template: Template not found.";
        errorMessage = `Record to delete not found (ID: ${id})`;
      } else {
        errorMessage = `Prisma error (${error.code}): ${error.message}`;
      }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return {
      isSuccess: false,
      message: userMessage,
      error: errorMessage,
    };
  }
}