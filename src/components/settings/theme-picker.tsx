'use client';

import { CustomThemeCard, ThemeCard } from '@/components/theme/theme-card';
import { PREDEFINED_THEMES, type ThemeId } from '@/lib/theme-config';

export function ThemePicker({
  selectedId,
  customActive,
  onSelect,
  onApply,
  onCustomApply,
}: {
  selectedId: ThemeId;
  customActive: boolean;
  onSelect: (id: ThemeId) => void;
  onApply: (id: ThemeId) => void;
  onCustomApply: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {PREDEFINED_THEMES.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          selected={selectedId === theme.id}
          onSelect={() => onSelect(theme.id)}
          onApply={() => onApply(theme.id)}
        />
      ))}
      <CustomThemeCard selected={customActive} onSelect={onCustomApply} />
    </div>
  );
}
