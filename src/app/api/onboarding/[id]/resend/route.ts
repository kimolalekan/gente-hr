import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  getDb,
  ok,
  recordEmail,
  requireRole,
  route,
  signToken,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rebuild the invite link and re-send the invite email. */
export const POST = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (id === "complete") throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    try {
      const { onboardingPlans } = await import("@db/schema");
      const [plan] = await db
        .select()
        .from(onboardingPlans)
        .where(
          and(
            eq(onboardingPlans.id, id),
            eq(onboardingPlans.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!plan) throw new ApiError(404, "Onboarding plan not found");

      const origin = new URL(request.url).origin;
      const token = signToken({ planId: plan.id, email: plan.email });
      const inviteLink = `${origin}/onboarding/complete?token=${encodeURIComponent(token)}`;

      await recordEmail({
        tenantId: user.tenantId,
        to: plan.email,
        templateKey: "onboarding_invite",
      });
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "onboarding.resend",
        target: plan.id,
        category: "onboarding",
      });

      return ok({ resent: true, inviteLink });
    } finally {
      await pool.end();
    }
  },
);
