/**
 * Stateless session tokens: the login session lives entirely in an httpOnly
 * cookie as an HMAC-signed payload (no DB table, no localStorage). The server
 * verifies the signature on every request, so sessions cannot be forged and
 * no session lookup is needed.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SESSION_TTL_SECONDS } from '../session-cookie';
import type { SessionUser } from './auth';

interface SessionPayload {
  uid: string;
  tid: string;
  role: SessionUser['role'];
  name: string;
  email: string;
  /** Unix seconds — expiry of the session. */
  exp: number;
}

/**
 * Secret used to sign session cookies. Set `AUTH_SESSION_SECRET` in
 * production; the dev fallback keeps local development working.
 */
const SECRET =
  process.env.AUTH_SESSION_SECRET ?? 'gente-dev-insecure-secret-change-me';

function sign(payloadB64: string): string {
  return createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

/** Create a signed session cookie value for a user. */
export function signSession(user: SessionUser): string {
  const payload: SessionPayload = {
    uid: user.id,
    tid: user.tenantId,
    role: user.role,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verify a session cookie value; returns the user or null when invalid/expired. */
export function verifySession(token: string): SessionUser | null {
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as Partial<SessionPayload>;
    if (
      typeof payload.uid !== 'string' ||
      typeof payload.tid !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    if (payload.exp * 1000 < Date.now()) return null;

    return {
      id: payload.uid,
      tenantId: payload.tid,
      role: payload.role === 'admin' || payload.role === 'hr' ? payload.role : 'member',
      name: payload.name,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
