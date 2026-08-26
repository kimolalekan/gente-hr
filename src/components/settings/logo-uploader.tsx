"use client";

import { useRef, useState } from "react";
import { Building2, ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const MAX_SIZE = 512 * 1024; // 512KB — production should upload to CDN and store the URL.

export function LogoUploader({
  label,
  hint,
  value,
  onUpload,
  onRemove,
  square = false,
}: {
  label: string;
  hint: string;
  value?: string | null;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
  square?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslations();
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("settings.branding.logoInvalidType"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t("settings.branding.logoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUpload(String(reader.result));
    reader.onerror = () => setError(t("settings.branding.logoReadError"));
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>

      <div className="mt-3 flex items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/50",
            square ? "size-12" : "size-20",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URLs can't use next/image
            <img src={value} alt={label} className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {value
              ? t("settings.branding.replaceLogo")
              : t("settings.branding.uploadLogo")}
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={onRemove}>
              <Trash2 />
              {t("common.remove")}
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {!value && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="size-3" />{" "}
          {t("settings.branding.logoPlaceholderHint")}
        </p>
      )}
    </div>
  );
}
