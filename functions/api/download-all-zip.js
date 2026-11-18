import { CORS_HEADERS, getMinehostConfig, jsonResponse, pteroFetch } from './_minehost.js';

const SERVER_KW = ['chunky', 'ftbbackups', 'ftb-ranks', 'ftb-essentials', 'spark', 'skinrestorer', 'daytimecontrol', 'madeinsleep'];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const cfg = getMinehostConfig(env);
  if (!cfg) {
    return jsonResponse({ error: 'Faltan variables de entorno en Cloudflare' }, 500, CORS_HEADERS);
  }

  try {
    let files = [];
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (Array.isArray(body.files) && body.files.length > 0) files = body.files;
      } catch {}
    }

    if (files.length === 0) {
      const listRes = await pteroFetch(cfg, '/files/list?directory=%2Fmods');
      if (!listRes.ok) {
        return jsonResponse({ error: 'Error al listar mods en Minehost' }, listRes.status, CORS_HEADERS);
      }
      const listData = await listRes.json();
      files = (listData.data || [])
        .filter((i) => i.attributes?.name?.endsWith('.jar'))
        .map((i) => i.attributes.name)
        .filter((n) => !SERVER_KW.some((k) => n.toLowerCase().includes(k)));
    }

    async function doCompress(root, fileList) {
      const r = await pteroFetch(cfg, '/files/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root, files: fileList })
      });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      const name = json?.attributes?.name || json?.name || json?.data?.attributes?.name || null;
      return { ok: r.ok, text, json, name, status: r.status };
    }

    let c = await doCompress('/mods', files);
    let archiveName = c.name;
    if (!c.ok || !archiveName) {
      const altFiles = files.map((f) => 'mods/' + f);
      const c2 = await doCompress('/', altFiles);
      if (c2.ok) {
        c = c2;
        if (c2.name) archiveName = c2.name;
      } else if (!c.ok) {
        return jsonResponse({ error: (c2.text || c.text).slice(0, 800) }, 500, CORS_HEADERS);
      }
    }

    // Buscar nombre del archivo comprimido si no vino explícito en la respuesta
    if (!archiveName) {
      const m = c.text.match(/archive[^"\s]*\.(zip|tar\.gz)/i);
      if (m) archiveName = m[0];
    }

    if (!archiveName) {
      await new Promise((r) => setTimeout(r, 900));
      for (const dir of ['%2Fmods', '%2F']) {
        const lr = await pteroFetch(cfg, `/files/list?directory=${dir}`);
        const lt = await lr.text();
        try {
          const lj = JSON.parse(lt);
          const arr = lj.data || lj;
          const cand = (Array.isArray(arr) ? arr : [])
            .map((x) => (x.attributes || x).name)
            .filter((n) => n && n.toLowerCase().includes('archive'))
            .sort((a, b) => b.localeCompare(a));
          if (cand.length) {
            archiveName = dir === '%2Fmods' ? 'mods/' + cand[0] : cand[0];
            break;
          }
        } catch {}
      }
    }

    if (!archiveName) {
      return jsonResponse({ error: 'No archive', details: c.text.slice(0, 600) }, 500, CORS_HEADERS);
    }

    const fileParam = archiveName.startsWith('/') ? archiveName : '/' + archiveName;
    const dlRes = await pteroFetch(cfg, `/files/download?file=${encodeURIComponent(fileParam)}`);
    const dlText = await dlRes.text();
    if (!dlRes.ok) {
      return jsonResponse({ error: 'Error al obtener URL de descarga', details: dlText.slice(0, 600) }, dlRes.status, CORS_HEADERS);
    }
    let dlData;
    try {
      dlData = JSON.parse(dlText);
    } catch {
      return jsonResponse({ error: 'dl json', details: dlText.slice(0, 600) }, 500, CORS_HEADERS);
    }

    const wingsUrl = dlData.attributes?.url || dlData.data?.attributes?.url;
    if (!wingsUrl) {
      return jsonResponse({ error: 'No url', raw: dlData }, 500, CORS_HEADERS);
    }

    const fileRes = await fetch(wingsUrl);
    if (!fileRes.ok) {
      return jsonResponse({ error: 'Error al descargar el ZIP desde el nodo' }, fileRes.status, CORS_HEADERS);
    }
    return new Response(fileRes.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(archiveName.split('/').pop())}"`,
        'Access-Control-Allow-Origin': CORS_HEADERS['Access-Control-Allow-Origin'],
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  } catch (e) {
    return jsonResponse({ error: e.message, stack: e.stack?.slice(0, 400) }, 500, CORS_HEADERS);
  }
}
