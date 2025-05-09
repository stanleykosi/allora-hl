/**
 * @description
 * Client Component: Manages the state and interactions for the Trade Parameter Templates section on the Settings page.
 * It fetches templates, renders the list and editor, and handles edit/delete actions.
 *
 * Key features:
 * - Receives initial templates fetched server-side.
 * - Manages client-side state for templates, editor visibility, and loading/errors.
 * - Renders `TemplateList` to display templates.
 * - Renders `TemplateEditor` (in a Sheet/Dialog) for creating/editing.
 * - Handles opening the editor for creation or editing.
 * - Handles initiating the delete process (confirmation managed by `TemplateList`).
 * - Refreshes the template list after save or delete actions using `router.refresh()`.
 * - Uses responsive header layout.
 *
 * @dependencies
 * - react: For component structure and hooks (useState, useCallback).
 * - next/navigation: Provides `useRouter` for refreshing data.
 * - @/types: Provides TradeTemplate type definition.
 * - @/components/ui/button: Shadcn Button component.
 * - @/components/ui/card: Shadcn Card components for layout.
 * - @/components/ui/ErrorDisplay: For showing initial fetch errors.
 * - ./TemplateList: Component to display the list of templates.
 * - ./TemplateEditor: Component to edit/create templates.
 * - lucide-react: For the Plus icon.
 *
 * @notes
 * - This component orchestrates the template management UI.
 * - It assumes initial data is passed via props but could be modified to fetch client-side if needed.
 * - Refreshing data is currently done via `router.refresh()`, which re-runs the Server Component data fetch.
 */
"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TradeTemplate } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import TemplateList from "./TemplateList";
import TemplateEditor from "./TemplateEditor";
import { Plus } from "lucide-react";

interface ManageTemplatesClientProps {
  initialTemplates: TradeTemplate[] | null;
  initialError?: string | null;
}

const ManageTemplatesClient: React.FC<ManageTemplatesClientProps> = ({
  initialTemplates,
  initialError,
}) => {
  const router = useRouter();
  // Note: We primarily rely on the initial server fetch, but router.refresh() will update this.
  // Client-side state management of the list itself is minimal here.
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<TradeTemplate | null>(
    null,
  );

  // Handler to open the editor for creating a new template
  const handleCreateNew = useCallback(() => {
    setEditingTemplate(null); // Ensure no template is pre-filled
    setIsEditorOpen(true);
  }, []);

  // Handler to open the editor for editing an existing template
  const handleEditTemplate = useCallback((template: TradeTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  }, []);

  // Callback triggered when a template is saved (created or updated)
  const handleTemplateSaved = useCallback(() => {
    setIsEditorOpen(false); // Close editor
    setEditingTemplate(null); // Clear editing state
    router.refresh(); // Refresh server-side data to update the list
    // Potential alternative: refetch templates client-side if not using router.refresh()
  }, [router]);

  // Callback triggered when a template is deleted (from TemplateList)
  const handleTemplateDeleted = useCallback(() => {
    router.refresh(); // Refresh server-side data to update the list
    // Potential alternative: filter local state if managing templates client-side
  }, [router]);

  return (
    <Card>
      {/* Use flex-row for header layout, justify-between */}
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Title and Description */}
        <div className="flex-grow">
          <CardTitle>Manage Trade Templates</CardTitle>
          <CardDescription className="mt-1">
            Create, edit, or delete reusable trade parameter templates.
          </CardDescription>
        </div>
        {/* Create Button */}
        <div className="flex-shrink-0">
          <Button onClick={handleCreateNew} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Create New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {initialError && <ErrorDisplay error={initialError} className="mb-4" />}
        <TemplateList
          templates={initialTemplates}
          onEdit={handleEditTemplate}
          onTemplateDeleted={handleTemplateDeleted}
        />
      </CardContent>

      {/* Template Editor Sheet */}
      <TemplateEditor
        isOpen={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        templateToEdit={editingTemplate}
        onTemplateSaved={handleTemplateSaved}
      />
    </Card>
  );
};

export default ManageTemplatesClient;