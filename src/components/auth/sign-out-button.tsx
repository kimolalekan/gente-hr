"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/provider";

export function SignOutButton() {
  const { t } = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The session cookie is cleared client-side on redirect regardless.
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t("auth.signOut")}
      title={t("auth.signOut")}
      onClick={handleSignOut}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
    </Button>
  );
}
