import { Suspense } from "react";
import { OtpLogin } from "@/components/auth/otp-login";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("auth.signIn") };
}

export default async function LoginPage() {
  const t = await getTranslator();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            {t("app.monogram")}
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold">{t("app.name")}</p>
            <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
          </div>
        </div>
        {/* useSearchParams requires a Suspense boundary. */}
        <Suspense fallback={null}>
          <OtpLogin />
        </Suspense>
      </div>
    </main>
  );
}
