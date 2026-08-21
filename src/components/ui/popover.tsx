"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  contentClassName?: string;
  "aria-haspopup"?: "menu" | "listbox" | "dialog";
  /** Controlled open state (optional — defaults to internal state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Portal-based popover used by Select and DatePicker. Content is rendered
 * into `document.body` and positioned under the trigger, so it is never
 * clipped by overflow (e.g. inside modals). Closes on outside click, Escape,
 * and repositioning on scroll/resize.
 */
export function Popover({
  trigger,
  children,
  contentClassName,
  "aria-haspopup": haspopup = "dialog",
  open: openProp,
  onOpenChange,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  // Dismiss on outside click + Escape.
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  // Position the portal content below the trigger.
  React.useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const update = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        minWidth: Math.max(rect.width, 240),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const triggerWithHandlers = React.cloneElement(
    trigger as React.ReactElement<Record<string, unknown>>,
    {
      "aria-haspopup": haspopup,
      "aria-expanded": open,
      onClick: (event: React.MouseEvent) => {
        const existing = trigger.props as {
          onClick?: (e: React.MouseEvent) => void;
        };
        existing.onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        const existing = trigger.props as {
          onKeyDown?: (e: React.KeyboardEvent) => void;
        };
        existing.onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          (event.key === "Enter" ||
            event.key === " " ||
            event.key === "ArrowDown")
        ) {
          event.preventDefault();
          if (!open) setOpen(true);
        }
      },
    },
  );

  return (
    <div className="relative" ref={wrapperRef}>
      {triggerWithHandlers}
      {open &&
        position &&
        createPortal(
          <div
            ref={contentRef}
            role="presentation"
            className={cn(
              "fixed z-60 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
              contentClassName,
            )}
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}
