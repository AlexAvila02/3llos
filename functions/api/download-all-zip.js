export async function onRequestGet(context) {
  const { env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;
  if (!PANEL_URL || !API_KEY || !SERVER_ID) {
    return new Response(JSON.stringify({ error: "Faltan variables de entorno en Cloudflare" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const base = PANEL_URL.replace(/\/$/, '');
  try {
    const cr = await fetch(`${base}/api/client/servers/${SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ root: '/mods', files: [] })
    });
    const ct = await cr.text();
    if (!cr.ok) return new Response(JSON.stringify({ error: 'Error al comprimir', details: ct.slice(0,800) }), { status: cr.status, headers: { "Content-Type": "application/json" } });
    let archiveName = null;
    try { const cj = JSON.parse(ct); archiveName = cj?.attributes?.name || cj?.name; } catch {}
    if (!archiveName) {
      const m = ct.match(/archive[^"\s]*\.(zip|tar\.gz)/i);
      if (m) archiveName = m[0];
    }
    if (!archiveName) {
      await new Promise(r => setTimeout(r, 800));
      const lr = await fetch(`${base}/api/client/servers/${SERVER_ID}/files/list?directory=%2Fmods`, { headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' } });
      const lj = await lr.json().catch(()=>({}));
      const arr = lj.data || lj;
      const f = (Array.isArray(arr)?arr:[]).map(x=>(x.attributes||x).name).find(n=>n&&n.toLowerCase().includes('archive'));
      if (f) archiveName = f;
    }
    if (!archiveName) return new Response(JSON.stringify({ error: 'No archive name', raw: ct.slice(0,600) }), { status: 500, headers: { "Content-Type": "application/json" } });
    const fileParam = archiveName.startsWith('/mods/') ? archiveName : `/mods/${archiveName.replace(/^\//,'')}`;
    const dlRes = await fetch(`${base}/api/client/servers/${SERVER_ID}/files/download?file=${encodeURIComponent(fileParam)}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' }
    });
    const dlText = await dlRes.text();
    if (!dlRes.ok) return new Response(JSON.stringify({ error: 'Error download url', details: dlText.slice(0,600) }), { status: dlRes.status, headers: { "Content-Type": "application/json" } });
    const dj = JSON.parse(dlText);
    const url = dj?.attributes?.url || dj?.data?.attributes?.url;
    if (!url) return new Response(JSON.stringify({ error: 'No url', raw: dj }), { status: 500, headers: { "Content-Type": "application/json" } });
    return Response.redirect(url, 302);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
