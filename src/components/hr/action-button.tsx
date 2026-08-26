"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/provider";

/**
 * Button that briefly shows a success state after being pressed — used for
 * demo actions (invite, generate, upgrade…) that don't have a backend yet.
 */
export function ActionButton({
  children,
  onAction,
  doneLabel,
  ...props
}: ButtonProps & {
  onAction?: () => void;
  doneLabel?: string;
  children: ReactNode;
}) {
  const { t } = useTranslations();
  const label = doneLabel ?? t("common.done");
  const [done, setDone] = useState(false);

  return (
    <Button
      {...props}
      onClick={() => {
        onAction?.();
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? (
        <>
          <Check />
          {label}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
