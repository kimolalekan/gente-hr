'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/theme-config';

const OPTIONS: Array<{ value: ThemeMode; label: string; hint: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System default', hint: 'Follow the OS/browser setting', icon: Monitor },
  { value: 'light', label: 'Light mode', hint: 'Bright background, dark text', icon: Sun },
  { value: 'dark', label: 'Dark mode', hint: 'Dark background, light text', icon: Moon },
];

/**
 * Company-wide default mode selector used on the branding settings page.
 * Sets the tenant's `theme_config.mode`; individual users override it from
 * their header toggle.
 */
export function ModeSelector({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              active
                ? 'border-primary bg-primary/5 ring-2 ring-ring'
                : 'border-border bg-background/50 hover:border-primary/50',
            )}
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md border',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {option.label}
                {active && <Check className="size-3.5 text-primary" />}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
