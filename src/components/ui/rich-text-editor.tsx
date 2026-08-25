"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Bold,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

interface ToolbarButton {
  label: string;
  icon: ReactNode;
  action: () => void;
}

/**
 * Minimal dependency-free WYSIWYG editor: a contentEditable region driven by
 * `document.execCommand` (bold, italic, underline, headings, lists, links).
 * Controlled — `onChange` emits the inner HTML; external value changes are
 * applied without clobbering the caret while typing.
 */
export function RichTextEditor({
  value,
  onChange,
  id,
  placeholder,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);

  // Apply external value changes (e.g. reset after save), but never while the
  // DOM already matches — otherwise every keystroke would move the caret.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
    lastValue.current = value;
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValue.current = html;
    onChange(html);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const makeLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (url) exec("createLink", url);
  };

  const buttons: ToolbarButton[] = [
    { label: "Bold", icon: <Bold />, action: () => exec("bold") },
    { label: "Italic", icon: <Italic />, action: () => exec("italic") },
    {
      label: "Underline",
      icon: <Underline />,
      action: () => exec("underline"),
    },
    {
      label: "Heading",
      icon: <Heading2 />,
      action: () => exec("formatBlock", "h2"),
    },
    {
      label: "Bullet list",
      icon: <List />,
      action: () => exec("insertUnorderedList"),
    },
    {
      label: "Numbered list",
      icon: <ListOrdered />,
      action: () => exec("insertOrderedList"),
    },
    { label: "Link", icon: <LinkIcon />, action: makeLink },
    {
      label: "Remove formatting",
      icon: <RemoveFormatting />,
      action: () => exec("removeFormat"),
    },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1"
      >
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            title={button.label}
            aria-label={button.label}
            // Keep the editor focused so the current selection survives.
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.action}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {button.icon}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        id={id}
        contentEditable
        tabIndex={0}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        suppressContentEditableWarning
        className="rich-editor rich-content min-h-40 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
