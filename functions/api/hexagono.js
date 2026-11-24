import {
  getSeriesKv,
  jsonResponse,
  kvMissingResponse,
  loadHexagonoRecord,
  optionsResponse,
  readJsonBody,
  saveHexagonoRecord,
  verifyAlexToken
} from './_hexagono-store.js';

export function onRequestOptions() {
  return optionsResponse();
}

/**
 * Devuelve el tablero público del Hexágono de Arquetipos e indica si el token actual pertenece a @alex.
 */
export async function onRequestGet(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  try {
    const [record, auth] = await Promise.all([
      loadHexagonoRecord(kv),
      verifyAlexToken(kv, context.request)
    ]);

    return jsonResponse(
      {
        board: record.board,
        isDefault: record.isDefault,
        updatedAt: record.updatedAt,
        updatedBy: record.updatedBy,
        canEdit: auth.authorized,
        alexExists: auth.alexExists
      },
      200
    );
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudo cargar el Hexágono de Arquetipos.', details: err.message },
      500
    );
  }
}

/**
 * Guarda cambios del Hexágono de Arquetipos únicamente cuando la sesión pertenece al usuario @alex.
 */
export async function onRequestPut(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  try {
    const auth = await verifyAlexToken(kv, context.request);
    if (!auth.hasToken) {
      return jsonResponse(
        { error: 'Necesitas iniciar sesión como @alex para guardar cambios.' },
        401
      );
    }

    if (!auth.alexExists) {
      return jsonResponse(
        { error: 'El usuario @alex aún no existe en la base de datos.' },
        403
      );
    }

    if (!auth.authorized) {
      return jsonResponse(
        { error: 'Solo el usuario @alex tiene permiso para editar el hexágono.' },
        403
      );
    }

    const parsed = await readJsonBody(context.request);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, parsed.status);
    }

    if (!parsed.body.board || typeof parsed.body.board !== 'object' || Array.isArray(parsed.body.board)) {
      return jsonResponse({ error: 'Faltan los datos del tablero para guardar.' }, 400);
    }

    const saved = await saveHexagonoRecord(kv, parsed.body.board);

    return jsonResponse(
      {
        ok: true,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
        board: saved.board
      },
      200
    );
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudieron guardar los cambios del hexágono.', details: err.message },
      500
    );
  }
}
