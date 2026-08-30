export async function onRequest(context) {
  const { request, env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
    });
  }

  try {
    let files = [];
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.files && body.files.length > 0) files = body.files;
      } catch (e) {}
    }

    if (files.length === 0) {
      const listRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/list?directory=%2Fmods`, {
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
      });
      const listData = await listRes.json();
      files = listData.data.filter(i => i.attributes.name.endsWith('.jar')).map(i => i.attributes.name);
    }

    // Comprimir en Minehost
    const compressRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ root: '/mods', files })
    });
    const compressData = await compressRes.json();
    const archiveName = compressData.attributes.name;

    // Obtener enlace del archivo comprimido
    const dlRes = await fetch(
      `${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(archiveName)}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' } }
    );
    const dlData = await dlRes.json();

    return new Response(JSON.stringify({ downloadUrl: dlData.attributes.url, archiveName }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}
