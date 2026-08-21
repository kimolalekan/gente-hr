"use client";

import { useState, type FormEvent } from "react";
import {
  FileText,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { PerformanceTemplate } from "@/lib/hr-data";

interface SectionDraft {
  id: string;
  name: string;
  questions: string;
}

function toDraft(template: PerformanceTemplate | null): SectionDraft[] {
  if (!template) return [{ id: "s_new", name: "", questions: "" }];
  return template.sections.map((section) => ({
    id: section.id,
    name: section.name,
    questions: section.questions.join("\n"),
  }));
}

function fromDrafts(sections: SectionDraft[]): PerformanceTemplate["sections"] {
  return sections
    .filter((section) => section.name.trim())
    .map((section, index) => ({
      id: section.id || `s_${Date.now().toString(36)}_${index}`,
      name: section.name.trim(),
      questions: section.questions
        .split("\n")
        .map((question) => question.trim())
        .filter(Boolean),
    }));
}

/**
 * Performance templates — HR/Admin can create and edit. Demo state is local;
 * wire to a templates table later.
 */
export function PerformanceTemplatesManager({
  templates,
}: {
  templates: PerformanceTemplate[];
}) {
  const [items, setItems] = useState(templates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceTemplate | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSections(toDraft(null));
    setError(null);
    setOpen(true);
  };

  const openEdit = (template: PerformanceTemplate) => {
    setEditing(template);
    setName(template.name);
    setDescription(template.description);
    setSections(toDraft(template));
    setError(null);
    setOpen(true);
  };

  const updateSection = (id: string, patch: Partial<SectionDraft>) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("A template name is required.");
      return;
    }
    const parsedSections = fromDrafts(sections);
    if (parsedSections.length === 0) {
      setError("Add at least one section with a name.");
      return;
    }
    if (editing) {
      setItems((current) =>
        current.map((template) =>
          template.id === editing.id
            ? {
                ...template,
                name: trimmedName,
                description: description.trim(),
                sections: parsedSections,
              }
            : template,
        ),
      );
    } else {
      setItems((current) => [
        {
          id: `tpl_${Date.now().toString(36)}`,
          name: trimmedName,
          description: description.trim(),
          sections: parsedSections,
          active: true,
        },
        ...current,
      ]);
    }
    setOpen(false);
  };

  const toggleActive = (id: string) => {
    setItems((current) =>
      current.map((template) =>
        template.id === id
          ? { ...template, active: !template.active }
          : template,
      ),
    );
  };

  const totalQuestions = (template: PerformanceTemplate) =>
    template.sections.reduce((sum, section) => sum + section.questions.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New template
        </Button>
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No templates yet — create one to start a review from it.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((template) => (
          <div
            key={template.id}
            className="flex flex-col rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{template.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {template.description}
                </p>
              </div>
              <Badge variant={template.active ? "success" : "secondary"}>
                {template.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ListChecks className="size-3.5" />
                {template.sections.length} section
                {template.sections.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="size-3.5" />
                {totalQuestions(template)} question
                {totalQuestions(template) === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 flex flex-1 items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => openEdit(template)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                variant={template.active ? "outline" : "success"}
                size="sm"
                className="flex-1"
                onClick={() => toggleActive(template.id)}
              >
                {template.active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit template" : "New template"}
        description={
          editing
            ? `Update ${editing.name} — sections and questions.`
            : "Sections with questions used to start a review."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="template-form">
              <Save className="size-4" />
              {editing ? "Save changes" : "Create template"}
            </Button>
          </>
        }
      >
        <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Standard review"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this template for?"
            />
          </div>

          <div className="space-y-3">
            <Label>Sections</Label>
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="space-y-2 rounded-lg border border-border bg-background/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  <Input
                    value={section.name}
                    onChange={(event) =>
                      updateSection(section.id, { name: event.target.value })
                    }
                    placeholder="Section name (e.g. Achievements)"
                    className="h-8"
                    aria-label={`Section ${index + 1} name`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSections((current) =>
                        current.filter((item) => item.id !== section.id),
                      )
                    }
                    aria-label={`Remove section ${index + 1}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  value={section.questions}
                  onChange={(event) =>
                    updateSection(section.id, { questions: event.target.value })
                  }
                  placeholder={"One question per line…"}
                  rows={3}
                  aria-label={`Section ${index + 1} questions`}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSections((current) => [
                  ...current,
                  { id: `s_${Date.now().toString(36)}`, name: "", questions: "" },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add section
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
