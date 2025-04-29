/**
 * @description
 * This library file contains utility functions for formatting data, such as numbers and dates,
 * for display purposes throughout the application.
 *
 * Key features:
 * - Formatting numbers as currency (USD).
 * - Formatting numbers with specific decimal places.
 *
 * @dependencies
 * - None
 *
 * @notes
 * - Uses the Intl.NumberFormat API for locale-aware number formatting.
 * - Can be extended with more specific formatting functions as needed (e.g., percentages, large numbers).
 */

/**
 * Formats a number as a US Dollar currency string.
 * Handles potential non-numeric inputs gracefully by returning a default string.
 *
 * @param {number | string | undefined | null} value - The numeric value to format. Can be a number, string representation of a number, undefined, or null.
 * @param {object} [options] - Optional formatting options.
 * @param {number} [options.minimumFractionDigits=2] - Minimum number of fraction digits.
 * @param {number} [options.maximumFractionDigits=2] - Maximum number of fraction digits.
 * @returns {string} The formatted currency string (e.g., "$1,234.56") or "$0.00" if the input is invalid or zero.
 */
export function formatCurrency(
  value: number | string | undefined | null,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof numericValue !== 'number' || isNaN(numericValue)) {
    return '$0.00'; // Return default for invalid input
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });

  return formatter.format(numericValue);
}

/**
 * Formats a number with a specified number of decimal places.
 * Handles potential non-numeric inputs gracefully by returning a default string.
 *
 * @param {number | string | undefined | null} value - The numeric value to format. Can be a number, string representation of a number, undefined, or null.
 * @param {number} [fractionDigits=2] - The number of decimal places to include. Defaults to 2.
 * @returns {string} The formatted number string (e.g., "1234.56") or "0.00" if the input is invalid or zero (adjusting decimals based on fractionDigits).
 */
export function formatNumber(
  value: number | string | undefined | null,
  fractionDigits: number = 2,
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof numericValue !== 'number' || isNaN(numericValue)) {
    return (0).toFixed(fractionDigits); // Return "0.00" (or equivalent) for invalid input
  }

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true, // Add commas for thousands separators
  });

  return formatter.format(numericValue);
}

/**
 * Formats a number as a percentage string.
 * Handles potential non-numeric inputs gracefully by returning a default string.
 *
 * @param {number | string | undefined | null} value - The numeric value (as a decimal, e.g., 0.25 for 25%) to format.
 * @param {number} [fractionDigits=2] - The number of decimal places to include in the percentage. Defaults to 2.
 * @returns {string} The formatted percentage string (e.g., "25.00%") or "0.00%" if the input is invalid.
 */
export function formatPercentage(
  value: number | string | undefined | null,
  fractionDigits: number = 2,
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof numericValue !== 'number' || isNaN(numericValue)) {
    return (0).toFixed(fractionDigits) + '%'; // Return "0.00%" for invalid input
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return formatter.format(numericValue);
}

/**
 * Formats a Date object or timestamp into a readable string.
 *
 * @param {Date | number | string | undefined | null} dateInput - The date or timestamp to format.
 * @param {object} [options] - Intl.DateTimeFormat options (e.g., { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).
 * @returns {string} The formatted date/time string, or an empty string if input is invalid.
 */
export function formatDateTime(
  dateInput: Date | number | string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) {
    return '';
  }

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      // Check if the date is valid
      return '';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Use 24-hour format by default
      ...options, // Merge user options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return ''; // Return empty string on error
  }
}