'use client';

import Link from 'next/link';
import { Check, ChevronDown, Monitor, Moon, Palette, Sun, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { DropdownItem, DropdownLink, DropdownMenu } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/theme-config';

const OPTIONS: Array<{ value: ThemeMode; label: string; icon: LucideIcon }> = [
  { value: 'system', label: 'System default', icon: Monitor },
  { value: 'light', label: 'Light mode', icon: Sun },
  { value: 'dark', label: 'Dark mode', icon: Moon },
];

/**
 * Header color-mode toggle. Persists the signed-in user's preference
 * (overrides the company default). Admins also get a link to the full
 * company theme settings.
 */
export function ThemeToggle({ isAdmin }: { isAdmin: boolean }) {
  const { userMode, setUserMode, isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const ModeIcon = isDark ? Moon : Sun;

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          aria-label="Change color mode"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60"
        >
          <ModeIcon className="size-4" />
          <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      }
    >
      <div className="p-0.5">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = userMode === option.value;
          return (
            <DropdownItem
              key={option.value}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await setUserMode(option.value);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Icon className={cn('size-4', active && 'text-primary')} />
              <span className="flex-1">{option.label}</span>
              {active && <Check className="size-4 text-primary" />}
            </DropdownItem>
          );
        })}
      </div>
      {isAdmin && (
        <>
          <Separator className="my-1" />
          <div className="p-0.5">
            <Link href="/settings/branding">
              <DropdownLink>
                <Palette className="size-4" />
                <span className="flex-1">Company theme settings</span>
              </DropdownLink>
            </Link>
          </div>
        </>
      )}
    </DropdownMenu>
  );
}
