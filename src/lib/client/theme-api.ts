/**
 * Client-side persistence helpers used by the ThemeProvider.
 */
import type { TenantTheme, ThemeMode } from '../theme-config';

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function patchTenantTheme(theme: TenantTheme): Promise<TenantTheme> {
  const data = await patch<{ theme: TenantTheme }>('/api/tenant/theme', theme);
  return data.theme;
}

export async function patchUserMode(mode: ThemeMode): Promise<ThemeMode> {
  const data = await patch<{ mode: ThemeMode }>('/api/user/preferences', { mode });
  return data.mode;
}
