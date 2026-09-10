import { notFound, redirect } from "next/navigation";
import { ProcurementForm } from "@/components/procurement/procurement-form";
import type { Procurement } from "@/lib/procurement";
import { apiGet } from "@/lib/server/api-client";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("procurement.editTitle") };
}

/**
 * Edit a pending procurement request (title, description, vendor quotes).
 * Only requests that haven't been decided can be edited — the API enforces
 * this too. Admin/HR can edit any pending request; members their own.
 */
export default async function EditProcurementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const procurement = await apiGet<Procurement>(
    `/api/procurements/${id}`,
  ).catch(() => null);
  if (!procurement) notFound();

  // Decisions are final — once approved/declined the request is read-only.
  if (procurement.status !== "PENDING") {
    redirect(`/procurements/${id}`);
  }

  return (
    <ProcurementForm
      canChooseRequester={false}
      requesterId={procurement.requestedById}
      requesterName={procurement.requestedBy?.name ?? null}
      employees={[]}
      initial={procurement}
    />
  );
}
