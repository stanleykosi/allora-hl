/**
 * @description
 * A component to visually indicate the status of a service or connection.
 * Displays a status icon (color-coded) and the service name.
 *
 * @dependencies
 * - lucide-react: Provides icons for different statuses (CheckCircle, XCircle, Loader2, Radio).
 * - clsx: Utility for conditionally joining class names.
 * - react: For component structure.
 *
 * @notes
 * - Supports 'connected', 'connecting', 'error', and 'idle' statuses.
 * - Uses Tailwind CSS for styling and color coding.
 * - Can be customized via className prop.
 */
import { CheckCircle, Loader2, Radio, XCircle } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

/**
 * Defines the possible statuses for the indicator.
 */
export type StatusType = 'connected' | 'connecting' | 'error' | 'idle';

/**
 * Props for the StatusIndicator component.
 * @property {StatusType} status - The current status to display.
 * @property {string} [serviceName] - Optional name of the service or connection being indicated.
 * @property {string} [className] - Optional additional CSS classes to apply to the container.
 */
interface StatusIndicatorProps {
  status: StatusType;
  serviceName?: string;
  className?: string;
}

/**
 * Renders a status indicator with an icon and optional text.
 * @param {StatusIndicatorProps} props - The component props.
 * @returns {React.ReactElement} The rendered status indicator component.
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  serviceName,
  className,
}): React.ReactElement => {
  // Determine icon and color based on status
  let IconComponent;
  let iconColorClass;
  let statusText;

  switch (status) {
    case 'connected':
      IconComponent = CheckCircle;
      iconColorClass = 'text-green-500';
      statusText = 'Connected';
      break;
    case 'connecting':
      IconComponent = Loader2;
      iconColorClass = 'text-yellow-500 animate-spin'; // Add spin animation for connecting
      statusText = 'Connecting';
      break;
    case 'error':
      IconComponent = XCircle;
      iconColorClass = 'text-red-500';
      statusText = 'Error';
      break;
    case 'idle':
    default:
      IconComponent = Radio; // Simple dot or similar for idle/unknown
      iconColorClass = 'text-gray-400';
      statusText = 'Idle';
      break;
  }

  // Construct the display text
  const displayText = serviceName ? `${serviceName}: ${statusText}` : statusText;

  return (
    <div
      className={clsx('flex items-center space-x-2 text-sm', className)}
      aria-live="polite" // Announce status changes
    >
      <IconComponent className={clsx('h-4 w-4 flex-shrink-0', iconColorClass)} aria-label={statusText} />
      <span className="text-muted-foreground">{displayText}</span>
    </div>
  );
};

export default StatusIndicator;