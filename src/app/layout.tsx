import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { getTenantTheme, getUserMode } from '@/lib/server/theme-store';
import { resolvePalette } from '@/lib/theme-config';
import './globals.css';

// Tenant themes are applied at request time (see ThemeScript), so every page
// is rendered dynamically to reflect the company's latest saved branding.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'Gente HR',
    template: '%s · Gente HR',
  },
  description: 'Company branding & theme settings for the Gente HR platform.',
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTenantTheme();
  const palette = resolvePalette(theme);
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: palette.light.background },
      { media: '(prefers-color-scheme: dark)', color: palette.dark.background },
    ],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [theme, userMode] = await Promise.all([getTenantTheme(), getUserMode()]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Applies the tenant palette + color mode before first paint (no FOUC). */}
        <ThemeScript mode={userMode} theme={theme} />
        <ThemeProvider initialMode={userMode} initialTheme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
