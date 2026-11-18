import {
  createEmptyTrackerData,
  generateSessionToken,
  getSeriesKv,
  getUserRecord,
  hashPin,
  hashToken,
  jsonResponse,
  kvMissingResponse,
  normalizeUsername,
  optionsResponse,
  readJsonBody,
  sanitizeTrackerData,
  saveUserRecord,
  toPublicUserPayload,
  validatePin
} from '../_series-store.js';

export function onRequestOptions() {
  return optionsResponse();
}

/**
 * Crea un nuevo perfil de usuario con clave protegida e inicia su primera sesión.
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
    return jsonResponse({ error: userCheck.error }, 400);
  }

  const pinCheck = validatePin(parsed.body.pin);
  if (!pinCheck.ok) {
    return jsonResponse({ error: pinCheck.error }, 400);
  }

  try {
    const existing = await getUserRecord(kv, userCheck.slug);
    if (existing) {
      return jsonResponse(
        { error: 'Ese nombre de usuario ya existe. Inicia sesión con tu clave si es tuyo.' },
        409
      );
    }

    const { saltHex, hashHex } = await hashPin(pinCheck.pin);
    const token = generateSessionToken();
    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();

    const trackerData = parsed.body.data
      ? sanitizeTrackerData(parsed.body.data)
      : createEmptyTrackerData();

    const record = {
      slug: userCheck.slug,
      displayName: userCheck.displayName,
      pinSalt: saltHex,
      pinHash: hashHex,
      sessions: [tokenHash],
      createdAt: now,
      updatedAt: now,
      data: trackerData
    };

    await saveUserRecord(kv, record);

    return jsonResponse(
      {
        token,
        profile: toPublicUserPayload(record)
      },
      201
    );
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudo crear el perfil de usuario.', details: err.message },
      500
    );
  }
}
