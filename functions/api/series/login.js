import {
  MAX_SESSIONS_PER_USER,
  generateSessionToken,
  getSeriesKv,
  getUserRecord,
  hashToken,
  jsonResponse,
  kvMissingResponse,
  normalizeUsername,
  optionsResponse,
  readJsonBody,
  saveUserRecord,
  toPublicUserPayload,
  validatePin,
  verifyPin
} from '../_series-store.js';

export function onRequestOptions() {
  return optionsResponse();
}

/**
 * Autentica al propietario de un perfil y emite un nuevo token de sesión.
 */
export async function onRequestPost(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  const parsed = await readJsonBody(context.request);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  const userCheck = normalizeUsername(parsed.body.username);
  if (!userCheck.ok) {
    return jsonResponse({ error: 'Usuario o clave incorrectos.' }, 401);
  }

  const pinCheck = validatePin(parsed.body.pin);
  if (!pinCheck.ok) {
    return jsonResponse({ error: 'Usuario o clave incorrectos.' }, 401);
  }

  try {
    const record = await getUserRecord(kv, userCheck.slug);
    if (!record) {
      return jsonResponse({ error: 'Usuario o clave incorrectos.' }, 401);
    }

    const pinValid = await verifyPin(pinCheck.pin, record.pinSalt, record.pinHash);
    if (!pinValid) {
      return jsonResponse({ error: 'Usuario o clave incorrectos.' }, 401);
    }

    const token = generateSessionToken();
    const tokenHash = await hashToken(token);
    const currentSessions = Array.isArray(record.sessions) ? record.sessions : [];
    record.sessions = [...currentSessions, tokenHash].slice(-MAX_SESSIONS_PER_USER);

    await saveUserRecord(kv, record);

    return jsonResponse(
      {
        token,
        profile: toPublicUserPayload(record)
      },
      200
    );
  } catch (err) {
    return jsonResponse(
      { error: 'Error al iniciar sesión.', details: err.message },
      500
    );
  }
}
