/**
 * @description
 * A reusable loading spinner component.
 * Displays a spinning icon to indicate that content or data is currently loading.
 *
 * @dependencies
 * - lucide-react: Provides the Loader2 icon used for the spinner.
 * - clsx: Utility for conditionally joining class names (optional but good practice).
 *
 * @notes
 * - Uses Tailwind CSS for styling and animation (`animate-spin`).
 * - Can be customized via className prop.
 */
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

/**
 * Props for the LoadingSpinner component.
 * @property {string} [className] - Optional additional CSS classes to apply to the spinner container.
 * @property {number} [size] - Optional size for the spinner icon (defaults to 24).
 */
interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

/**
 * Renders a loading spinner icon.
 * @param {LoadingSpinnerProps} props - The component props.
 * @returns {React.ReactElement} The rendered loading spinner component.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 24,
}): React.ReactElement => {
  return (
    <div
      className={clsx('flex items-center justify-center', className)}
      aria-live="polite" // Indicate busy state to assistive technologies
      aria-busy="true"
    >
      <Loader2 className="animate-spin text-primary" size={size} aria-label="Loading..." />
    </div>
  );
};

export default LoadingSpinner;