/**
 * @description
 * This file defines the standardized structure for Server Action return values.
 * It helps ensure consistent handling of success and error states across the application.
 */

/**
 * @description Represents the state returned by a Server Action.
 * It indicates whether the action was successful or not, provides a message,
 * and includes optional data on success or an error message on failure.
 *
 * @template T The type of data returned on successful execution. Defaults to `undefined`.
 *
 * @property {boolean} isSuccess - True if the action completed successfully, false otherwise.
 * @property {string} message - A user-friendly message describing the outcome of the action.
 * @property {T | undefined} data - The data returned by the action upon success. Undefined on failure.
 * @property {string | undefined} error - A technical error message or code on failure. Undefined on success.
 */
export type ActionState<T = undefined> =
  | {
      isSuccess: true;
      message: string;
      data: T;
      error?: undefined; // Explicitly undefined on success
    }
  | {
      isSuccess: false;
      message: string;
      data?: undefined; // Explicitly undefined on failure
      error?: string; // Optional error details (e.g., error.message)
    };
