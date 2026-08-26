import { and, desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  notify,
  ok,
  parseJson,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";
import { getTenantLocale } from "@/lib/server/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;
const INTERVIEW_MINUTES = 45;

/** RFC5545 UTC timestamp, e.g. `20260825T140000Z`. */
function icsTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Build a one-event iCalendar payload for an interview invitation. */
function buildInterviewIcs(input: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  organizer: { name: string; email: string };
  attendees: Array<{ name: string; email: string }>;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gente HR//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(input.start)}`,
    `DTEND:${icsTime(input.end)}`,
    `SUMMARY:${input.summary}`,
    `DESCRIPTION:${input.description}`,
    `ORGANIZER;CN=${input.organizer.name}:mailto:${input.organizer.email}`,
    ...input.attendees.map(
      (attendee) =>
        `ATTENDEE;CN=${attendee.name};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:mailto:${attendee.email}`,
    ),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** POST /api/ats/applications/[id]/interviews — schedule the next round. */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const rawDate = asString(body.scheduledAt);
    const scheduledAt = new Date(rawDate);
    if (!rawDate || Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError(400, "A valid scheduled date/time is required");
    }

    // Interviewer panel: employee ids (tenant-scoped) + optional free-form
    // fallback for invitees without an employee record.
    const panelistIds = Array.isArray(body.panelistIds)
      ? body.panelistIds.filter(
          (value): value is string =>
            typeof value === "string" && UUID_RE.test(value),
        )
      : [];

    const { db, pool } = await getDb();
    const { applications, interviews, jobs, employees, tenants } =
      await import("@db/schema");
    try {
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.id, id),
            eq(applications.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!app) throw new ApiError(404, "Application not found");

      const [job] = await db
        .select({ title: jobs.title })
        .from(jobs)
        .where(eq(jobs.id, app.jobId))
        .limit(1);

      const panelists = panelistIds.length
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
              email: employees.email,
            })
            .from(employees)
            .where(
              and(
                eq(employees.tenantId, user.tenantId),
                ...panelistIds.map((panelistId) =>
                  eq(employees.id, panelistId),
                ),
              ),
            )
        : [];
      // Keep the requested order and drop unknown ids.
      const ordered = panelistIds
        .map((panelistId) => panelists.find((row) => row.id === panelistId))
        .filter((row): row is NonNullable<typeof row> => row !== undefined);

      const latest = await db
        .select({ round: interviews.round })
        .from(interviews)
        .where(
          and(
            eq(interviews.tenantId, user.tenantId),
            eq(interviews.applicationId, id),
          ),
        )
        .orderBy(desc(interviews.round))
        .limit(1);

      const [created] = await db
        .insert(interviews)
        .values({
          tenantId: user.tenantId,
          applicationId: id,
          round: (latest[0]?.round ?? 0) + 1,
          scheduledAt,
          interviewer:
            ordered.map((panelist) => panelist.name).join(", ") || null,
          panelists: ordered,
          feedback: asString(body.feedback).trim() || null,
          status: "scheduled",
        })
        .returning();

      // Calendar invite email: to the candidate, interviewers copied.
      const [tenant] = await db
        .select({ name: tenants.name, settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1);
      const organizerEmail =
        typeof tenant?.settings?.supportEmail === "string" &&
        tenant.settings.supportEmail
          ? tenant.settings.supportEmail
          : "noreply@gente.dev";
      const start = new Date(scheduledAt);
      const end = new Date(start.getTime() + INTERVIEW_MINUTES * 60_000);
      const summary = `Interview: ${app.name} — ${job?.title ?? "Job"}`;
      const description =
        `Interview round ${created.round} for ${app.name} (${job?.title ?? "Job"}).` +
        (created.interviewer ? ` Interviewer(s): ${created.interviewer}.` : "");
      const ics = buildInterviewIcs({
        uid: created.id,
        start,
        end,
        summary,
        description,
        organizer: { name: tenant?.name ?? "Gente HR", email: organizerEmail },
        attendees: [
          { name: app.name, email: app.email },
          ...ordered.map((panelist) => ({
            name: panelist.name,
            email: panelist.email,
          })),
        ],
      });
      await recordEmail({
        tenantId: user.tenantId,
        to: app.email,
        templateKey: "interview_invite",
        cc: ordered.map((panelist) => panelist.email),
        ics,
      });

      // In-app notifications for panelists with a user account.
      const locale = await getTenantLocale();
      for (const panelist of ordered) {
        const [employee] = await db
          .select({ userId: employees.userId })
          .from(employees)
          .where(eq(employees.id, panelist.id))
          .limit(1);
        if (employee?.userId) {
          await notify({
            tenantId: user.tenantId,
            userId: employee.userId,
            type: "interview",
            title: "Interview scheduled",
            body: `Round ${created.round} with ${app.name} — ${start.toLocaleString(
              locale,
              {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              },
            )}.`,
            href: `/ats/applications/${id}`,
          });
        }
      }

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.interview.schedule",
        target: app.name,
        category: "settings",
      });

      return ok(created, { status: 201 });
    } finally {
      await pool.end();
    }
  },
);
