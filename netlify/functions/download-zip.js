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
      return { statusCode: listRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error listando mods: ' + listRes.status, details: t }) };
    }
    const j = await listRes.json();
    const raw = j.data || j;
    let jars = (Array.isArray(raw) ? raw : []).map(x => (x.attributes || x).name || (x.attributes || x).filename).filter(n => n && n.endsWith('.jar'));
    jars = jars.filter(n => !SERVER_KW.some(k => n.toLowerCase().includes(k)));
    if (!jars.length) return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No hay mods cliente para comprimir' }) };

    let compressRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ root: '/mods', files: jars })
    });
    let compressText = await compressRes.text();
    let archiveName = null;
    if (compressRes.ok) {
      try { const cj = JSON.parse(compressText); archiveName = cj?.attributes?.name || cj?.name || cj?.attributes?.file || cj?.file || cj?.data?.attributes?.name; } catch {}
      if (!archiveName) {
        const m = compressText.match(/archive[^"]*\.(zip|tar\.gz)/i);
        if (m) archiveName = m[0];
      }
    }
    if (!compressRes.ok || !archiveName) {
      const fallbackRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/compress`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ root: '/', files: ['mods'] })
      });
      const fbText = await fallbackRes.text();
      if (!fallbackRes.ok) {
        return { statusCode: fallbackRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error al comprimir (intento 1: ' + compressRes.status + ' ' + compressText.slice(0,300) + ' | intento 2: ' + fallbackRes.status + ' ' + fbText.slice(0,300) + ')' }) };
      }
      try { const cj2 = JSON.parse(fbText); archiveName = cj2?.attributes?.name || cj2?.name || cj2?.attributes?.file || cj2?.file; } catch {}
      if (!archiveName) {
        const m2 = fbText.match(/archive[^"]*\.(zip|tar\.gz)/i);
        archiveName = m2 ? m2[0] : null;
      }
      if (!archiveName) {
        await new Promise(r => setTimeout(r, 800));
        const list2 = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2F`, { headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' } });
        const lj = await list2.json().catch(()=>({}));
        const arr2 = lj.data || lj;
        const found = (Array.isArray(arr2)?arr2:[]).map(x=>(x.attributes||x).name).find(n=> n && n.toLowerCase().includes('archive') && (n.endsWith('.zip')||n.endsWith('.tar.gz')));
        if (found) archiveName = found;
      }
      if (!archiveName) {
        const list3 = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/list?directory=%2Fmods`, { headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' } });
        const lj3 = await list3.json().catch(()=>({}));
        const arr3 = lj3.data || lj3;
        const found3 = (Array.isArray(arr3)?arr3:[]).map(x=>(x.attributes||x).name).find(n=> n && n.toLowerCase().includes('archive'));
        if (found3) archiveName = 'mods/' + found3; else archiveName = found ? found : null;
      }
    }
    if (!archiveName) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio nombre de archivo comprimido. Respuesta: ' + compressText.slice(0,500) }) };
    }
    let fileParam = archiveName;
    if (!fileParam.startsWith('/') && !fileParam.startsWith('mods/')) fileParam = '/' + fileParam;
    if (fileParam.startsWith('/mods/')) {} else if (!fileParam.includes('/')) fileParam = '/mods/' + archiveName.replace(/^\//,'');
    else if (fileParam.startsWith('/')) {} else fileParam = '/' + fileParam;

    const dlRes = await fetch(`${base}/api/client/servers/${MINEHOST_SERVER_ID}/files/download?file=${encodeURIComponent(fileParam)}`, {
      headers: { Authorization: `Bearer ${MINEHOST_API_KEY}`, Accept: 'application/json' }
    });
    if (!dlRes.ok) {
      const t = await dlRes.text();
      return { statusCode: dlRes.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error obteniendo URL de descarga del ZIP: ' + fileParam, details: t }) };
    }
    const dj = await dlRes.json();
    const url = dj?.attributes?.url || dj?.data?.attributes?.url;
    if (!url) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No se recibio URL de descarga', raw: dj }) };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};
