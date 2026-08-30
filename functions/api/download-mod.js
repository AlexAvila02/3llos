export async function onRequestGet(context) {
  const { request, env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;
  if (!PANEL_URL || !API_KEY || !SERVER_ID) {
    return new Response(JSON.stringify({ error: "Faltan variables de entorno en Cloudflare" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(request.url);
  const filename = url.searchParams.get('file');
  if (!filename) return new Response(JSON.stringify({ error: "Parametro ?file= requerido" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (!filename.endsWith('.jar')) return new Response(JSON.stringify({ error: "Solo .jar" }), { status: 400, headers: { "Content-Type": "application/json" } });
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return new Response(JSON.stringify({ error: "Nombre invalido" }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const endpoint = `${PANEL_URL.replace(/\/$/, '')}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' } });
    if (!res.ok) {
      const t = await res.text();
      console.error('download-mod error', res.status, t);
      return new Response(JSON.stringify({ error: 'Error al obtener URL', details: t }), { status: res.status, headers: { "Content-Type": "application/json" } });
    }
    const j = await res.json();
    const dlUrl = j?.attributes?.url || j?.data?.attributes?.url;
    if (!dlUrl) return new Response(JSON.stringify({ error: 'No url', raw: j }), { status: 500, headers: { "Content-Type": "application/json" } });
    return Response.redirect(dlUrl, 302);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
