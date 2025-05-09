/**
 * @description
 * Client Component: Checks if the Hyperliquid API is configured for trading (i.e., API secret is set)
 * and displays a status indicator accordingly ('connected' or 'disabled').
 *
 * Key features:
 * - Calls the `checkApiConfigAction` Server Action on mount.
 * - Renders the `StatusIndicator` component based on the check result.
 * - Provides visual feedback on whether trading functionality is available.
 *
 * @dependencies
 * - react: For component structure and hooks (useState, useEffect).
 * - @/actions/hyperliquid-actions: Server Action to check API configuration.
 * - ./StatusIndicator: Component to display the status visually.
 *
 * @notes
 * - Runs only once on mount to check the configuration status.
 */
"use client";

import React, { useState, useEffect } from 'react';
import { checkApiConfigAction } from '@/actions/hyperliquid-actions';
import StatusIndicator, { StatusType } from './StatusIndicator';

const ApiStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<StatusType>('connecting'); // Start as connecting

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const result = await checkApiConfigAction();
        // If the action returns success, it means the config check passed (secret exists)
        if (result.isSuccess) {
          setStatus('connected');
        } else {
          // If the action returns failure, specifically check if it's due to missing secret
          if (result.error?.includes("Missing or invalid API secret")) {
            setStatus('idle'); // Set to idle if secret is explicitly missing/invalid
          } else {
            setStatus('error'); // Set to generic error for other failures
          }

        }
      } catch (error) {
        console.error("Error checking API config status:", error);
        setStatus('error'); // Set to error on unexpected exceptions
      }
    };

    checkConfig();
  }, []); // Run only once on mount

  return (
    <StatusIndicator
      status={status}
      serviceName="Trade API"
      className="text-xs"
    // Optionally hide text for a more compact indicator
    // showText={false}
    />
  );
};

export default ApiStatusIndicator;