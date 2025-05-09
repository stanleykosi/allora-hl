/**
 * @description
 * Client Component: Displays a list of saved Trade Parameter Templates in a table.
 * Allows users to view, initiate editing, and delete templates with confirmation.
 *
 * Key features:
 * - Renders templates using Shadcn UI Table with horizontal scrolling.
 * - Provides Edit and Delete buttons for each template.
 * - Uses Shadcn AlertDialog for delete confirmation.
 * - Handles loading and error states during deletion.
 *
 * @dependencies
 * - react: For component structure and hooks (useState).
 * - @/types: Provides TradeTemplate type.
 * - @/components/ui/table: Shadcn Table components.
 * - @/components/ui/button: Shadcn Button component.
 * - @/components/ui/alert-dialog: Shadcn AlertDialog for confirmation.
 * - @/components/ui/toast: For displaying feedback via useToast hook.
 * - @/hooks/use-toast: Hook to trigger toasts.
 * - @/actions/template-actions: Server action for deleting templates.
 * - lucide-react: For icons (Pencil, Trash2).
 * - @/lib/formatting: For formatting numbers.
 * - next/navigation: For router refresh.
 *
 * @notes
 * - Deletion logic is handled within this component using the `deleteTemplateAction`.
 * - Edit initiation is handled by calling the `onEdit` prop.
 */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TradeTemplate } from "@/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/formatting";
import { useToast } from "@/hooks/use-toast";
import { deleteTemplateAction } from "@/actions/template-actions";

interface TemplateListProps {
  templates: TradeTemplate[] | null;
  onEdit: (template: TradeTemplate) => void;
  // onDelete is handled internally now, need callback to refresh parent state or trigger router refresh
  onTemplateDeleted: () => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onEdit,
  onTemplateDeleted,
}) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [templateToDelete, setTemplateToDelete] = useState<TradeTemplate | null>(
    null,
  );
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);

  // Handler to initiate deletion confirmation
  const handleDeleteClick = (template: TradeTemplate) => {
    setTemplateToDelete(template);
    setIsAlertOpen(true); // Open confirmation dialog
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteTemplateAction(templateToDelete.id);
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: result.message,
        });
        onTemplateDeleted(); // Notify parent to refresh or update state
      } else {
        toast({
          title: "Error Deleting Template",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the template.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setTemplateToDelete(null);
      setIsAlertOpen(false); // Close dialog
    }
  };

  // Handler for canceling deletion
  const handleCancelDelete = () => {
    setTemplateToDelete(null);
    setIsAlertOpen(false); // Close dialog
  };

  // Render content based on templates availability
  const renderTableContent = () => {
    if (!templates || templates.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            No templates found. Create one to get started!
          </TableCell>
        </TableRow>
      );
    }

    return templates.map((template) => (
      <TableRow key={template.id}>
        <TableCell className="font-medium">{template.name}</TableCell>
        <TableCell className="text-right whitespace-nowrap">
          {formatNumber(template.size, 4)} {/* Example: 4 decimal places */}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">
          {formatNumber(template.leverage, 1)}x{" "}
          {/* Example: 1 decimal place */}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">
           <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(template)}
                aria-label={`Edit template ${template.name}`}
                className="h-8 w-8" // Smaller icon buttons
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteClick(template)}
                  aria-label={`Delete template ${template.name}`}
                  className="h-8 w-8" // Smaller icon buttons
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
           </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      {/* Wrapper div for horizontal scrolling on smaller screens */}
      <div className="w-full overflow-x-auto border rounded-md">
        <Table>
          <TableCaption className="mt-4">A list of your saved trade templates.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="text-right min-w-[100px]">Size</TableHead>
              <TableHead className="text-right min-w-[100px]">Leverage</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableContent()}</TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            template{" "}
            <span className="font-semibold">"{templateToDelete?.name}"</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TemplateList;