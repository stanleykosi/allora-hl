/**
 * @description
 * A reusable component to display error messages clearly.
 * It shows an error icon alongside the provided error message.
 *
 * @dependencies
 * - lucide-react: Provides the AlertCircle icon.
 * - clsx: Utility for conditionally joining class names.
 * - react: For component structure.
 *
 * @notes
 * - Uses Tailwind CSS for styling, specifically red text color for errors.
 * - Handles both string messages and Error objects.
 * - Can be customized via className prop.
 */
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

/**
 * Props for the ErrorDisplay component.
 * @property {string | Error | null | undefined} error - The error message or Error object to display. If null or undefined, the component renders nothing.
 * @property {string} [className] - Optional additional CSS classes to apply to the container.
 */
interface ErrorDisplayProps {
  error: string | Error | null | undefined;
  className?: string;
}

/**
 * Renders an error message with an alert icon.
 * @param {ErrorDisplayProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered error display or null if no error is provided.
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  className,
}): React.ReactElement | null => {
  // Don't render anything if there's no error
  if (!error) {
    return null;
  }

  // Extract the message string from the error
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div
      className={clsx(
        'flex items-center space-x-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive',
        className
      )}
      role="alert" // Semantic role for accessibility
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <span>{errorMessage}</span>
    </div>
  );
};

export default ErrorDisplay;