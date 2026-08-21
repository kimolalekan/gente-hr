"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: "start" | "end";
}

const MenuContext = React.createContext<{ close: () => void }>({
  close: () => undefined,
});

/**
 * Lightweight accessible dropdown (no external deps). The trigger is cloned
 * with `aria-expanded`/`aria-haspopup` and keyboard handling (Enter/Space).
 * Closes on outside click, Escape, and item selection (via context).
 */
export function DropdownMenu({
  trigger,
  children,
  align = "end",
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  const menuValue = React.useMemo(() => ({ close }), [close]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
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
  }, [open]);

  const triggerWithHandlers = React.cloneElement(
    trigger as React.ReactElement<Record<string, unknown>>,
    {
      "aria-haspopup": "menu",
      "aria-expanded": open,
      onClick: (event: React.MouseEvent) => {
        const existing = trigger.props as {
          onClick?: (e: React.MouseEvent) => void;
        };
        existing.onClick?.(event);
        if (!event.defaultPrevented) setOpen((value) => !value);
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        const existing = trigger.props as {
          onKeyDown?: (e: React.KeyboardEvent) => void;
        };
        existing.onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          setOpen((value) => !value);
        }
      },
    },
  );

  return (
    <div className="relative" ref={ref}>
      {triggerWithHandlers}
      {open && (
        <MenuContext.Provider value={menuValue}>
          <div
            role="menu"
            className={cn(
              "absolute z-50 mt-2 min-w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  );
}

const itemStyles =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-popover-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function DropdownItem({
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { close } = React.useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(itemStyles, className)}
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      {...props}
    />
  );
}

export function DropdownLink({
  className,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { close } = React.useContext(MenuContext);
  return (
    <a
      role="menuitem"
      className={cn(itemStyles, className)}
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      {...props}
    />
  );
}
