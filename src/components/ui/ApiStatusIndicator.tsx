/**
 * @description
 * Client Component: Displays the status of the Hyperliquid API configuration.
 * Shows a warning when the API is not properly configured with a valid API secret.
 */
"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { checkApiConfigAction } from "@/actions/hyperliquid-actions";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export const ApiStatusIndicator: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkApiConfig = async () => {
      try {
        const result = await checkApiConfigAction();
        setIsConfigured(result.isSuccess);
      } catch (error) {
        console.error("Failed to check API configuration:", error);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkApiConfig();
  }, []);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (isConfigured) {
    return null; // Don't show anything if configured correctly
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="flex items-center gap-1 cursor-help">
            <AlertTriangle className="h-3 w-3" />
            API Not Configured
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3">
          <p className="font-semibold mb-1">API Configuration Error</p>
          <p className="text-sm mb-2">
            The Hyperliquid API is not properly configured. Trading functionality is disabled.
          </p>
          <div className="text-xs space-y-1">
            <p className="font-medium">How to fix:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Set the HYPERLIQUID_API_SECRET environment variable with your valid API key</li>
              <li>Ensure the key is a 64-character hexadecimal string (with or without 0x prefix)</li>
              <li>Restart the application after setting the environment variable</li>
            </ol>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ApiStatusIndicator; 