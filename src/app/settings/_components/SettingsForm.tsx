/**
 * @description
 * Client Component: Renders a form for managing application settings stored in localStorage.
 * Allows users to configure refresh intervals for data fetching and toggle feature flags.
 *
 * Key features:
 * - Uses `useLocalStorage` hook to persist settings.
 * - Provides inputs for prediction and account refresh intervals.
 * - Provides switches to enable/disable contradictory prediction alerts and the master trade execution switch.
 * - Uses Shadcn UI components for form elements.
 * - Performs basic validation on interval inputs.
 * - Improved responsive layout using grid.
 *
 * @dependencies
 * - react: For component structure and hooks (useState, useEffect).
 * - @/types: Provides AppSettings type definition.
 * - @/hooks/useLocalStorage: Custom hook for managing state synced with localStorage.
 * - @/lib/constants: Provides default settings values (DEFAULT_APP_SETTINGS).
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/input: Shadcn Input component.
 * - @/components/ui/label: Shadcn Label component.
 * - @/components/ui/switch: Shadcn Switch component.
 * - @/components/ui/toast: For potential feedback (not used currently, but available via useToast).
 * - @/hooks/use-toast: Hook to trigger toasts.
 *
 * @notes
 * - Settings are saved directly to localStorage on change via the `useLocalStorage` hook.
 * - Input values for intervals are stored as numbers, but managed as strings in the local component state
 * to handle user input correctly (e.g., typing in progress).
 * - Basic validation prevents non-numeric or negative values for intervals.
 */
"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { AppSettings } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_APP_SETTINGS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const SettingsForm: React.FC = () => {
  const { toast } = useToast();
  // Load settings from localStorage, using defaults if not found
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    "alloraHyperliquidApp_settings",
    DEFAULT_APP_SETTINGS,
  );

  // Local state for input fields to handle user typing, converting to numbers on save
  const [predictionIntervalInput, setPredictionIntervalInput] = useState(
    String(settings.predictionRefreshInterval / 1000), // Display in seconds
  );
  const [accountIntervalInput, setAccountIntervalInput] = useState(
    String(settings.accountRefreshInterval / 1000), // Display in seconds
  );

  // State for input validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Update local input state if settings change externally (e.g., reset to defaults)
  useEffect(() => {
    setPredictionIntervalInput(String(settings.predictionRefreshInterval / 1000));
    setAccountIntervalInput(String(settings.accountRefreshInterval / 1000));
  }, [settings]);

  // Generic handler for input changes, updates local state and persists to localStorage
  const handleIntervalChange = (
    event: ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    settingKey: keyof AppSettings,
  ) => {
    const value = event.target.value;
    setter(value); // Update local input state immediately

    // Validate and update localStorage
    const numericValue = parseFloat(value);
    const newErrors = { ...errors };
    const MIN_INTERVAL_SEC = 5; // Minimum interval of 5 seconds

    if (isNaN(numericValue) || numericValue <= 0) {
      newErrors[settingKey] = "Interval must be a positive number.";
    } else if (numericValue < MIN_INTERVAL_SEC) {
       newErrors[settingKey] = `Interval must be at least ${MIN_INTERVAL_SEC} seconds.`;
    }
     else {
      delete newErrors[settingKey]; // Clear error if valid
      // Save valid number (in milliseconds) to localStorage via the hook
      setSettings((prevSettings) => ({
        ...prevSettings,
        [settingKey]: Math.round(numericValue * 1000), // Convert seconds to ms
      }));
    }
    setErrors(newErrors);
  };

  // Handler for switch changes
  const handleSwitchChange = (
    checked: boolean,
    settingKey: keyof AppSettings,
  ) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [settingKey]: checked,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>UI & Fetch Settings</CardTitle>
        <CardDescription>
          Configure data refresh rates and feature toggles. Settings are saved
          locally in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prediction Refresh Interval */}
        {/* Use grid for responsive layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label htmlFor="predictionInterval" className="md:text-right md:mt-2">
            Prediction Refresh Interval (seconds)
          </Label>
          <div className="md:col-span-2 space-y-1">
            <Input
              id="predictionInterval"
              type="number"
              min="5" // Enforce minimum in HTML
              step="1"
              value={predictionIntervalInput}
              onChange={(e) =>
                handleIntervalChange(
                  e,
                  setPredictionIntervalInput,
                  "predictionRefreshInterval",
                )
              }
              className={errors.predictionRefreshInterval ? "border-destructive" : ""}
              placeholder="e.g., 60"
            />
            {errors.predictionRefreshInterval && (
              <p className="text-xs text-destructive">
                {errors.predictionRefreshInterval}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              How often to fetch new predictions from Allora (min 5 sec).
            </p>
          </div>
        </div>

        {/* Account Refresh Interval */}
         <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-4">
          <Label htmlFor="accountInterval" className="md:text-right md:mt-2">
            Account Info Refresh Interval (seconds)
          </Label>
          <div className="md:col-span-2 space-y-1">
            <Input
              id="accountInterval"
              type="number"
              min="5" // Enforce minimum in HTML
              step="1"
              value={accountIntervalInput}
              onChange={(e) =>
                handleIntervalChange(
                  e,
                  setAccountIntervalInput,
                  "accountRefreshInterval",
                )
              }
              className={errors.accountRefreshInterval ? "border-destructive" : ""}
              placeholder="e.g., 30"
            />
            {errors.accountRefreshInterval && (
              <p className="text-xs text-destructive">
                {errors.accountRefreshInterval}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              How often to fetch account/positions from Hyperliquid (min 5 sec).
            </p>
          </div>
        </div>

        {/* Alert Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4 border-t pt-6">
          <div className="flex-grow space-y-1">
            <Label htmlFor="alertsEnabled">
              Enable Contradictory Prediction Alerts
            </Label>
            <p className="text-xs text-muted-foreground">
              Show an alert on open positions if a new 8hr prediction opposes its basis.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Switch
              id="alertsEnabled"
              checked={settings.alertsEnabled}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "alertsEnabled")
              }
            />
          </div>
        </div>

        {/* Master Trade Switch Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4 border-t pt-6">
           <div className="flex-grow space-y-1">
            <Label htmlFor="tradeSwitchEnabled" className="font-medium text-base">
              Master Trade Execution
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable or disable the ability to execute trades. Must be ON to confirm trades.
            </p>
          </div>
           <div className="flex-shrink-0">
            <Switch
              id="tradeSwitchEnabled"
              checked={settings.tradeSwitchEnabled}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "tradeSwitchEnabled")
              }
              // Apply green styling when checked for emphasis
              className={settings.tradeSwitchEnabled ? "data-[state=checked]:bg-green-600" : ""}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsForm;