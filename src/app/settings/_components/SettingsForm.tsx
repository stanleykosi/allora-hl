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

    if (isNaN(numericValue) || numericValue <= 0) {
      newErrors[settingKey] = "Interval must be a positive number.";
    } else {
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
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <Label htmlFor="predictionInterval" className="md:text-right">
            Prediction Refresh Interval (seconds)
          </Label>
          <div className="md:col-span-2">
            <Input
              id="predictionInterval"
              type="number"
              min="1" // Basic HTML5 validation
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
              <p className="text-xs text-destructive mt-1">
                {errors.predictionRefreshInterval}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              How often to fetch new predictions from Allora (e.g., 60 for 1 minute).
            </p>
          </div>
        </div>

        {/* Account Refresh Interval */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <Label htmlFor="accountInterval" className="md:text-right">
            Account Info Refresh Interval (seconds)
          </Label>
          <div className="md:col-span-2">
            <Input
              id="accountInterval"
              type="number"
              min="1"
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
              <p className="text-xs text-destructive mt-1">
                {errors.accountRefreshInterval}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              How often to fetch account balance and positions from Hyperliquid (e.g., 30).
            </p>
          </div>
        </div>

        {/* Alert Toggle */}
        <div className="flex items-center justify-between space-x-4 border-t pt-6">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="alertsEnabled">
              Enable Contradictory Prediction Alerts
            </Label>
            <span className="text-xs text-muted-foreground">
              Show an alert if a new prediction opposes your open position basis.
            </span>
          </div>
          <Switch
            id="alertsEnabled"
            checked={settings.alertsEnabled}
            onCheckedChange={(checked) =>
              handleSwitchChange(checked, "alertsEnabled")
            }
          />
        </div>

        {/* Master Trade Switch Toggle */}
        <div className="flex items-center justify-between space-x-4 border-t pt-6">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="tradeSwitchEnabled">
              Master Trade Execution Switch
            </Label>
            <span className="text-xs text-muted-foreground">
              Enable or disable the ability to execute trades through this application. Must be ON to confirm trades.
            </span>
          </div>
          <Switch
            id="tradeSwitchEnabled"
            checked={settings.tradeSwitchEnabled}
            onCheckedChange={(checked) =>
              handleSwitchChange(checked, "tradeSwitchEnabled")
            }
            className={settings.tradeSwitchEnabled ? "data-[state=checked]:bg-green-600" : ""}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsForm;