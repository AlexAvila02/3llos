import {
  extractBearerToken,
  getSeriesKv,
  getUserRecord,
  hashToken,
  jsonResponse,
  kvMissingResponse,
  normalizeUsername,
  optionsResponse,
  readJsonBody,
  saveUserRecord,
  timingSafeEqualHex
} from '../_series-store.js';

export function onRequestOptions() {
  return optionsResponse();
}

/**
 * Revoca únicamente el token de sesión actual del dispositivo que cierra sesión.
 */
export async function onRequestPost(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  const token = extractBearerToken(context.request);
  const parsed = await readJsonBody(context.request);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  const rawIdentifier = parsed.body.slug || parsed.body.username || '';
  const userCheck = normalizeUsername(rawIdentifier);
  if (!userCheck.ok || !token) {
    return jsonResponse({ ok: true }, 200);
  }

  try {
    const record = await getUserRecord(kv, userCheck.slug);
    if (record && Array.isArray(record.sessions) && record.sessions.length > 0) {
      const tokenHash = await hashToken(token);
      const nextSessions = record.sessions.filter((stored) => !timingSafeEqualHex(stored, tokenHash));
      if (nextSessions.length !== record.sessions.length) {
        record.sessions = nextSessions;
        await saveUserRecord(kv, record);
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudo cerrar la sesión.', details: err.message },
      500
    );
  }
}
