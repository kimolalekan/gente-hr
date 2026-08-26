import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/server/i18n";

export const metadata = { title: "Page not found" };

/** Custom 404 — also renders for pages the user isn't allowed to access. */
export default async function NotFound() {
  const t = await getTranslator();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            G
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold">Gente</p>
            <p className="text-xs text-muted-foreground">HR Platform</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-8 text-center shadow-sm">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Compass className="size-6 text-muted-foreground" />
          </span>
          <p className="mt-4 text-4xl font-bold tracking-tight text-primary">
            404
          </p>
          <h1 className="mt-1 text-lg font-semibold">
            {t("errors.notFoundTitle")}
          </h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
            {t("errors.notFoundDescription")}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/">
              <Button className="w-full">{t("common.backToDashboard")}</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                {t("auth.goToLogin")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
