export async function onRequestGet(context) {
  const { env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;
  if (!PANEL_URL || !API_KEY || !SERVER_ID) {
    return new Response(JSON.stringify({ error: "Faltan variables de entorno en Cloudflare" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  try {
    const response = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/list?directory=%2Fmods`, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Error de conexión con Minehost" }), { status: response.status, headers: { "Content-Type": "application/json" } });
    }
    const data = await response.json();
    const mods = data.data
      .filter(item => item.attributes.name.endsWith('.jar'))
      .map(item => ({
        filename: item.attributes.name,
        name: item.attributes.name.replace('.jar', ''),
        size: `${(item.attributes.size / (1024 * 1024)).toFixed(2)} MB`,
        sizeBytes: item.attributes.size,
        updatedAt: item.attributes.modified_at
      }));
    return new Response(JSON.stringify(mods), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
