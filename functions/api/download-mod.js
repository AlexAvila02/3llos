export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const filename = url.searchParams.get("file");

  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  if (!filename) return new Response(JSON.stringify({ error: "Falta nombre" }), { status: 400, headers: { "Content-Type": "application/json" } });

  try {
    const res = await fetch(
      `${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(filename)}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' } }
    );
    const data = await res.json();
    
    return new Response(JSON.stringify({ downloadUrl: data.attributes.url, filename }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}
