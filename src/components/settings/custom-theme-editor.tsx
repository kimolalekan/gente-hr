'use client';

import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ContrastPanel } from '@/components/theme/contrast-panel';
import { ColorField } from '@/components/theme/color-field';
import { THEME_VARS, THEME_VAR_LABELS, type ThemePalette, type ThemeVar } from '@/lib/theme-config';

export function CustomThemeEditor({
  enabled,
  colors,
  palette,
  onToggle,
  onChangeColor,
  onSave,
  onCancel,
  onExport,
  onImport,
  canSave,
}: {
  enabled: boolean;
  colors: Partial<Record<ThemeVar, string>>;
  /** Resolved palette for the contrast check (uses the active color mode). */
  palette: ThemePalette;
  onToggle: (enabled: boolean) => void;
  onChangeColor: (variable: ThemeVar, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onExport: () => void;
  onImport: () => void;
  canSave: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/50 p-4">
        <div>
          <p className="text-sm font-medium">Enable custom theme</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Define your own palette. Custom colors apply to both light and dark mode — the editor
            checks WCAG 2.1 contrast for you.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Enable custom theme"
        />
      </div>

      {enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {THEME_VARS.map((variable) => (
              <ColorField
                key={variable}
                variable={variable}
                label={THEME_VAR_LABELS[variable]}
                value={colors[variable] ?? ''}
                onChange={(value) => onChangeColor(variable, value)}
              />
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h3 className="mb-3 text-sm font-medium">WCAG 2.1 contrast check</h3>
            <ContrastPanel palette={palette} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onSave} disabled={!canSave}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload />
              Import JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
