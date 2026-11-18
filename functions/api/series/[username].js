import {
  extractBearerToken,
  getSeriesKv,
  getUserRecord,
  isValidSession,
  jsonResponse,
  kvMissingResponse,
  normalizeUsername,
  optionsResponse,
  readJsonBody,
  sanitizeTrackerData,
  saveUserRecord,
  toPublicUserPayload
} from '../_series-store.js';

export function onRequestOptions() {
  return optionsResponse();
}

function resolveUsernameParam(params) {
  let decoded = '';
  try {
    decoded = decodeURIComponent(String(params?.username || ''));
  } catch {
    return { ok: false, error: 'Nombre de usuario inválido en la URL.' };
  }
  return normalizeUsername(decoded);
}

/**
 * Devuelve el perfil público y las series de un usuario en modo solo lectura.
 */
export async function onRequestGet(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  const userCheck = resolveUsernameParam(context.params);
  if (!userCheck.ok) {
    return jsonResponse({ error: userCheck.error }, 400);
  }

  try {
    const record = await getUserRecord(kv, userCheck.slug);
    if (!record) {
      return jsonResponse({ error: 'Perfil de usuario no encontrado.' }, 404);
    }

    return jsonResponse({ profile: toPublicUserPayload(record) }, 200);
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudo cargar el perfil.', details: err.message },
      500
    );
  }
}

/**
 * Actualiza las series de un perfil únicamente si el token Bearer corresponde al dueño.
 */
export async function onRequestPut(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  const userCheck = resolveUsernameParam(context.params);
  if (!userCheck.ok) {
    return jsonResponse({ error: userCheck.error }, 400);
  }

  const token = extractBearerToken(context.request);
  if (!token) {
    return jsonResponse(
      { error: 'Necesitas iniciar sesión como propietario para guardar cambios.' },
      401
    );
  }

  try {
    const record = await getUserRecord(kv, userCheck.slug);
    if (!record) {
      return jsonResponse({ error: 'Perfil de usuario no encontrado.' }, 404);
    }

    const authorized = await isValidSession(record, token);
    if (!authorized) {
      return jsonResponse(
        { error: 'Sesión inválida o expirada. Inicia sesión nuevamente.' },
        401
      );
    }

    const parsed = await readJsonBody(context.request);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, parsed.status);
    }

    if (!parsed.body.data || typeof parsed.body.data !== 'object' || Array.isArray(parsed.body.data)) {
      return jsonResponse({ error: 'Faltan los datos del tracker para guardar.' }, 400);
    }

    record.data = sanitizeTrackerData(parsed.body.data);
    record.updatedAt = new Date().toISOString();

    const summary = await saveUserRecord(kv, record);

    return jsonResponse(
      {
        ok: true,
        updatedAt: record.updatedAt,
        summary
      },
      200
    );
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudieron guardar los cambios del tracker.', details: err.message },
      500
    );
  }
}
