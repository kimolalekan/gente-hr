import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { TranslationsProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getTenantLanguage, getTranslator } from "@/lib/server/i18n";
import { getTenantTheme, getUserMode } from "@/lib/server/theme-store";
import { resolvePalette } from "@/lib/theme-config";
import "./globals.css";

// Tenant themes are applied at request time (see ThemeScript), so every page
// is rendered dynamically to reflect the company's latest saved branding.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: {
      default: "Gente HR",
      template: "%s · Gente HR",
    },
    description: t("app.description"),
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTenantTheme();
  const palette = resolvePalette(theme);
  return {
    themeColor: [
      {
        media: "(prefers-color-scheme: light)",
        color: palette.light.background,
      },
      { media: "(prefers-color-scheme: dark)", color: palette.dark.background },
    ],
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [theme, userMode, language] = await Promise.all([
    getTenantTheme(),
    getUserMode(),
    getTenantLanguage(),
  ]);
  const dictionary = getDictionary(language);

  return (
    <html lang={language} suppressHydrationWarning>
      <body>
        {/* Applies the tenant palette + color mode before first paint (no FOUC). */}
        <ThemeScript mode={userMode} theme={theme} />
        <TranslationsProvider language={language} dictionary={dictionary}>
          <ThemeProvider initialMode={userMode} initialTheme={theme}>
            {children}
          </ThemeProvider>
        </TranslationsProvider>
      </body>
    </html>
  );
}
