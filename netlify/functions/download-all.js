const JSZip = (() => { try { return require('jszip'); } catch { return null; } })();

exports.handler = async () => {
  const { MINEHOST_URL, MINEHOST_API_KEY, MINEHOST_SERVER_ID } = process.env;
  if (!MINEHOST_URL || !MINEHOST_API_KEY || !MINEHOST_SERVER_ID) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Faltan variables de entorno' }) };
  }
  if (!JSZip) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Falta dependencia jszip. Ejecuta: npm i jszip' }) };
  }
  const listUrl = `${MINEHOST_URL.replace(/\/$/, '')}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2Fmods`;
  try {
    const r = await fetch(listUrl, { headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' } });
    if (!r.ok) return { statusCode: r.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error listando mods' }) };
    const j = await r.json();
    const raw = j.data || j;
    let jars = (Array.isArray(raw) ? raw : []).map(x => (x.attributes || x).name || (x.attributes || x).filename).filter(n => n && n.endsWith('.jar'));
    const SERVER_KW=['chunky','ftbbackups','ftb-ranks','ftb-essentials','spark','skinrestorer','daytimecontrol','madeinsleep'];
    jars = jars.filter(n => !SERVER_KW.some(k => n.toLowerCase().includes(k)));
    if (!jars.length) return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No hay mods .jar (cliente)' }) };

    const zip = new JSZip();
    for (const filename of jars) {
      const dlUrl = `${MINEHOST_URL.replace(/\/$/, '')}/api/client/servers/${MINEHOST_SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`;
      const dr = await fetch(dlUrl, { headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' } });
      if (!dr.ok) continue;
      const dj = await dr.json();
      const url = dj?.attributes?.url || dj?.data?.attributes?.url;
      if (!url) continue;
      const fileRes = await fetch(url);
      if (!fileRes.ok) continue;
      const buf = Buffer.from(await fileRes.arrayBuffer());
      zip.file(filename, buf);
    }
    if (Object.keys(zip.files).length === 0) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se pudo empaquetar ningun mod' }) };
    const content = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="mods.zip"'
      },
      body: content,
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
