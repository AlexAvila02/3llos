exports.handler = async (event) => {
  const { MINEHOST_URL, MINEHOST_API_KEY, MINEHOST_SERVER_ID } = process.env;
  if (!MINEHOST_URL || !MINEHOST_API_KEY || !MINEHOST_SERVER_ID) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Faltan variables de entorno' })
    };
  }
  const filename = event.queryStringParameters && event.queryStringParameters.file;
  if (!filename) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Parametro ?file= requerido' }) };
  }
  if (!filename.endsWith('.jar')) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Solo se permiten archivos .jar' }) };
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Nombre de archivo invalido' }) };
  }
  const endpoint = `${MINEHOST_URL.replace(/\/$/, '')}/api/client/servers/${MINEHOST_SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`;
  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('download-mod Pterodactyl error', res.status, text);
      return { statusCode: res.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error al obtener URL de descarga', details: text }) };
    }
    const json = await res.json();
    const url = json?.attributes?.url || json?.data?.attributes?.url;
    if (!url) {
      console.error('download-mod no url', json);
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio URL de descarga', raw: json }) };
    }
    return { statusCode: 302, headers: { Location: url }, body: '' };
  } catch (err) {
    console.error('download-mod exception', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error interno', details: err.message }) };
  }
};
