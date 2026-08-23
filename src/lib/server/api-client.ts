/**
 * Server-side client for the app's own API routes.
 *
 * Pages (server components) fetch from `/api/...` through these helpers so all
 * data comes from the same endpoints the browser would call. The session
 * cookie is forwarded so the routes' auth/tenant guards apply, and the
 * `{ ok, data }` envelope is unwrapped (throwing on `{ ok: false }`).
 */
import "server-only";
import { cookies, headers } from "next/headers";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

/** Resolve a relative `/api/...` path to an absolute URL (Node fetch needs one). */
async function toAbsoluteUrl(path: string): Promise<string> {
  if (/^https?:\/\//.test(path)) return path;
  const host = (await headers()).get("host");
  const base = host ? `http://${host}` : "http://localhost:3000";
  return new URL(path, base).toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const url = await toAbsoluteUrl(path);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    // Non-JSON response (e.g. a redirect to login) — treat as a failure.
  }

  if (!body?.ok) {
    throw new ApiClientError(
      response.status,
      body?.error ?? `Request failed (${response.status})`,
    );
  }
  return body.data as T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET with optional query params (empty/undefined values are skipped). */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const url = new URL(path, "http://internal");
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return request<T>(`${url.pathname}${url.search}`);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
