/**
 * Send every registered email template through the tenant's configured
 * provider, and report which templates are wired up in the app.
 *
 * Usage:
 *   pnpm exec tsx --tsconfig scripts/tsconfig.scripts.json \
 *     scripts/send-email-templates.mts [recipient] [tenantSlug]
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import {
  buildBrandedEmailHtml,
  EMAIL_TEMPLATES,
  getTenantBranding,
  resolveEmailTemplate,
} from "../src/lib/server/email-template";
import { getTenantEmailSettings, sendHtmlEmail } from "../src/lib/server/email";

if (existsSync(".env")) process.loadEnvFile(".env");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const recipient = process.argv[2] ?? "olalekan.alegre@gmail.com";
const slugArg = process.argv[3];
const dryRun = process.argv.includes("--dry");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Template keys referenced by `templateKey:` anywhere in `src/`. */
function scanTemplateUsage(): Set<string> {
  const used = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        const text = readFileSync(full, "utf8");
        for (const match of text.matchAll(/templateKey:\s*"([a-z0-9_]+)"/g)) {
          used.add(match[1]);
        }
      }
    }
  };
  walk("src");
  return used;
}

interface SendResult {
  key: string;
  channel: "email" | "console";
  provider: string;
  subject: string;
  used: boolean;
  error?: string;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required (copy .env.example to .env).");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const results: SendResult[] = [];

  try {
    const tenantQuery = slugArg
      ? {
          text: "select id, slug, name from tenants where slug = $1 limit 1",
          values: [slugArg],
        }
      : {
          text: `select t.id, t.slug, t.name
                   from tenants t
                   join email_settings e on e.tenant_id = t.id
                  where e.provider <> 'console'
                  order by t.slug
                  limit 1`,
          values: [] as string[],
        };

    let [tenant] = (
      await pool.query<{ id: string; slug: string; name: string }>(
        tenantQuery.text,
        tenantQuery.values,
      )
    ).rows;
    if (!tenant) {
      [tenant] = (
        await pool.query<{ id: string; slug: string; name: string }>(
          `select t.id, t.slug, t.name
             from tenants t
             left join email_settings e on e.tenant_id = t.id
            order by (e.id is null), t.slug
            limit 1`,
        )
      ).rows;
    }
    if (!tenant) throw new Error("No tenant found in the database");

    const settings = await getTenantEmailSettings(tenant.id);
    const branding = await getTenantBranding(tenant.id);
    const used = scanTemplateUsage();
    const keys = Object.keys(EMAIL_TEMPLATES);

    const credentialKeys = Object.keys(settings.credentials ?? {}).filter(
      (key) => settings.credentials[key],
    );

    console.log("── Email configuration ──────────────────────────────");
    console.log(`tenant:      ${tenant.name} (${tenant.slug}, ${tenant.id})`);
    console.log(`provider:    ${settings.provider}`);
    console.log(
      `from:        ${settings.senderName} <${settings.senderEmail}>`,
    );
    console.log(`reply-to:    ${settings.replyTo ?? "—"}`);
    console.log(
      `credentials: ${credentialKeys.length ? credentialKeys.join(", ") : "none"}`,
    );
    console.log(`recipient:   ${recipient}`);
    console.log(`templates:   ${keys.length}`);
    console.log("─────────────────────────────────────────────────────\n");

    for (const key of keys) {
      const template = resolveEmailTemplate(key, branding);
      const html = buildBrandedEmailHtml({
        branding,
        title: template.subject,
        body: template.body,
      });
      const subject = `[Test] ${template.subject}`;
      if (dryRun) {
        const links = [...html.matchAll(/href="([^"]+)"/g)].map(
          (match) => match[1],
        );
        console.log(
          `${key.padEnd(24)} ${links.length ? links.join(", ") : "(no links)"}`,
        );
        continue;
      }
      try {
        const delivery = await sendHtmlEmail({
          to: recipient,
          subject,
          html,
          fromName: settings.senderName,
          fromEmail: settings.senderEmail,
          replyTo: settings.replyTo,
          provider: settings.provider,
          credentials: settings.credentials,
          apiKey: process.env.RESEND_API_KEY,
        });
        results.push({
          key,
          channel: delivery.channel,
          provider: delivery.provider,
          subject,
          used: used.has(key),
        });
        const mark = delivery.channel === "email" ? "✓ sent" : "⚠ console";
        console.log(
          `${mark.padEnd(8)} ${key.padEnd(24)} via ${delivery.provider}` +
            (used.has(key) ? "" : "  (not referenced by the app)"),
        );
      } catch (error) {
        results.push({
          key,
          channel: "console",
          provider: settings.provider,
          subject,
          used: used.has(key),
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`✗ failed ${key}: ${String(error)}`);
      }
      await sleep(600);
    }
  } finally {
    await pool.end();
  }

  const sent = results.filter((r) => r.channel === "email").length;
  const fellBack = results.filter((r) => r.channel !== "email").length;
  const unused = results.filter((r) => !r.used).map((r) => r.key);

  if (dryRun) {
    console.log("\n(dry run — no emails sent)");
    return;
  }

  console.log("\n── Summary ──────────────────────────────────────────");
  console.log(`delivered by provider: ${sent}/${results.length}`);
  console.log(`console fallback:      ${fellBack}`);
  if (unused.length) {
    console.log(`not referenced in app: ${unused.join(", ")}`);
  }
  console.log("─────────────────────────────────────────────────────");

  if (fellBack > 0) process.exitCode = 1;
}

await main();
