/**
 * Session cookie constants — dependency-free so both the middleware (edge
 * runtime) and Node server code can import them.
 */
export const SESSION_COOKIE = 'gente_session';
export const SESSION_TTL_DAYS = 30;
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
