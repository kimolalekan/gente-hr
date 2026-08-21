"use client";

import * as React from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SelectProps {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  /** `<option value="…">Label</option>` children — parsed into the option list. */
  children?: React.ReactNode;
  /** Custom renderer for an option's label (list items and the trigger). */
  renderOption?: (option: Option) => React.ReactNode;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
}

interface Option {
  value: string;
  label: string;
  /** Extra search terms via `<option data-search="…">`. */
  search?: string;
}

/**
 * Searchable combobox-style select. Keeps the native `<select>` API
 * (`value` + `onChange({ target: { value } })`, `<option>` children) so
 * existing callers work unchanged. Type to filter, arrow keys to navigate,
 * Enter to select. Uses the ARIA combobox pattern
 * (`aria-activedescendant` drives the active option).
 */
export function Select({
  value,
  onChange,
  children,
  renderOption,
  placeholder = "Select…",
  "aria-label": ariaLabel,
  id,
  className,
  disabled = false,
  searchPlaceholder = "Search…",
  emptyText = "No matching options",
}: SelectProps) {
  const options = useMemo<Option[]>(() => {
    const result: Option[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === "option") {
        const props = child.props as {
          value?: unknown;
          children?: React.ReactNode;
          "data-search"?: unknown;
        };
        const search = props["data-search"];
        result.push({
          value: String(props.value),
          label: String(props.children ?? props.value),
          search: typeof search === "string" && search ? search : undefined,
        });
      }
    });
    return result;
  }, [children]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(q) ||
            option.search?.toLowerCase().includes(q),
        )
      : options;
  }, [options, query]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setActiveIndex(0);
    }
  }, []);

  // Keep the active index in range.
  useEffect(() => {
    if (!open) return;
    if (activeIndex >= filtered.length)
      setActiveIndex(Math.max(0, filtered.length - 1));
  }, [open, filtered.length, activeIndex]);

  // Keep the active option visible.
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as
      HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectOption = useCallback(
    (option: Option) => {
      onChange({ target: { value: option.value } });
      setOpen(false);
    },
    [onChange],
  );

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) selectOption(option);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      aria-haspopup="listbox"
      trigger={
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2",
              !selected && "text-muted-foreground",
            )}
          >
            {selected ? (
              <>
                {renderOption?.(selected)}
                <span className="truncate">{selected.label}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      }
    >
      <div className="p-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={
              filtered[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
            }
            aria-label="Search options"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder={searchPlaceholder}
            className="h-8 pl-8"
            autoFocus
          />
        </div>
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="mt-1.5 max-h-56 overflow-y-auto"
        >
          {filtered.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-muted-foreground">
              {emptyText}
            </li>
          )}
          {filtered.map((option, index) => {
            const active = index === activeIndex;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm",
                  active
                    ? "bg-muted text-foreground"
                    : "text-popover-foreground",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {renderOption?.(option)}
                  <span className="truncate">{option.label}</span>
                </span>
                {isSelected && (
                  <Check className="size-4 shrink-0 text-primary" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Popover>
  );
}
