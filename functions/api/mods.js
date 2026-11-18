import { getMinehostConfig, jsonResponse, pteroFetch } from './_minehost.js';

export async function onRequestGet(context) {
  const cfg = getMinehostConfig(context.env);
  if (!cfg) {
    return jsonResponse({ error: 'Faltan variables de entorno en Cloudflare' }, 500);
  }

  try {
    const response = await pteroFetch(cfg, '/files/list?directory=%2Fmods');
    if (!response.ok) {
      return jsonResponse({ error: 'Error de conexión con Minehost' }, response.status);
    }

    const data = await response.json();
    const mods = (data.data || [])
      .filter((item) => item.attributes.name.endsWith('.jar'))
      .map((item) => ({
        filename: item.attributes.name,
        name: item.attributes.name.replace('.jar', ''),
        size: `${(item.attributes.size / (1024 * 1024)).toFixed(2)} MB`,
        sizeBytes: item.attributes.size,
        updatedAt: item.attributes.modified_at
      }));

    return jsonResponse(mods);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}
