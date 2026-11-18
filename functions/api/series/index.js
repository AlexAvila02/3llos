import {
  getSeriesKv,
  jsonResponse,
  kvMissingResponse,
  listAllProfiles,
  optionsResponse
} from '../_series-store.js';

export function onRequestOptions() {
  return optionsResponse();
}

/**
 * Lista todos los perfiles públicos del Series Tracker ordenados por actualización reciente.
 */
export async function onRequestGet(context) {
  const kv = getSeriesKv(context.env);
  if (!kv) {
    return kvMissingResponse();
  }

  try {
    const users = await listAllProfiles(kv);
    return jsonResponse({ users }, 200);
  } catch (err) {
    return jsonResponse(
      { error: 'No se pudo consultar la lista de usuarios.', details: err.message },
      500
    );
  }
}
