exports.handler = async () => {
  const { MINEHOST_URL, MINEHOST_API_KEY, MINEHOST_SERVER_ID } = process.env;
  if (!MINEHOST_URL || !MINEHOST_API_KEY || !MINEHOST_SERVER_ID) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Faltan variables de entorno' }) };
  }
  const base = MINEHOST_URL.replace(/\/$/, '');
  try {
    const compressRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ root: '/mods', files: [] })
    });
    const compressText = await compressRes.text();
    if (!compressRes.ok) {
      console.error('compress error', compressRes.status, compressText);
      return { statusCode: compressRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error al comprimir en Pterodactyl', details: compressText.slice(0,800) }) };
    }
    let archiveName = null;
    try { const cj = JSON.parse(compressText); archiveName = cj?.attributes?.name || cj?.name || cj?.data?.attributes?.name; } catch {}
    if (!archiveName) {
      const m = compressText.match(/archive[^"\s]*\.(zip|tar\.gz)/i);
      if (m) archiveName = m[0];
    }
    if (!archiveName) {
      await new Promise(r => setTimeout(r, 800));
      const listRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2Fmods`, {
        headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
      });
      const listText = await listRes.text();
      try {
        const lj = JSON.parse(listText);
        const arr = lj.data || lj;
        const found = (Array.isArray(arr) ? arr : []).map(x => (x.attributes || x).name).find(n => n && n.toLowerCase().includes('archive'));
        if (found) archiveName = found;
      } catch {}
    }
    if (!archiveName) {
      console.error('no archive name', compressText);
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio nombre de archivo comprimido', raw: compressText.slice(0,600) }) };
    }
    const fileParam = archiveName.startsWith('/mods/') ? archiveName : `/mods/${archiveName.replace(/^\//,'')}`;
    const dlRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/download?file=${encodeURIComponent(fileParam)}`, {
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
    });
    const dlText = await dlRes.text();
    if (!dlRes.ok) {
      console.error('download url error', dlRes.status, dlText);
      return { statusCode: dlRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error obteniendo URL de descarga del ZIP', details: dlText.slice(0,600) }) };
    }
    let dj; try { dj = JSON.parse(dlText); } catch { return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'download json parse', details: dlText.slice(0,600) }) }; }
    const url = dj?.attributes?.url || dj?.data?.attributes?.url;
    if (!url) {
      console.error('no url', dj);
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio URL de descarga', raw: dj }) };
    }
    return { statusCode: 302, headers: { Location: url }, body: '' };
  } catch (e) {
    console.error('download-all-zip exception', e);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
