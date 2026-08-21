'use client';

import { useTheme } from '@/components/theme/theme-provider';
import { getPredefinedTheme } from '@/lib/theme-config';

/** Small readout shown in the sidebar footer: current theme + effective mode. */
export function ThemeInfo() {
  const { themeId, effectiveMode } = useTheme();
  const name = themeId === 'custom' ? 'Custom' : getPredefinedTheme(themeId)?.name ?? themeId;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
      <span className="size-2.5 shrink-0 rounded-full bg-primary" />
      <span className="truncate font-medium text-foreground">{name}</span>
      <span className="capitalize">· {effectiveMode}</span>
    </div>
  );
}
