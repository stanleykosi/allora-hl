/**
 * @description
 * Client Component: Renders a form within a Sheet (slide-over panel) for creating or editing Trade Parameter Templates.
 * Handles form state, validation, submission via Server Actions, and provides user feedback.
 *
 * Key features:
 * - Uses Shadcn UI Sheet for the form container.
 * - Form includes inputs for Template Name, Size, and Leverage.
 * - Populates form fields when editing an existing template.
 * - Performs client-side validation before submitting.
 * - Calls `createTemplateAction` or `updateTemplateAction` Server Actions on submit.
 * - Uses `useToast` hook for success and error notifications.
 * - Calls `onTemplateSaved` prop on successful save to trigger parent updates.
 * - Uses responsive grid layout within the sheet.
 *
 * @dependencies
 * - react: For component structure and hooks (useState, useEffect).
 * - @/types: Provides TradeTemplate type definition.
 * - @/components/ui/sheet: Shadcn Sheet components.
 * - @/components/ui/button: Shadcn Button component.
 * - @/components/ui/input: Shadcn Input component.
 * - @/components/ui/label: Shadcn Label component.
 * - @/components/ui/toast: For displaying feedback via useToast hook.
 * - @/hooks/use-toast: Hook to trigger toasts.
 * - @/actions/template-actions: Server actions for creating/updating templates.
 *
 * @notes
 * - Assumes basic client-side validation. More complex validation could be added.
 * - Converts form input strings to numbers before calling actions.
 */
"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { TradeTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/actions/template-actions";

interface TemplateEditorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  templateToEdit?: TradeTemplate | null; // Pass template data if editing
  onTemplateSaved: () => void; // Callback after successful save
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  isOpen,
  onOpenChange,
  templateToEdit,
  onTemplateSaved,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState<string>("");
  const [size, setSize] = useState<string>(""); // Store as string for input control
  const [leverage, setLeverage] = useState<string>(""); // Store as string
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Populate form when templateToEdit changes (for editing)
  useEffect(() => {
    if (isOpen) { // Only reset/populate when opening
        if (templateToEdit) {
            setName(templateToEdit.name);
            setSize(String(templateToEdit.size));
            setLeverage(String(templateToEdit.leverage));
            setErrors({}); // Clear errors when opening editor
        } else {
            // Reset form when opening for creation
            setName("");
            setSize("");
            setLeverage("");
            setErrors({});
        }
    }
  }, [templateToEdit, isOpen]); // Re-run effect when editor opens or template changes


  // Basic client-side validation
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) {
      newErrors.name = "Template name is required.";
    }
    const sizeNum = parseFloat(size);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      newErrors.size = "Size must be a positive number.";
    }
    const leverageNum = parseFloat(leverage);
    if (isNaN(leverageNum) || leverageNum <= 0) {
      newErrors.leverage = "Leverage must be a positive number.";
    } else if (leverageNum > 40) {
      newErrors.leverage = "Hyperliquid only supports up to 40x leverage for BTC.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }

    setIsSaving(true);
    const sizeNum = parseFloat(size);
    // Cap leverage at 40 before sending to action
    let leverageNum = parseFloat(leverage);
    if (leverageNum > 40) {
        leverageNum = 40;
    } else if (leverageNum < 1) {
        leverageNum = 1;
    }

    const templateData = { name: name.trim(), size: sizeNum, leverage: leverageNum };

    try {
      let result;
      if (templateToEdit) {
        // Update existing template
        result = await updateTemplateAction(templateToEdit.id, templateData);
      } else {
        // Create new template
        result = await createTemplateAction(templateData);
      }

      if (result.isSuccess) {
        toast({
          title: "Success",
          description: result.message,
        });
        onTemplateSaved(); // Notify parent component
        onOpenChange(false); // Close the sheet
      } else {
        toast({
          title: `Error ${templateToEdit ? "Updating" : "Creating"} Template`,
          description: result.message,
          variant: "destructive",
        });
        // Optionally set server-side validation errors back to the form state
        // Example: Check if the error message indicates a duplicate name
        if (result.message?.toLowerCase().includes("name already exists")) {
          setErrors((prev) => ({ ...prev, name: "This name is already taken." }));
        }
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the template.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[425px] md:max-w-[550px]"> {/* Adjust width */}
        <SheetHeader>
          <SheetTitle>
            {templateToEdit ? "Edit Template" : "Create New Template"}
          </SheetTitle>
          <SheetDescription>
            {templateToEdit
              ? `Modify the details for the template "${templateToEdit.name}".`
              : "Define parameters for a reusable trade template."}
          </SheetDescription>
        </SheetHeader>
        {/* Use a form element for semantics and potential keyboard submission */}
        <form onSubmit={handleSubmit} className="grid gap-4 py-6">
          {/* Template Name Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="template-name" className="text-right col-span-1"> {/* Ensure label points to correct ID */}
              Name
            </Label>
            <div className="col-span-3 space-y-1"> {/* Add space-y for error msg */}
              <Input
                id="template-name" // Unique ID
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "border-destructive" : ""}
                disabled={isSaving}
                placeholder="e.g., My Standard BTC Long"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
          </div>

          {/* Size Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="template-size" className="text-right col-span-1"> {/* Unique ID */}
              Size
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="template-size" // Unique ID
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                step="any" // Allow decimals
                min="0" // Basic validation
                className={errors.size ? "border-destructive" : ""}
                disabled={isSaving}
                placeholder="e.g., 0.01 (in BTC)"
              />
              {errors.size && (
                <p className="text-xs text-destructive">{errors.size}</p>
              )}
            </div>
          </div>

          {/* Leverage Input */}
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="template-leverage" className="text-right col-span-1"> {/* Unique ID */}
              Leverage
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="template-leverage" // Unique ID
                type="number"
                value={leverage}
                onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseFloat(value);
                    // Basic range check during typing for immediate feedback, capping is done on submit
                    if (!isNaN(numValue) && numValue > 40) setLeverage("40");
                    else if (!isNaN(numValue) && numValue < 1) setLeverage("1");
                    else setLeverage(value);
                }}
                step="any"
                min="1"
                max="40"
                className={errors.leverage ? "border-destructive" : ""}
                disabled={isSaving}
                placeholder="e.g., 10 (Max 40x for BTC)"
              />
              {errors.leverage && (
                <p className="text-xs text-destructive">{errors.leverage}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum leverage for BTC on Hyperliquid is 40x.
              </p>
            </div>
          </div>

          {/* Footer with Actions */}
          {/* Added mt-6 for more space before footer */}
          <SheetFooter className="mt-6 pt-4 border-t">
            {/* SheetClose automatically triggers onOpenChange(false) */}
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isSaving || Object.keys(errors).length > 0}>
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default TemplateEditor;