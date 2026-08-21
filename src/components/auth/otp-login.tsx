"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";

/** Only allow internal relative paths (prevents open redirects). */
function getSafeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

interface OtpResponse {
  ok: boolean;
  channel?: "email" | "console";
  exists?: boolean;
  reason?: string;
  error?: string;
}

export function OtpLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const next = getSafeNext(params.get("next"));

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeAttempt, setCodeAttempt] = useState(0);
  const [channel, setChannel] = useState<"email" | "console" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Requests an OTP; resolves true when a new code was issued. */
  const requestCode = useCallback(
    async (event: FormEvent): Promise<boolean> => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json()) as OtpResponse;
        if (!res.ok || !data.ok) {
          setError(
            data.error ??
              (data.reason === "rate_limited"
                ? "Please wait a minute before requesting another code."
                : "Could not send a code. Please try again."),
          );
          return false;
        }
        if (data.exists === false) {
          setError(
            "No account found for that email. Ask your administrator for an invite.",
          );
          return false;
        }
        setStep("code");
        setChannel(data.channel ?? null);
        return true;
      } catch {
        setError("Network error — please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [email],
  );

  /** Resend: clear the entered code and remount the input so it re-focuses. */
  const resendCode = useCallback(async () => {
    const ok = await requestCode({
      preventDefault: () => undefined,
    } as FormEvent);
    if (ok) {
      setCode("");
      setCodeAttempt((count) => count + 1);
    }
  }, [requestCode]);

  const verify = useCallback(async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as OtpResponse;
      if (!res.ok || !data.ok) {
        setError(
          data.error ??
            (data.reason === "expired"
              ? "That code expired. Request a new one."
              : data.reason === "locked"
                ? "Too many attempts. Request a new code."
                : channel === "console"
                  ? "That code didn't match. Enter the most recent code printed in the server console, or tap Resend code."
                  : "That code didn't match. Check it and try again."),
        );
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }, [email, code, next, router, channel]);

  const handleVerifySubmit = (event: FormEvent) => {
    event.preventDefault();
    void verify();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign in to Gente</CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your work email and we’ll send you a one-time sign-in code."
            : `Enter the 6-digit code sent to ${email}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "email" ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !email}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Send sign-in code
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <OtpInput
                key={codeAttempt}
                id="code"
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (error) setError(null);
                }}
                onComplete={() => void verify()}
                disabled={busy}
                invalid={!!error}
              />
            </div>
            {channel === "console" && (
              <p className="text-xs text-muted-foreground">
                Your code is printed in the server console — use the most recent
                one shown there.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={busy || code.length !== 6}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Verify &amp; sign in
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                <ArrowLeft className="size-3.5" />
                Change email
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={busy}
                onClick={() => void resendCode()}
              >
                Resend code
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
