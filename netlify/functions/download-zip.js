exports.handler = async () => {
  const { MINEHOST_URL, MINEHOST_API_KEY, MINEHOST_SERVER_ID } = process.env;
  if (!MINEHOST_URL || !MINEHOST_API_KEY || !MINEHOST_SERVER_ID) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Faltan variables de entorno' }) };
  }
  const base = MINEHOST_URL.replace(/\/$/, '');
  const SERVER_KW = ['chunky','ftbbackups','ftb-ranks','ftb-essentials','spark','skinrestorer','daytimecontrol','madeinsleep'];
  try {
    const listRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2Fmods`, {
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
    });
    if (!listRes.ok) {
      const t = await listRes.text();
      return { statusCode: listRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error listando mods', details: t }) };
    }
    const j = await listRes.json();
    const raw = j.data || j;
    let jars = (Array.isArray(raw) ? raw : []).map(x => (x.attributes || x).name || (x.attributes || x).filename).filter(n => n && n.endsWith('.jar'));
    jars = jars.filter(n => !SERVER_KW.some(k => n.toLowerCase().includes(k)));
    if (!jars.length) return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No hay mods cliente para comprimir' }) };

    const compressRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ root: '/mods', files: jars })
    });
    if (!compressRes.ok) {
      const t = await compressRes.text();
      return { statusCode: compressRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error al comprimir en Pterodactyl', details: t }) };
    }
    const cj = await compressRes.json().catch(() => ({}));
    const archiveName = cj?.attributes?.name || cj?.name || cj?.attributes?.file || cj?.file || cj?.data?.attributes?.name;
    let archive = archiveName;
    if (!archive) {
      const text = JSON.stringify(cj);
      const m = text.match(/archive[^"]+\.(zip|tar\.gz)/i);
      archive = m ? m[0] : null;
    }
    if (!archive) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio nombre de archivo comprimido', raw: cj }) };
    }
    const fileParam = archive.startsWith('/mods/') ? archive : `/mods/${archive}`;
    const dlRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/download?file=${encodeURIComponent(fileParam)}`, {
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
    });
    if (!dlRes.ok) {
      const t = await dlRes.text();
      return { statusCode: dlRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error obteniendo URL de descarga del ZIP', details: t }) };
    }
    const dj = await dlRes.json();
    const url = dj?.attributes?.url || dj?.data?.attributes?.url;
    if (!url) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio URL de descarga', raw: dj }) };
    return { statusCode: 302, headers: { Location: url }, body: '' };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
