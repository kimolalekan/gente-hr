"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/hr-data";

/** Inline job status switcher (draft → open → closed). */
export function JobStatusSelect({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const { t } = useTranslations();
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: JobStatus) => {
    if (next === status) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/ats/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={status}
      disabled={saving}
      aria-label={t("ats.jobs.jobStatus")}
      onChange={(event) => handleChange(event.target.value as JobStatus)}
      className="h-8 w-32 text-xs"
    >
      {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((value) => (
        <option key={value} value={value}>
          {t(`statusLabels.job.${value}` as TranslationKey)}
        </option>
      ))}
    </Select>
  );
}
