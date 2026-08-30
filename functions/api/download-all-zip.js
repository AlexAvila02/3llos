export async function onRequest(context) {
  const { request, env } = context;
  const PANEL_URL = env.MINEHOST_URL;
  const API_KEY = env.MINEHOST_API_KEY;
  const SERVER_ID = env.MINEHOST_SERVER_ID;

  // Manejar preflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    let filesToCompress = [];

    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.files && Array.isArray(body.files) && body.files.length > 0) {
          filesToCompress = body.files;
        }
      } catch (e) {}
    }

    if (filesToCompress.length === 0) {
      const listRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/list?directory=%2Fmods`, {
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
      });
      const listData = await listRes.json();
      filesToCompress = listData.data
        .filter(item => item.attributes.name.endsWith('.jar'))
        .map(item => item.attributes.name);
    }

    const compressRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/files/compress`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ root: '/mods', files: filesToCompress })
    });

    if (!compressRes.ok) {
      const errText = await compressRes.text();
      return new Response(JSON.stringify({ error: errText }), { 
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const compressData = await compressRes.json();
    const archiveName = compressData.attributes.name;

    const downloadRes = await fetch(
      `${PANEL_URL}/api/client/servers/${SERVER_ID}/files/download?file=%2Fmods%2F${encodeURIComponent(archiveName)}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' } }
    );

    const downloadData = await downloadRes.json();
    return Response.redirect(downloadData.attributes.url, 302);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
