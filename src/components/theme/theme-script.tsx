import {
  resolvePalette,
  STORAGE_KEYS,
  type TenantTheme,
  type ThemeMode,
} from "@/lib/theme-config";

/**
 * Inline bootstrap script — runs synchronously before first paint so the
 * tenant's palette and color mode are applied with zero flash of unstyled
 * content (FOUC). The server embeds the resolved palette directly in the
 * HTML, and the current selection is cached to localStorage.
 *
 * Keep the mode-resolution logic here in sync with `resolveEffectiveMode`
 * in src/lib/theme-config.ts.
 */
export function ThemeScript({
  mode,
  theme,
}: {
  mode: ThemeMode;
  theme: TenantTheme;
}) {
  const palette = resolvePalette(theme);
  const payload = {
    mode,
    themeId: theme.themeId,
    tenantMode: theme.mode ?? "system",
    light: palette.light,
    dark: palette.dark,
  };

  const code = `(function(){try{
    var p=${JSON.stringify(payload)};
    var d=document.documentElement;
    var sys=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark=p.mode==='dark'||(p.mode==='system'&&(p.tenantMode==='dark'||(p.tenantMode==='system'&&sys)));
    var v=dark?p.dark:p.light;
    for(var k in v){if(Object.prototype.hasOwnProperty.call(v,k)){d.style.setProperty('--'+k,v[k]);}}
    d.classList.toggle('dark',dark);
    d.setAttribute('data-theme',p.themeId);
    d.setAttribute('data-mode',p.mode);
    try{localStorage.setItem(${JSON.stringify(STORAGE_KEYS.themeCache)},JSON.stringify({savedAt:Date.now(),mode:p.mode,themeId:p.themeId}));}catch(e){}
  }catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
