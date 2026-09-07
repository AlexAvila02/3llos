exports.handler = async () => {
  const { MINEHOST_URL, MINEHOST_API_KEY, MINEHOST_SERVER_ID } = process.env;
  if (!MINEHOST_URL || !MINEHOST_API_KEY || !MINEHOST_SERVER_ID) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Faltan variables de entorno MINEHOST_URL / MINEHOST_API_KEY / MINEHOST_SERVER_ID' })
    };
  }
  const endpoint = `${MINEHOST_URL.replace(/\/$/, '')}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2Fmods`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${MINEHOST_API_KEY}`,
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Error al consultar Pterodactyl', details: text })
      };
    }
    const json = await res.json();
    const raw = json.data || json;
    const list = Array.isArray(raw) ? raw : [];
    const mods = list
      .map(item => {
        const attr = item.attributes || item;
        return { filename: attr.name || attr.filename, sizeBytes: attr.size ?? attr.bytes ?? 0, updatedAt: attr.modified_at || attr.modifiedAt || attr.mtime || null };
      })
      .filter(m => m.filename && m.filename.endsWith('.jar'))
      .map(m => ({
        filename: m.filename,
        name: m.filename.replace(/\.jar$/i, ''),
        size: (m.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
        sizeBytes: m.sizeBytes,
        updatedAt: m.updatedAt
      }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(mods)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno', details: err.message })
    };
  }
};
