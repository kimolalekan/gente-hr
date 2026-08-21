'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isHexColor, type ThemeVar } from '@/lib/theme-config';

/**
 * A color row: native color picker swatch + hex text field + variable name.
 * Invalid hex shows an inline error and is simply skipped by the sanitizer
 * (the previously valid value stays applied).
 */
export function ColorField({
  variable,
  label,
  value,
  onChange,
}: {
  variable: ThemeVar;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isHexColor(value);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-2.5">
      <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border shadow-sm">
        <input
          type="color"
          aria-label={`Pick color for ${label}`}
          value={valid ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span
          className="absolute inset-0 block"
          style={{ backgroundColor: valid ? value : 'transparent' }}
        />
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{label}</span>
          {!valid && value.length > 0 && (
            <span className="shrink-0 text-xs text-destructive">Invalid hex</span>
          )}
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">--{variable}</p>
      </div>

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        placeholder="#000000"
        className={cn('w-28 shrink-0 font-mono uppercase', !valid && value.length > 0 && 'border-destructive')}
        aria-label={`${label} hex value`}
      />
    </div>
  );
}
